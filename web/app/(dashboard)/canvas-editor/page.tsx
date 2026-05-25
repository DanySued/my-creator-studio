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
  Loader2,
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

const CANVAS_SIZES = [
  { id: "square",   label: "1:1",  sublabel: "1080 × 1080", w: 1080, h: 1080 },
  { id: "portrait", label: "4:5",  sublabel: "1080 × 1350", w: 1080, h: 1350 },
  { id: "story",    label: "9:16", sublabel: "1080 × 1920", w: 1080, h: 1920 },
] as const;
type SizeId = typeof CANVAS_SIZES[number]["id"];

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

interface TemplateDef {
  id: string;
  name: string;
  description: string;
  bgColor: string;
}

const TEMPLATES: TemplateDef[] = [
  { id: "noir",    name: "Noir",    description: "Dark editorial — gold accents",       bgColor: "#0c0c0c" },
  { id: "sunrise", name: "Sunrise", description: "Bold orange energy poster",           bgColor: "#ff4500" },
  { id: "minimal", name: "Minimal", description: "Swiss-style clean typography",        bgColor: "#ffffff" },
  { id: "aurora",  name: "Aurora",  description: "Moody purple bokeh with bold type",   bgColor: "#0d0021" },
];

// Builds a template onto any Fabric canvas (Canvas or StaticCanvas)
function buildTemplate(id: string, canvas: any, mod: any) {
  canvas.clear();

  const add = (o: any) => canvas.add(o);
  const bg  = (c: string) => canvas.set("backgroundColor", c);

  const R = (o: Record<string, any>) =>
    new mod.Rect({ selectable: true, evented: true, ...o });
  const T = (text: string, o: Record<string, any>) =>
    new mod.IText(text, { selectable: true, evented: true, ...o });
  const L = (pts: number[], o: Record<string, any>) =>
    new mod.Line(pts, { selectable: false, evented: false, ...o });
  const C = (o: Record<string, any>) =>
    new mod.Circle({ selectable: false, evented: false, ...o });

  // ── NOIR ────────────────────────────────────────────────────────────────
  if (id === "noir") {
    bg("#0c0c0c");

    // Right gold sidebar
    add(R({ left: 1015, top: 60, width: 5, height: 960, fill: "#d4af37", selectable: false, evented: false }));
    // Top horizontal rule
    add(L([60, 88, 1000, 88], { stroke: "#d4af37", strokeWidth: 1 }));

    // Small top label
    add(T("CREATOR STUDIO", { left: 60, top: 42, fontFamily: "Arial", fontSize: 18, fill: "#d4af37", charSpacing: 280 }));

    // Big headline
    add(T("CREATE\nYOUR\nSTORY.", {
      left: 60, top: 110,
      fontFamily: "Impact", fontSize: 185, fill: "#ffffff",
      lineHeight: 0.88, charSpacing: -10,
    }));

    // Bottom rule
    add(L([60, 665, 1000, 665], { stroke: "#d4af37", strokeWidth: 1 }));

    // Subtext
    add(T("Turn your vision into reality.", {
      left: 60, top: 690,
      fontFamily: "Georgia", fontSize: 38, fill: "#ffffff", opacity: 0.7, fontStyle: "italic",
    }));

    // Handle
    add(T("@yourbrand", {
      left: 60, top: 970,
      fontFamily: "Arial", fontSize: 24, fill: "#d4af37", charSpacing: 100,
    }));
  }

  // ── SUNRISE ─────────────────────────────────────────────────────────────
  if (id === "sunrise") {
    bg("#ff4500");

    // Lighter circle upper-right
    add(C({ left: 580, top: -280, radius: 580, fill: "#ff7b00", opacity: 0.38 }));
    // Darker circle lower-left
    add(C({ left: -280, top: 660, radius: 460, fill: "#cc2800", opacity: 0.38 }));

    // Top horizontal rule
    add(L([120, 185, 960, 185], { stroke: "#ffffff", strokeWidth: 2, opacity: 0.7 }));

    // Main text
    add(T("GOOD\nVIBES\nONLY", {
      left: 540, top: 210, originX: "center",
      fontFamily: "Impact", fontSize: 192, fill: "#ffffff",
      textAlign: "center", lineHeight: 0.85, charSpacing: -8,
    }));

    // Bottom horizontal rule
    add(L([120, 745, 960, 745], { stroke: "#ffffff", strokeWidth: 2, opacity: 0.7 }));

    // Tagline
    add(T("#POSITIVEVIBES", {
      left: 540, top: 810, originX: "center",
      fontFamily: "Arial", fontSize: 30, fill: "#ffffff",
      charSpacing: 180, opacity: 0.85,
    }));

    // Handle
    add(T("@yourbrand", {
      left: 540, top: 960, originX: "center",
      fontFamily: "Arial", fontSize: 26, fill: "#ffffff", opacity: 0.6,
    }));
  }

  // ── MINIMAL ─────────────────────────────────────────────────────────────
  if (id === "minimal") {
    bg("#ffffff");

    // Left black sidebar
    add(R({ left: 0, top: 0, width: 50, height: 1080, fill: "#111111", selectable: false, evented: false }));

    // Top rule
    add(L([90, 130, 990, 130], { stroke: "#111111", strokeWidth: 2 }));

    // Big serif headline
    add(T("The time\nis now.", {
      left: 90, top: 160,
      fontFamily: "Georgia", fontSize: 110, fill: "#111111",
      lineHeight: 1.1, fontStyle: "italic",
    }));

    // Body copy
    add(T("Don't wait for the perfect\nmoment. Take the moment\nand make it perfect.", {
      left: 90, top: 480,
      fontFamily: "Georgia", fontSize: 44, fill: "#333333",
      lineHeight: 1.45, fontStyle: "italic",
    }));

    // Bottom rule
    add(L([90, 880, 990, 880], { stroke: "#111111", strokeWidth: 2 }));

    // Attribution
    add(T("— ZOEY MORGAN", {
      left: 90, top: 912,
      fontFamily: "Arial", fontSize: 22, fill: "#111111", charSpacing: 220,
    }));

    // Tiny bottom accent
    add(R({ left: 90, top: 970, width: 50, height: 4, fill: "#111111", selectable: false, evented: false }));
  }

  // ── AURORA ──────────────────────────────────────────────────────────────
  if (id === "aurora") {
    bg("#0d0021");

    // Bokeh circles
    add(C({ left: 560, top: -260, radius: 510, fill: "#7c3aed", opacity: 0.22 }));
    add(C({ left: -260, top: 650, radius: 470, fill: "#db2777", opacity: 0.19 }));
    add(C({ left: 620, top: 650, radius: 180, fill: "#3b82f6", opacity: 0.14 }));

    // Tiny accent dots
    add(C({ left: 110, top: 108, radius: 38, fill: "#a78bfa", opacity: 0.55 }));
    add(C({ left: 910, top: 910, radius: 28, fill: "#f472b6", opacity: 0.55 }));

    // Top label
    add(T("DARE TO BE DIFFERENT", {
      left: 540, top: 140, originX: "center",
      fontFamily: "Arial", fontSize: 20, fill: "#c4b5fd",
      charSpacing: 240, opacity: 0.75,
    }));

    // Top thin divider
    add(L([200, 180, 880, 180], { stroke: "#a78bfa", strokeWidth: 1, opacity: 0.4 }));

    // Main headline
    add(T("BE\nBOLD.", {
      left: 540, top: 250, originX: "center",
      fontFamily: "Impact", fontSize: 248, fill: "#ffffff",
      textAlign: "center", lineHeight: 0.82, charSpacing: -8,
    }));

    // Bottom divider
    add(L([200, 740, 880, 740], { stroke: "#a78bfa", strokeWidth: 1, opacity: 0.4 }));

    // Subtext
    add(T("Greatness is a decision.", {
      left: 540, top: 775, originX: "center",
      fontFamily: "Georgia", fontSize: 44, fill: "#e9d5ff",
      fontStyle: "italic",
    }));

    // Handle
    add(T("@yourbrand", {
      left: 540, top: 940, originX: "center",
      fontFamily: "Arial", fontSize: 24, fill: "#a78bfa", charSpacing: 150,
    }));
  }

  canvas.renderAll();
}

// ---------------------------------------------------------------------------

export default function CanvasEditorPage() {
  const canvasEl   = useRef<HTMLCanvasElement>(null);
  const fc         = useRef<any>(null);
  const fabricMod  = useRef<any>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const clickHandlerRef = useRef<((opt: any) => void) | null>(null);

  // Kept in a ref so click handlers always see current values without stale closures
  const propsRef = useRef({ fill: "#6366f1", stroke: "#000000", strokeWidth: 2, fontSize: 36, fontFamily: "Arial" });

  // Canvas dimensions — kept in both state (for JSX) and a ref (for ResizeObserver closure)
  const [sizeId, setSizeId]         = useState<SizeId>("square");
  const [canvW, setCanvW]           = useState(1080);
  const [canvH, setCanvH]           = useState(1080);
  const dimsRef                     = useRef({ w: 1080, h: 1080 });

  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [scale, setScale]           = useState(0.6);
  const [selectedObj, setSelectedObj] = useState<any>(null);
  const [objType, setObjType]         = useState<string>("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [thumbnails, setThumbnails]   = useState<Record<string, string>>({});
  const [thumbsLoading, setThumbsLoading] = useState(false);
  const thumbsGenerated = useRef(false);

  const [fill, setFill]             = useState("#6366f1");
  const [stroke, setStroke]         = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize]     = useState(36);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [bold, setBold]             = useState(false);
  const [italic, setItalic]         = useState(false);
  const [brushSize, setBrushSize]   = useState(8);
  const [brushColor, setBrushColor] = useState("#000000");
  const [bgColor, setBgColor]       = useState("#ffffff");

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

  // Initialize Fabric.js — dynamic import prevents SSR issues
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
      canvas.on("selection:cleared", () => { setSelectedObj(null); setObjType(""); });
      canvas.on("object:added",    () => { if (!skipHistory.current) saveHistory(); });
      canvas.on("object:modified", saveHistory);
      canvas.on("object:removed",  saveHistory);
    });
    return () => { canvas?.dispose(); fc.current = null; };
  }, [saveHistory]);

  // Render actual mini-canvas thumbnails for the gallery
  const generateThumbnails = useCallback(async () => {
    if (thumbsGenerated.current || !fabricMod.current) return;
    thumbsGenerated.current = true;
    setThumbsLoading(true);

    const mod = fabricMod.current;
    const result: Record<string, string> = {};

    for (const tpl of TEMPLATES) {
      const el = document.createElement("canvas");
      // StaticCanvas: no interaction setup, just rendering
      const sc = new mod.StaticCanvas(el, { width: 1080, height: 1080 });
      buildTemplate(tpl.id, sc, mod);
      result[tpl.id] = sc.toDataURL({ format: "jpeg", quality: 0.82, multiplier: 200 / 1080 });
      sc.dispose();
    }

    setThumbnails(result);
    setThumbsLoading(false);
  }, []);

  const openTemplates = () => {
    setShowTemplates(true);
    generateThumbnails();
  };

  const applyTemplate = (templateId: string) => {
    if (!fc.current || !fabricMod.current) return;
    // Templates are designed for 1080×1080 — switch to square first
    changeSize("square");
    buildTemplate(templateId, fc.current, fabricMod.current);
    const tpl = TEMPLATES.find((t) => t.id === templateId);
    if (tpl) setBgColor(tpl.bgColor);
    setSelectedObj(null);
    setObjType("");
    setShowTemplates(false);
    saveHistory();
  };

  const recalcScale = useCallback((w: number, h: number) => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setScale(Math.max(Math.min((width - 48) / w, (height - 48) / h, 1), 0.1));
  }, []);

  const changeSize = useCallback((id: SizeId) => {
    const sz = CANVAS_SIZES.find((s) => s.id === id)!;
    setSizeId(id);
    setCanvW(sz.w);
    setCanvH(sz.h);
    dimsRef.current = { w: sz.w, h: sz.h };
    if (fc.current) {
      fc.current.setDimensions({ width: sz.w, height: sz.h });
      fc.current.renderAll();
    }
    recalcScale(sz.w, sz.h);
  }, [recalcScale]);

  // Reconfigure canvas whenever the active tool changes
  useEffect(() => {
    const canvas = fc.current;
    if (!canvas) return;

    if (clickHandlerRef.current) {
      canvas.off("mouse:down", clickHandlerRef.current);
      clickHandlerRef.current = null;
    }

    canvas.isDrawingMode = activeTool === "draw";
    canvas.selection     = activeTool === "select";
    canvas.defaultCursor = activeTool === "select" ? "default" : "crosshair";
    canvas.hoverCursor   = activeTool === "select" ? "move"    : "crosshair";

    if (activeTool === "draw" && fabricMod.current) {
      const brush = new fabricMod.current.PencilBrush(canvas);
      brush.width = brushSize;
      brush.color = brushColor;
      canvas.freeDrawingBrush = brush;
    }

    if (["text", "rect", "circle", "line"].includes(activeTool)) {
      const handler = (opt: any) => {
        if (opt.target) return;
        const mod = fabricMod.current;
        if (!mod) return;
        const pointer = canvas.getScenePoint(opt.e);
        const p = propsRef.current;
        let obj: any;
        if (activeTool === "text") {
          obj = new mod.IText("Edit me", { left: pointer.x, top: pointer.y, fontSize: p.fontSize, fontFamily: p.fontFamily, fill: p.fill });
        } else if (activeTool === "rect") {
          obj = new mod.Rect({ left: pointer.x - 75, top: pointer.y - 50, width: 150, height: 100, fill: p.fill, stroke: p.stroke, strokeWidth: p.strokeWidth });
        } else if (activeTool === "circle") {
          obj = new mod.Circle({ left: pointer.x - 60, top: pointer.y - 60, radius: 60, fill: p.fill, stroke: p.stroke, strokeWidth: p.strokeWidth });
        } else if (activeTool === "line") {
          obj = new mod.Line([pointer.x, pointer.y, pointer.x + 150, pointer.y], { stroke: p.stroke, strokeWidth: p.strokeWidth });
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

  // Scale canvas to fit container — reads dimsRef so it's always current
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      const { w, h } = dimsRef.current;
      setScale(Math.max(Math.min((width - 48) / w, (height - 48) / h, 1), 0.1));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.metaKey || e.ctrlKey;
      if (ctrl && e.key === "z" && !e.shiftKey)                       { e.preventDefault(); undo(); }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey)))   { e.preventDefault(); redo(); }
      if (e.key === "Escape") setShowTemplates(false);
      if ((e.key === "Delete" || e.key === "Backspace") && !(e.target instanceof HTMLInputElement)) {
        const canvas = fc.current;
        if (!canvas) return;
        const active = canvas.getActiveObjects();
        if (active.length) { canvas.remove(...active); canvas.discardActiveObject(); canvas.renderAll(); }
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
    a.download = `canvas-${canvW}x${canvH}.png`;
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

  const isTextObj  = objType === "i-text" || objType === "textbox";
  const isShapeObj = ["rect", "circle", "triangle", "ellipse"].includes(objType);
  const isLineObj  = objType === "line";
  const fillStr    = typeof fill === "string" && fill.startsWith("#") ? fill : "#6366f1";
  const strokeStr  = stroke.startsWith("#") ? stroke : "#000000";

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
          <div className="flex items-center gap-1.5">
            {/* Canvas size picker */}
            {CANVAS_SIZES.map((sz) => (
              <button
                key={sz.id}
                title={sz.sublabel}
                onClick={() => changeSize(sz.id)}
                className={cn(
                  "flex flex-col items-center justify-center px-2.5 h-7 rounded-md text-xs font-medium transition-colors gap-0",
                  sizeId === sz.id
                    ? "bg-primary/20 text-primary ring-1 ring-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07]"
                )}
              >
                {sz.label}
              </button>
            ))}
            <div className="h-3 w-px bg-border mx-1" />
            <button
              onClick={openTemplates}
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
            <div className="h-3 w-px bg-border mx-1" />
            <span className="text-xs text-muted-foreground font-mono">{canvW} × {canvH}</span>
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
          <div style={{ width: canvW * scale, height: canvH * scale, flexShrink: 0 }}>
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: canvW,
                height: canvH,
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
                <input type="color" value={bgColor} onChange={(e) => updateBg(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-border" />
                <span className="text-xs font-mono text-muted-foreground">{bgColor}</span>
              </div>
            </div>
          )}

          {activeTool === "draw" && (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Brush color</label>
                <input type="color" value={brushColor} onChange={(e) => { setBrushColor(e.target.value); if (fc.current?.freeDrawingBrush) fc.current.freeDrawingBrush.color = e.target.value; }} className="w-8 h-8 rounded cursor-pointer border border-border" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Brush size: {brushSize}px</label>
                <input type="range" min={1} max={80} value={brushSize} onChange={(e) => { setBrushSize(+e.target.value); if (fc.current?.freeDrawingBrush) fc.current.freeDrawingBrush.width = +e.target.value; }} className="w-full accent-primary" />
              </div>
            </>
          )}

          {isTextObj && (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Color</label>
                <input type="color" value={fillStr} onChange={(e) => { setFill(e.target.value); updateProp({ fill: e.target.value }); }} className="w-8 h-8 rounded cursor-pointer border border-border" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Font</label>
                <select value={fontFamily} onChange={(e) => { setFontFamily(e.target.value); updateProp({ fontFamily: e.target.value }); }} className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 text-foreground">
                  {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Size</label>
                <input type="number" value={fontSize} min={8} max={400} onChange={(e) => { setFontSize(+e.target.value); updateProp({ fontSize: +e.target.value }); }} className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 text-foreground" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { const nb = !bold; setBold(nb); updateProp({ fontWeight: nb ? "bold" : "normal" }); }} className={cn("flex-1 h-8 rounded-md text-xs font-bold border transition-colors", bold ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground")}>B</button>
                <button onClick={() => { const ni = !italic; setItalic(ni); updateProp({ fontStyle: ni ? "italic" : "normal" }); }} className={cn("flex-1 h-8 rounded-md text-xs italic border transition-colors", italic ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground")}>I</button>
              </div>
            </>
          )}

          {isShapeObj && (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Fill</label>
                <input type="color" value={fillStr} onChange={(e) => { setFill(e.target.value); updateProp({ fill: e.target.value }); }} className="w-8 h-8 rounded cursor-pointer border border-border" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Stroke</label>
                <input type="color" value={strokeStr} onChange={(e) => { setStroke(e.target.value); updateProp({ stroke: e.target.value }); }} className="w-8 h-8 rounded cursor-pointer border border-border" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Stroke width</label>
                <input type="number" value={strokeWidth} min={0} max={50} onChange={(e) => { setStrokeWidth(+e.target.value); updateProp({ strokeWidth: +e.target.value }); }} className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 text-foreground" />
              </div>
            </>
          )}

          {isLineObj && (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Color</label>
                <input type="color" value={strokeStr} onChange={(e) => { setStroke(e.target.value); updateProp({ stroke: e.target.value }); }} className="w-8 h-8 rounded cursor-pointer border border-border" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Width</label>
                <input type="number" value={strokeWidth} min={1} max={50} onChange={(e) => { setStrokeWidth(+e.target.value); updateProp({ strokeWidth: +e.target.value }); }} className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 text-foreground" />
              </div>
            </>
          )}

          {selectedObj && (
            <button
              onClick={() => {
                const canvas = fc.current;
                if (!canvas) return;
                const obj = canvas.getActiveObject();
                if (obj) { canvas.remove(obj); canvas.discardActiveObject(); canvas.renderAll(); setSelectedObj(null); setObjType(""); }
              }}
              className="w-full flex items-center justify-center gap-1.5 h-8 rounded-md text-xs text-red-400 hover:bg-red-500/[0.07] border border-red-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete object
            </button>
          )}

          {!selectedObj && activeTool === "select" && (
            <p className="text-xs text-muted-foreground text-center pt-4">Select an object to edit its properties</p>
          )}
          {["text", "rect", "circle", "line"].includes(activeTool) && (
            <p className="text-xs text-muted-foreground text-center pt-4">Click on the canvas to place</p>
          )}
        </div>
      </aside>

      {/* ── Template gallery overlay ────────────────────────────────────── */}
      {showTemplates && (
        <>
          <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm" onClick={() => setShowTemplates(false)} />

          <div className="absolute left-14 top-0 bottom-0 z-30 w-72 border-r border-border bg-background shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
              <span className="text-sm font-medium">Templates</span>
              <button onClick={() => setShowTemplates(false)} className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Select a template to load it onto the canvas.
              </p>

              {thumbsLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rendering previews…
                </div>
              )}

              {!thumbsLoading && TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl.id)}
                  className="w-full text-left group rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  {/* Actual rendered thumbnail — aspect-square so square renders don't crop */}
                  <div className="relative w-full aspect-square bg-zinc-900 overflow-hidden">
                    {thumbnails[tpl.id] ? (
                      <img
                        src={thumbnails[tpl.id]}
                        alt={tpl.name}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
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
