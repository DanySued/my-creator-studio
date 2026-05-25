"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  MousePointer2,
  Type,
  Square,
  Circle as CircleIcon,
  Minus,
  Pen,
  ImagePlus,
  Download,
  Trash2,
  RotateCcw,
  RotateCw,
  LayoutTemplate,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "select" | "text" | "rect" | "circle" | "line" | "draw";

const TOOLS: { id: Tool; icon: React.ElementType; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "text", icon: Type, label: "Text" },
  { id: "rect", icon: Square, label: "Rectangle" },
  { id: "circle", icon: CircleIcon, label: "Circle" },
  { id: "line", icon: Minus, label: "Line" },
  { id: "draw", icon: Pen, label: "Draw" },
];

const FONTS = ["Arial", "Georgia", "Times New Roman", "Courier New", "Verdana", "Impact"];

// ---------------------------------------------------------------------------
// Template definitions
// Each template is applied by calling buildTemplate(id, canvas, fabricModule)
// ---------------------------------------------------------------------------

interface TemplateDef {
  id: string;
  name: string;
  description: string;
  preview: string; // CSS background for the thumbnail card
  bgColor: string;
}

const TEMPLATES: TemplateDef[] = [
  {
    id: "ember",
    name: "Ember",
    description: "Dark luxury quote card",
    preview: "linear-gradient(135deg, #0d0008 0%, #1a0533 55%, #ff6b35 140%)",
    bgColor: "#0d0008",
  },
  {
    id: "fresh",
    name: "Fresh Start",
    description: "Bold announcement, clean & modern",
    preview: "linear-gradient(180deg, #00b894 0%, #00b894 45%, #f8fffe 45%)",
    bgColor: "#f8fffe",
  },
  {
    id: "neon",
    name: "Neon Night",
    description: "High-impact editorial poster",
    preview: "linear-gradient(135deg, #000000 0%, #001514 100%)",
    bgColor: "#000000",
  },
  {
    id: "golden",
    name: "Golden Hour",
    description: "Elegant serif quote in warm cream",
    preview: "radial-gradient(ellipse at 60% 40%, #fdf6e3 0%, #f0ddb0 100%)",
    bgColor: "#fdf6e3",
  },
];

function buildTemplate(id: string, canvas: any, mod: any) {
  canvas.clear();

  const add = (obj: any) => canvas.add(obj);
  const bg = (color: string) => canvas.set("backgroundColor", color);

  const rect = (opts: Record<string, any>) =>
    new mod.Rect({ selectable: true, ...opts });

  const itext = (text: string, opts: Record<string, any>) =>
    new mod.IText(text, { selectable: true, ...opts });

  const line = (coords: number[], opts: Record<string, any>) =>
    new mod.Line(coords, { selectable: false, evented: false, ...opts });

  const circle = (opts: Record<string, any>) =>
    new mod.Circle({ selectable: false, evented: false, ...opts });

  // ── Ember ─────────────────────────────────────────────────────────────────
  if (id === "ember") {
    bg("#0d0008");

    // Subtle bottom glow
    add(rect({ left: 0, top: 580, width: 1080, height: 500, fill: "#ff6b35", opacity: 0.07, selectable: false, evented: false }));

    // Left & right border bars
    add(rect({ left: 58, top: 100, width: 5, height: 880, fill: "#ff6b35", selectable: false, evented: false }));
    add(rect({ left: 1017, top: 100, width: 5, height: 880, fill: "#ff6b35", selectable: false, evented: false }));

    // Top label
    add(itext("DAILY MOTIVATION", {
      left: 540, top: 148, originX: "center",
      fontFamily: "Arial", fontSize: 22, fill: "#ff6b35",
      charSpacing: 300, opacity: 0.8,
    }));

    // Top divider
    add(line([90, 200, 990, 200], { stroke: "#ff6b35", strokeWidth: 1, opacity: 0.6 }));

    // Main quote
    add(itext("“The secret of getting ahead\nis getting started.”", {
      left: 540, top: 280, originX: "center",
      fontFamily: "Georgia", fontSize: 72, fill: "#ffffff",
      textAlign: "center", lineHeight: 1.35,
    }));

    // Attribution
    add(itext("— Mark Twain", {
      left: 540, top: 610, originX: "center",
      fontFamily: "Georgia", fontSize: 40, fill: "#ff6b35",
      fontStyle: "italic",
    }));

    // Bottom divider
    add(line([90, 710, 990, 710], { stroke: "#ff6b35", strokeWidth: 1, opacity: 0.6 }));

    // Small accent rect + brand
    add(rect({ left: 90, top: 840, width: 6, height: 60, fill: "#ff6b35", selectable: false, evented: false }));
    add(itext("YOUR BRAND", {
      left: 116, top: 853,
      fontFamily: "Arial", fontSize: 22, fill: "#ffffff", opacity: 0.35, charSpacing: 250,
    }));
  }

  // ── Fresh Start ────────────────────────────────────────────────────────────
  if (id === "fresh") {
    bg("#f8fffe");

    // Top emerald band
    add(rect({ left: 0, top: 0, width: 1080, height: 450, fill: "#00b894", selectable: false, evented: false }));

    // Decorative circle (overlapping band edge)
    add(circle({ left: 340, top: 300, radius: 160, fill: "#ffffff", opacity: 0.06 }));
    add(circle({ left: 600, top: 380, radius: 90, fill: "#ffffff", opacity: 0.06 }));

    // Headline in the band
    add(itext("BIG NEWS\nIS COMING.", {
      left: 540, top: 80, originX: "center",
      fontFamily: "Impact", fontSize: 140, fill: "#ffffff",
      textAlign: "center", lineHeight: 0.92, charSpacing: -20,
    }));

    // Thin white separator at band edge
    add(line([80, 450, 1000, 450], { stroke: "#00b894", strokeWidth: 3 }));

    // Subtitle
    add(itext("Stay tuned for something amazing.", {
      left: 540, top: 520, originX: "center",
      fontFamily: "Georgia", fontSize: 46, fill: "#2d3436",
      fontStyle: "italic", textAlign: "center",
    }));

    // CTA label
    add(itext("FOLLOW US FOR UPDATES", {
      left: 540, top: 680, originX: "center",
      fontFamily: "Arial", fontSize: 24, fill: "#00b894",
      charSpacing: 180,
    }));

    // Thin accent line under CTA
    add(line([380, 730, 700, 730], { stroke: "#00b894", strokeWidth: 2, opacity: 0.5 }));

    // Brand handle
    add(itext("@yourbrand", {
      left: 540, top: 860, originX: "center",
      fontFamily: "Arial", fontSize: 32, fill: "#636e72",
    }));

    // Bottom thin bar
    add(rect({ left: 0, top: 1060, width: 1080, height: 20, fill: "#00b894", selectable: false, evented: false }));
  }

  // ── Neon Night ─────────────────────────────────────────────────────────────
  if (id === "neon") {
    bg("#000000");

    // Subtle left column wash
    add(rect({ left: 0, top: 0, width: 160, height: 1080, fill: "#00fff5", opacity: 0.04, selectable: false, evented: false }));

    // Top horizontal lines (double)
    add(line([80, 255, 1000, 255], { stroke: "#00fff5", strokeWidth: 1, opacity: 0.5 }));
    add(line([80, 261, 1000, 261], { stroke: "#00fff5", strokeWidth: 0.5, opacity: 0.25 }));

    // Star accent
    add(itext("✶", {
      left: 80, top: 160,
      fontFamily: "Arial", fontSize: 60, fill: "#00fff5", opacity: 0.9,
    }));

    // Big editorial headline (left-aligned, intentionally crops right)
    add(itext("MAKE\nIT\nHAPPEN.", {
      left: 80, top: 280,
      fontFamily: "Impact", fontSize: 196, fill: "#ffffff",
      lineHeight: 0.88, charSpacing: -10,
    }));

    // Right accent bar
    add(rect({ left: 990, top: 260, width: 5, height: 650, fill: "#00fff5", selectable: false, evented: false }));

    // Bottom horizontal lines
    add(line([80, 940, 1000, 940], { stroke: "#00fff5", strokeWidth: 1, opacity: 0.5 }));
    add(line([80, 946, 1000, 946], { stroke: "#00fff5", strokeWidth: 0.5, opacity: 0.25 }));

    // Bottom label
    add(itext("CREATE · INSPIRE · GROW", {
      left: 540, top: 970, originX: "center",
      fontFamily: "Arial", fontSize: 20, fill: "#00fff5",
      charSpacing: 220, opacity: 0.75,
    }));
  }

  // ── Golden Hour ────────────────────────────────────────────────────────────
  if (id === "golden") {
    bg("#fdf6e3");

    // Top & bottom gold bars
    add(rect({ left: 0, top: 0, width: 1080, height: 10, fill: "#b8860b", selectable: false, evented: false }));
    add(rect({ left: 0, top: 1070, width: 1080, height: 10, fill: "#b8860b", selectable: false, evented: false }));

    // Left & right thin bars
    add(rect({ left: 60, top: 0, width: 2, height: 1080, fill: "#b8860b", opacity: 0.35, selectable: false, evented: false }));
    add(rect({ left: 1018, top: 0, width: 2, height: 1080, fill: "#b8860b", opacity: 0.35, selectable: false, evented: false }));

    // Flourish top
    add(itext("— ✿ —", {
      left: 540, top: 110, originX: "center",
      fontFamily: "Georgia", fontSize: 40, fill: "#b8860b",
    }));

    // Top label
    add(itext("A MOMENT TO REMEMBER", {
      left: 540, top: 190, originX: "center",
      fontFamily: "Arial", fontSize: 20, fill: "#b8860b",
      charSpacing: 240,
    }));

    // Horizontal divider
    add(line([200, 248, 880, 248], { stroke: "#b8860b", strokeWidth: 1, opacity: 0.5 }));

    // Main quote
    add(itext("“Life is not measured by the\nnumber of breaths you take,\nbut by the moments that take\nyour breath away.”", {
      left: 540, top: 290, originX: "center",
      fontFamily: "Georgia", fontSize: 58, fill: "#4a3728",
      textAlign: "center", lineHeight: 1.42, fontStyle: "italic",
    }));

    // Bottom divider
    add(line([200, 790, 880, 790], { stroke: "#b8860b", strokeWidth: 1, opacity: 0.5 }));

    // Attribution
    add(itext("— Maya Angelou", {
      left: 540, top: 820, originX: "center",
      fontFamily: "Georgia", fontSize: 32, fill: "#b8860b",
    }));

    // Flourish bottom
    add(itext("— ✿ —", {
      left: 540, top: 920, originX: "center",
      fontFamily: "Georgia", fontSize: 32, fill: "#b8860b", opacity: 0.6,
    }));
  }

  canvas.renderAll();
}

// ---------------------------------------------------------------------------

export default function CanvasEditorPage() {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const fc = useRef<any>(null);
  const fabricMod = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const clickHandlerRef = useRef<((opt: any) => void) | null>(null);

  // Kept in a ref so click handlers always see current values without stale closures
  const propsRef = useRef({ fill: "#6366f1", stroke: "#000000", strokeWidth: 2, fontSize: 36, fontFamily: "Arial" });

  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [scale, setScale] = useState(0.6);
  const [selectedObj, setSelectedObj] = useState<any>(null);
  const [objType, setObjType] = useState<string>("");
  const [showTemplates, setShowTemplates] = useState(false);

  const [fill, setFill] = useState("#6366f1");
  const [stroke, setStroke] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(36);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [brushSize, setBrushSize] = useState(8);
  const [brushColor, setBrushColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");

  const history = useRef<string[]>([]);
  const histIdx = useRef(-1);
  const skipHistory = useRef(false);

  useEffect(() => {
    propsRef.current = { fill, stroke, strokeWidth, fontSize, fontFamily };
  }, [fill, stroke, strokeWidth, fontSize, fontFamily]);

  const saveHistory = useCallback(() => {
    if (!fc.current) return;
    const json = JSON.stringify(fc.current.toJSON());
    history.current = history.current.slice(0, histIdx.current + 1);
    history.current.push(json);
    histIdx.current = history.current.length - 1;
  }, []);

  const handleSelect = (e: any) => {
    const obj = e.selected?.[0];
    if (!obj) return;
    setSelectedObj(obj);
    const type: string = obj.type;
    setObjType(type);
    if (type === "i-text" || type === "textbox") {
      setFontSize(obj.fontSize ?? 36);
      setFontFamily(obj.fontFamily ?? "Arial");
      setFill(typeof obj.fill === "string" ? obj.fill : "#000000");
      setBold(obj.fontWeight === "bold");
      setItalic(obj.fontStyle === "italic");
    } else if (["rect", "circle", "triangle", "ellipse"].includes(type)) {
      setFill(typeof obj.fill === "string" ? obj.fill : "#6366f1");
      setStroke(obj.stroke ?? "#000000");
      setStrokeWidth(obj.strokeWidth ?? 2);
    } else if (type === "line") {
      setStroke(obj.stroke ?? "#000000");
      setStrokeWidth(obj.strokeWidth ?? 2);
    }
  };

  // Initialize Fabric.js via dynamic import to avoid SSR
  useEffect(() => {
    let canvas: any;
    import("fabric").then((mod) => {
      fabricMod.current = mod;
      canvas = new mod.Canvas(canvasEl.current!, {
        width: 1080,
        height: 1080,
        backgroundColor: "#ffffff",
      });
      fc.current = canvas;
      saveHistory();

      canvas.on("selection:created", handleSelect);
      canvas.on("selection:updated", handleSelect);
      canvas.on("selection:cleared", () => {
        setSelectedObj(null);
        setObjType("");
      });
      canvas.on("object:added", () => {
        if (!skipHistory.current) saveHistory();
      });
      canvas.on("object:modified", saveHistory);
      canvas.on("object:removed", saveHistory);
    });
    return () => {
      canvas?.dispose();
      fc.current = null;
    };
  }, [saveHistory]);

  const applyTemplate = (templateId: string) => {
    if (!fc.current || !fabricMod.current) return;
    buildTemplate(templateId, fc.current, fabricMod.current);
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (tpl) setBgColor(tpl.bgColor);
    setSelectedObj(null);
    setObjType("");
    setShowTemplates(false);
    saveHistory();
  };

  // Reconfigure canvas whenever the active tool changes
  useEffect(() => {
    const canvas = fc.current;
    if (!canvas) return;

    if (clickHandlerRef.current) {
      canvas.off("mouse:down", clickHandlerRef.current);
      clickHandlerRef.current = null;
    }

    canvas.isDrawingMode = activeTool === "draw";
    canvas.selection = activeTool === "select";
    canvas.defaultCursor = activeTool === "select" ? "default" : "crosshair";
    canvas.hoverCursor = activeTool === "select" ? "move" : "crosshair";

    if (activeTool === "draw" && fabricMod.current) {
      const brush = new fabricMod.current.PencilBrush(canvas);
      brush.width = brushSize;
      brush.color = brushColor;
      canvas.freeDrawingBrush = brush;
    }

    if (["text", "rect", "circle", "line"].includes(activeTool)) {
      const handler = (opt: any) => {
        if (opt.target) return; // ignore clicks on existing objects
        const mod = fabricMod.current;
        if (!mod) return;
        const pointer = canvas.getScenePoint(opt.e);
        const p = propsRef.current;
        let obj: any;
        if (activeTool === "text") {
          obj = new mod.IText("Edit me", {
            left: pointer.x,
            top: pointer.y,
            fontSize: p.fontSize,
            fontFamily: p.fontFamily,
            fill: p.fill,
          });
        } else if (activeTool === "rect") {
          obj = new mod.Rect({
            left: pointer.x - 75,
            top: pointer.y - 50,
            width: 150,
            height: 100,
            fill: p.fill,
            stroke: p.stroke,
            strokeWidth: p.strokeWidth,
          });
        } else if (activeTool === "circle") {
          obj = new mod.Circle({
            left: pointer.x - 60,
            top: pointer.y - 60,
            radius: 60,
            fill: p.fill,
            stroke: p.stroke,
            strokeWidth: p.strokeWidth,
          });
        } else if (activeTool === "line") {
          obj = new mod.Line([pointer.x, pointer.y, pointer.x + 150, pointer.y], {
            stroke: p.stroke,
            strokeWidth: p.strokeWidth,
          });
        }
        if (obj) {
          canvas.add(obj);
          canvas.setActiveObject(obj);
          canvas.renderAll();
          setActiveTool("select");
        }
      };
      clickHandlerRef.current = handler;
      canvas.on("mouse:down", handler);
    }

    canvas.renderAll();
  }, [activeTool]);

  // Scale canvas to fit container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const s = Math.min((width - 48) / 1080, (height - 48) / 1080, 1);
      setScale(Math.max(s, 0.1));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keyboard shortcuts: undo, redo, delete
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.metaKey || e.ctrlKey;
      if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.key === "Escape") setShowTemplates(false);
      if ((e.key === "Delete" || e.key === "Backspace") && !(e.target instanceof HTMLInputElement)) {
        const canvas = fc.current;
        if (!canvas) return;
        const active = canvas.getActiveObjects();
        if (active.length) {
          canvas.remove(...active);
          canvas.discardActiveObject();
          canvas.renderAll();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const undo = () => {
    if (histIdx.current <= 0 || !fc.current) return;
    histIdx.current--;
    skipHistory.current = true;
    fc.current.loadFromJSON(history.current[histIdx.current]).then(() => {
      fc.current?.renderAll();
      skipHistory.current = false;
    });
  };

  const redo = () => {
    if (histIdx.current >= history.current.length - 1 || !fc.current) return;
    histIdx.current++;
    skipHistory.current = true;
    fc.current.loadFromJSON(history.current[histIdx.current]).then(() => {
      fc.current?.renderAll();
      skipHistory.current = false;
    });
  };

  const handleExport = () => {
    const canvas = fc.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: "png", multiplier: 1 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "canvas-1080x1080.png";
    a.click();
  };

  const handleClear = () => {
    const canvas = fc.current;
    if (!canvas) return;
    canvas.clear();
    canvas.set("backgroundColor", bgColor);
    canvas.renderAll();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      fabricMod.current?.FabricImage.fromURL(url).then((img: any) => {
        img.scaleToWidth(400);
        img.set({ left: 340, top: 340 });
        fc.current?.add(img);
        fc.current?.setActiveObject(img);
        fc.current?.renderAll();
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const updateProp = (props: Record<string, any>) => {
    const obj = fc.current?.getActiveObject();
    if (!obj) return;
    obj.set(props);
    fc.current?.renderAll();
  };

  const updateBg = (color: string) => {
    setBgColor(color);
    if (!fc.current) return;
    fc.current.set("backgroundColor", color);
    fc.current.renderAll();
  };

  const isTextObj = objType === "i-text" || objType === "textbox";
  const isShapeObj = ["rect", "circle", "triangle", "ellipse"].includes(objType);
  const isLineObj = objType === "line";
  const fillStr = typeof fill === "string" && fill.startsWith("#") ? fill : "#6366f1";
  const strokeStr = stroke.startsWith("#") ? stroke : "#000000";

  return (
    <div className="flex h-full relative">
      {/* ── Tool sidebar ───────────────────────────────────────────────── */}
      <aside className="w-14 shrink-0 border-r border-border flex flex-col items-center py-3 gap-1 bg-background z-10">
        {TOOLS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            title={label}
            onClick={() => setActiveTool(id)}
            className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
              activeTool === id
                ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07]"
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}

        <div className="h-px w-6 bg-border my-1" />

        <button
          title="Upload image"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors"
        >
          <ImagePlus className="w-4 h-4" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        <div className="mt-auto flex flex-col gap-1">
          <button title="Undo (Ctrl+Z)" onClick={undo} className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button title="Redo (Ctrl+Y)" onClick={redo} className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors">
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* ── Canvas area ────────────────────────────────────────────────── */}
      <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden bg-zinc-950/50">
        {/* Toolbar */}
        <div className="shrink-0 flex items-center justify-between px-4 h-11 border-b border-border bg-background/80">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono">1080 × 1080 px</span>
            <div className="h-3 w-px bg-border" />
            <button
              onClick={() => setShowTemplates((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-3 h-7 rounded-md text-xs transition-colors",
                showTemplates
                  ? "bg-primary/20 text-primary ring-1 ring-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07]"
              )}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              Templates
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.07] transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 h-7 rounded-md text-xs bg-primary/15 text-primary ring-1 ring-primary/20 hover:bg-primary/25 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export PNG
            </button>
          </div>
        </div>

        {/* Canvas viewport */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-6">
          <div style={{ width: 1080 * scale, height: 1080 * scale, flexShrink: 0 }}>
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: 1080,
                height: 1080,
                boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 8px 48px rgba(0,0,0,0.6)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <canvas ref={canvasEl} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Properties panel ───────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 border-l border-border overflow-y-auto bg-background">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Properties</p>
        </div>
        <div className="p-3 space-y-4">

          {!selectedObj && activeTool !== "draw" && (
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Background</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={bgColor}
                  onChange={(e) => updateBg(e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer border border-border"
                />
                <span className="text-xs font-mono text-muted-foreground">{bgColor}</span>
              </div>
            </div>
          )}

          {activeTool === "draw" && (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Brush color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => {
                      setBrushColor(e.target.value);
                      if (fc.current?.freeDrawingBrush) fc.current.freeDrawingBrush.color = e.target.value;
                    }}
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Brush size: {brushSize}px</label>
                <input
                  type="range"
                  min={1}
                  max={80}
                  value={brushSize}
                  onChange={(e) => {
                    setBrushSize(+e.target.value);
                    if (fc.current?.freeDrawingBrush) fc.current.freeDrawingBrush.width = +e.target.value;
                  }}
                  className="w-full accent-primary"
                />
              </div>
            </>
          )}

          {isTextObj && (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fillStr}
                    onChange={(e) => { setFill(e.target.value); updateProp({ fill: e.target.value }); }}
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Font</label>
                <select
                  value={fontFamily}
                  onChange={(e) => { setFontFamily(e.target.value); updateProp({ fontFamily: e.target.value }); }}
                  className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 text-foreground"
                >
                  {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Size</label>
                <input
                  type="number"
                  value={fontSize}
                  min={8}
                  max={400}
                  onChange={(e) => { setFontSize(+e.target.value); updateProp({ fontSize: +e.target.value }); }}
                  className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 text-foreground"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { const nb = !bold; setBold(nb); updateProp({ fontWeight: nb ? "bold" : "normal" }); }}
                  className={cn("flex-1 h-8 rounded-md text-xs font-bold border transition-colors", bold ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground")}
                >B</button>
                <button
                  onClick={() => { const ni = !italic; setItalic(ni); updateProp({ fontStyle: ni ? "italic" : "normal" }); }}
                  className={cn("flex-1 h-8 rounded-md text-xs italic border transition-colors", italic ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground")}
                >I</button>
              </div>
            </>
          )}

          {isShapeObj && (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Fill</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={fillStr}
                    onChange={(e) => { setFill(e.target.value); updateProp({ fill: e.target.value }); }}
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Stroke</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={strokeStr}
                    onChange={(e) => { setStroke(e.target.value); updateProp({ stroke: e.target.value }); }}
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Stroke width</label>
                <input
                  type="number"
                  value={strokeWidth}
                  min={0}
                  max={50}
                  onChange={(e) => { setStrokeWidth(+e.target.value); updateProp({ strokeWidth: +e.target.value }); }}
                  className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 text-foreground"
                />
              </div>
            </>
          )}

          {isLineObj && (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={strokeStr}
                    onChange={(e) => { setStroke(e.target.value); updateProp({ stroke: e.target.value }); }}
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Width</label>
                <input
                  type="number"
                  value={strokeWidth}
                  min={1}
                  max={50}
                  onChange={(e) => { setStrokeWidth(+e.target.value); updateProp({ strokeWidth: +e.target.value }); }}
                  className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 text-foreground"
                />
              </div>
            </>
          )}

          {selectedObj && (
            <button
              onClick={() => {
                const canvas = fc.current;
                if (!canvas) return;
                const obj = canvas.getActiveObject();
                if (obj) {
                  canvas.remove(obj);
                  canvas.discardActiveObject();
                  canvas.renderAll();
                  setSelectedObj(null);
                  setObjType("");
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md text-xs text-red-400 hover:bg-red-500/[0.07] border border-red-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete object
            </button>
          )}

          {!selectedObj && activeTool === "select" && (
            <p className="text-xs text-muted-foreground text-center pt-4">
              Select an object to edit its properties
            </p>
          )}

          {["text", "rect", "circle", "line"].includes(activeTool) && (
            <p className="text-xs text-muted-foreground text-center pt-4">
              Click on the canvas to place
            </p>
          )}
        </div>
      </aside>

      {/* ── Template gallery overlay ────────────────────────────────────── */}
      {showTemplates && (
        <>
          {/* Backdrop */}
          <div
            className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm"
            onClick={() => setShowTemplates(false)}
          />

          {/* Panel */}
          <div className="absolute left-14 top-0 bottom-0 z-30 w-80 border-r border-border bg-background shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
              <span className="text-sm font-medium">Templates</span>
              <button
                onClick={() => setShowTemplates(false)}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <p className="text-xs text-muted-foreground mb-4">
                Click a template to load it. All current canvas content will be replaced.
              </p>

              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl.id)}
                  className="w-full text-left group rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {/* Thumbnail */}
                  <div
                    className="h-36 w-full transition-transform duration-300 group-hover:scale-[1.02]"
                    style={{ background: tpl.preview }}
                  />
                  {/* Info */}
                  <div className="px-3 py-2.5 bg-card border-t border-border">
                    <p className="text-sm font-medium text-foreground">{tpl.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
