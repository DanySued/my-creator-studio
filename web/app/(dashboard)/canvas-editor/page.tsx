"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MousePointer2, Type, Square, Circle as CircleIcon, Minus, Pen,
  ImagePlus, Download, Trash2, RotateCcw, RotateCw,
  LayoutTemplate, X, Loader2, Plus, Copy, Sparkles,
  AlignLeft, AlignCenter, AlignRight, BringToFront, SendToBack,
  Smartphone, ChevronLeft, ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Tool = "select" | "text" | "rect" | "circle" | "line" | "draw";

interface SlideState {
  id: string;
  json: string | null;   // Fabric.js canvas JSON snapshot
  thumbnail: string;     // small JPEG data URL for the strip
  label: string;         // "01", "02", …
}

interface SlideData {
  title?: string;
  body?: string;
  slideNumber?: string;
}

const TOOLS: { id: Tool; icon: React.ElementType; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "text",   icon: Type,          label: "Text" },
  { id: "rect",   icon: Square,        label: "Rectangle" },
  { id: "circle", icon: CircleIcon,    label: "Circle" },
  { id: "line",   icon: Minus,         label: "Line" },
  { id: "draw",   icon: Pen,           label: "Draw" },
];

const FONTS = ["Arial", "Georgia", "Times New Roman", "Courier New", "Verdana", "Impact"];

const CANVAS_SIZES = [
  { id: "square",   label: "1:1",  sublabel: "1080 × 1080", w: 1080, h: 1080 },
  { id: "portrait", label: "4:5",  sublabel: "1080 × 1350", w: 1080, h: 1350 },
  { id: "story",    label: "9:16", sublabel: "1080 × 1920", w: 1080, h: 1920 },
] as const;
type SizeId = typeof CANVAS_SIZES[number]["id"];

const TONES = [
  { id: "inspirational", label: "Inspirational" },
  { id: "professional",  label: "Professional" },
  { id: "casual",        label: "Casual" },
  { id: "bold",          label: "Bold" },
  { id: "educational",   label: "Educational" },
];

const uid = () => Math.random().toString(36).slice(2, 10);
const pad = (n: number) => String(n).padStart(2, "0");

// ─────────────────────────────────────────────────────────────────────────────
// Templates
// ─────────────────────────────────────────────────────────────────────────────

interface TemplateDef { id: string; name: string; description: string; bgColor: string; }

const TEMPLATES: TemplateDef[] = [
  { id: "noir",     name: "Noir",     description: "Dark editorial — gold accents",      bgColor: "#0c0c0c" },
  { id: "sunrise",  name: "Sunrise",  description: "Bold orange energy poster",          bgColor: "#ff4500" },
  { id: "minimal",  name: "Minimal",  description: "Swiss-style clean typography",       bgColor: "#ffffff" },
  { id: "aurora",   name: "Aurora",   description: "Moody purple bokeh with bold type",  bgColor: "#0d0021" },
  { id: "gradient", name: "Gradient", description: "Deep navy-to-violet night sky",      bgColor: "#0a0a1a" },
  { id: "studio",   name: "Studio",   description: "Charcoal magazine editorial style",  bgColor: "#141414" },
  { id: "pastel",    name: "Pastel",    description: "Warm cream — Instagram-ready soft",  bgColor: "#fff8f5" },
  { id: "panoramic", name: "Panoramic", description: "Bleeding orb — swipe to reveal more", bgColor: "#06080f" },
  { id: "editorial", name: "Editorial", description: "Bold magazine — numbered slide style", bgColor: "#f4f0eb" },
];

const COLOR_SWATCHES = [
  "#000000","#ffffff","#ef4444","#f97316","#eab308",
  "#22c55e","#3b82f6","#8b5cf6","#ec4899","#6366f1",
  "#d4af37","#ff4500","#0d0021","#0c0c0c","#141414",
];

/**
 * Builds a template onto any Fabric canvas (Canvas or StaticCanvas).
 * All y-positions scale with `ys = h/1080` so templates render correctly
 * across Square (1080), Portrait (1350), and Story (1920) canvas heights.
 * When slideData is supplied the dynamic title/body replace the hardcoded
 * decorative text so every AI-generated slide shares the same design language.
 */
function buildTemplate(id: string, canvas: any, mod: any, slideData?: SlideData) {
  canvas.clear();

  const w: number = canvas.width;
  const h: number = canvas.height;
  const ys = h / 1080;  // vertical scale: 1.0 for square, 1.25 portrait, 1.78 story

  const lm  = 60;                    // left margin (px, fixed — width is always 1080)
  const rm  = 1000;                  // right margin
  const cx  = Math.round(w / 2);    // center x
  const bY  = Math.round(h * 0.9);  // brand bottom y

  const add = (o: any) => canvas.add(o);
  const bg  = (c: string) => canvas.set("backgroundColor", c);

  const R  = (o: Record<string, any>) => new mod.Rect({ selectable: true, evented: true, ...o });
  const T  = (text: string, o: Record<string, any>) => new mod.IText(text, { selectable: true, evented: true, ...o });
  const TB = (text: string, o: Record<string, any>) => new mod.Textbox(text, { selectable: true, evented: true, ...o });
  const L  = (x1: number, y1: number, x2: number, y2: number, o: Record<string, any>) =>
    new mod.Line([x1, y1, x2, y2], { selectable: false, evented: false, ...o });
  const C  = (o: Record<string, any>) => new mod.Circle({ selectable: false, evented: false, ...o });
  const y  = (v: number) => Math.round(v * ys);  // scale a y value

  const isDynamic = !!slideData;
  const titleText = slideData?.title ?? "";
  const bodyText  = slideData?.body  ?? "";
  const numLabel  = slideData?.slideNumber ?? "";

  // ── NOIR ──────────────────────────────────────────────────────────────────
  if (id === "noir") {
    bg("#0c0c0c");
    add(R({ left: 1015, top: y(60), width: 5, height: y(960), fill: "#d4af37", selectable: false, evented: false }));
    add(L(lm, y(88), rm, y(88), { stroke: "#d4af37", strokeWidth: 1 }));
    add(T("CREATOR STUDIO", { left: lm, top: y(42), fontFamily: "Arial", fontSize: 18, fill: "#d4af37", charSpacing: 280 }));

    if (isDynamic) {
      add(TB(titleText, { left: lm, top: y(110), width: rm - lm, fontFamily: "Impact", fontSize: 110, fill: "#ffffff", lineHeight: 0.95 }));
      add(L(lm, y(640), rm, y(640), { stroke: "#d4af37", strokeWidth: 1 }));
      add(TB(bodyText, { left: lm, top: y(666), width: rm - lm, fontFamily: "Georgia", fontSize: 36, fill: "#ffffff", opacity: 0.72, fontStyle: "italic" }));
    } else {
      add(T("CREATE\nYOUR\nSTORY.", { left: lm, top: y(110), fontFamily: "Impact", fontSize: 185, fill: "#ffffff", lineHeight: 0.88, charSpacing: -10 }));
      add(L(lm, y(665), rm, y(665), { stroke: "#d4af37", strokeWidth: 1 }));
      add(T("Turn your vision into reality.", { left: lm, top: y(690), fontFamily: "Georgia", fontSize: 38, fill: "#ffffff", opacity: 0.7, fontStyle: "italic" }));
    }

    add(T("@yourbrand", { left: lm, top: bY, fontFamily: "Arial", fontSize: 24, fill: "#d4af37", charSpacing: 100 }));
    if (numLabel) add(T(numLabel, { left: 970, top: y(42), fontFamily: "Arial", fontSize: 18, fill: "#d4af37", opacity: 0.6 }));
  }

  // ── SUNRISE ────────────────────────────────────────────────────────────────
  if (id === "sunrise") {
    bg("#ff4500");
    add(C({ left: 580, top: y(-280), radius: 580, fill: "#ff7b00", opacity: 0.38 }));
    add(C({ left: -280, top: y(660), radius: 460, fill: "#cc2800", opacity: 0.38 }));
    add(L(120, y(185), 960, y(185), { stroke: "#ffffff", strokeWidth: 2, opacity: 0.7 }));

    if (isDynamic) {
      add(TB(titleText, { left: cx, top: y(210), width: 840, originX: "center", fontFamily: "Impact", fontSize: 130, fill: "#ffffff", textAlign: "center", lineHeight: 0.9 }));
      add(L(120, y(700), 960, y(700), { stroke: "#ffffff", strokeWidth: 2, opacity: 0.7 }));
      add(TB(bodyText, { left: cx, top: y(730), width: 840, originX: "center", fontFamily: "Arial", fontSize: 32, fill: "#ffffff", textAlign: "center", charSpacing: 60, opacity: 0.9 }));
    } else {
      add(T("GOOD\nVIBES\nONLY", { left: cx, top: y(210), originX: "center", fontFamily: "Impact", fontSize: 192, fill: "#ffffff", textAlign: "center", lineHeight: 0.85, charSpacing: -8 }));
      add(L(120, y(745), 960, y(745), { stroke: "#ffffff", strokeWidth: 2, opacity: 0.7 }));
      add(T("#POSITIVEVIBES", { left: cx, top: y(810), originX: "center", fontFamily: "Arial", fontSize: 30, fill: "#ffffff", charSpacing: 180, opacity: 0.85 }));
    }

    add(T("@yourbrand", { left: cx, top: bY, originX: "center", fontFamily: "Arial", fontSize: 26, fill: "#ffffff", opacity: 0.6 }));
    if (numLabel) add(T(numLabel, { left: lm, top: y(42), fontFamily: "Arial", fontSize: 22, fill: "#ffffff", opacity: 0.7 }));
  }

  // ── MINIMAL ────────────────────────────────────────────────────────────────
  if (id === "minimal") {
    bg("#ffffff");
    add(R({ left: 0, top: 0, width: 50, height: h, fill: "#111111", selectable: false, evented: false }));
    const mlm = 90;
    add(L(mlm, y(130), 990, y(130), { stroke: "#111111", strokeWidth: 2 }));

    if (isDynamic) {
      add(TB(titleText, { left: mlm, top: y(158), width: 890, fontFamily: "Georgia", fontSize: 86, fill: "#111111", lineHeight: 1.1, fontStyle: "italic" }));
      add(TB(bodyText, { left: mlm, top: y(460), width: 890, fontFamily: "Georgia", fontSize: 42, fill: "#333333", lineHeight: 1.45, fontStyle: "italic" }));
    } else {
      add(T("The time\nis now.", { left: mlm, top: y(160), fontFamily: "Georgia", fontSize: 110, fill: "#111111", lineHeight: 1.1, fontStyle: "italic" }));
      add(T("Don't wait for the perfect\nmoment. Take the moment\nand make it perfect.", { left: mlm, top: y(480), fontFamily: "Georgia", fontSize: 44, fill: "#333333", lineHeight: 1.45, fontStyle: "italic" }));
    }

    add(L(mlm, y(880), 990, y(880), { stroke: "#111111", strokeWidth: 2 }));
    add(T("— ZOEY MORGAN", { left: mlm, top: y(912), fontFamily: "Arial", fontSize: 22, fill: "#111111", charSpacing: 220 }));
    add(R({ left: mlm, top: bY, width: 50, height: 4, fill: "#111111", selectable: false, evented: false }));
    if (numLabel) add(T(numLabel, { left: 940, top: y(42), fontFamily: "Arial", fontSize: 22, fill: "#111111", opacity: 0.4 }));
  }

  // ── AURORA ─────────────────────────────────────────────────────────────────
  if (id === "aurora") {
    bg("#0d0021");
    add(C({ left: 560, top: y(-260), radius: 510, fill: "#7c3aed", opacity: 0.22 }));
    add(C({ left: -260, top: y(650), radius: 470, fill: "#db2777", opacity: 0.19 }));
    add(C({ left: 620, top: y(650), radius: 180, fill: "#3b82f6", opacity: 0.14 }));
    add(C({ left: 110, top: y(108), radius: 38, fill: "#a78bfa", opacity: 0.55 }));
    add(C({ left: 910, top: y(910), radius: 28, fill: "#f472b6", opacity: 0.55 }));
    add(T("DARE TO BE DIFFERENT", { left: cx, top: y(140), originX: "center", fontFamily: "Arial", fontSize: 20, fill: "#c4b5fd", charSpacing: 240, opacity: 0.75 }));
    add(L(200, y(180), 880, y(180), { stroke: "#a78bfa", strokeWidth: 1, opacity: 0.4 }));

    if (isDynamic) {
      add(TB(titleText, { left: cx, top: y(240), width: 940, originX: "center", fontFamily: "Impact", fontSize: 160, fill: "#ffffff", textAlign: "center", lineHeight: 0.88 }));
      add(L(200, y(720), 880, y(720), { stroke: "#a78bfa", strokeWidth: 1, opacity: 0.4 }));
      add(TB(bodyText, { left: cx, top: y(750), width: 840, originX: "center", fontFamily: "Georgia", fontSize: 42, fill: "#e9d5ff", fontStyle: "italic", textAlign: "center" }));
    } else {
      add(T("BE\nBOLD.", { left: cx, top: y(250), originX: "center", fontFamily: "Impact", fontSize: 248, fill: "#ffffff", textAlign: "center", lineHeight: 0.82, charSpacing: -8 }));
      add(L(200, y(740), 880, y(740), { stroke: "#a78bfa", strokeWidth: 1, opacity: 0.4 }));
      add(T("Greatness is a decision.", { left: cx, top: y(775), originX: "center", fontFamily: "Georgia", fontSize: 44, fill: "#e9d5ff", fontStyle: "italic" }));
    }

    add(T("@yourbrand", { left: cx, top: bY, originX: "center", fontFamily: "Arial", fontSize: 24, fill: "#a78bfa", charSpacing: 150 }));
    if (numLabel) add(T(numLabel, { left: 910, top: y(140), fontFamily: "Arial", fontSize: 20, fill: "#a78bfa", opacity: 0.6 }));
  }

  // ── GRADIENT ──────────────────────────────────────────────────────────────
  if (id === "gradient") {
    bg("#0a0a1a");
    add(C({ left: 864, top: y(-108), radius: 648, fill: "#312e81", opacity: 0.7 }));
    add(C({ left: -216, top: y(756), radius: 540, fill: "#4f46e5", opacity: 0.5 }));
    add(C({ left: 540, top: y(540), radius: 378, fill: "#7c3aed", opacity: 0.25 }));
    add(L(lm, y(108), rm, y(108), { stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }));
    add(T("CREATOR STUDIO", { left: cx, top: y(72), originX: "center", fontFamily: "Arial", fontSize: 16, fill: "#a5b4fc", charSpacing: 300 }));

    if (isDynamic) {
      add(TB(titleText, { left: cx, top: y(216), width: 920, originX: "center", fontFamily: "Impact", fontSize: 120, fill: "#ffffff", textAlign: "center", lineHeight: 0.92 }));
      add(TB(bodyText, { left: cx, top: y(648), width: 810, originX: "center", fontFamily: "Georgia", fontSize: 38, fill: "#c7d2fe", fontStyle: "italic", textAlign: "center", lineHeight: 1.4 }));
    } else {
      add(T("LEVEL\nUP YOUR\nGAME.", { left: cx, top: y(216), originX: "center", fontFamily: "Impact", fontSize: 170, fill: "#ffffff", textAlign: "center", lineHeight: 0.85 }));
      add(T("The difference between\nwhere you are and where\nyou want to be is action.", { left: cx, top: y(648), originX: "center", fontFamily: "Georgia", fontSize: 38, fill: "#c7d2fe", fontStyle: "italic", textAlign: "center", lineHeight: 1.4 }));
    }

    add(L(lm, y(950), rm, y(950), { stroke: "rgba(255,255,255,0.15)", strokeWidth: 1 }));
    add(T("@yourbrand", { left: cx, top: bY, originX: "center", fontFamily: "Arial", fontSize: 22, fill: "#818cf8", charSpacing: 150 }));
    if (numLabel) add(T(numLabel, { left: 940, top: y(65), fontFamily: "Arial", fontSize: 18, fill: "#a5b4fc", opacity: 0.7 }));
  }

  // ── STUDIO ────────────────────────────────────────────────────────────────
  if (id === "studio") {
    bg("#141414");
    const accentH = Math.round(h * 0.04);
    add(R({ left: 0, top: 0, width: w, height: accentH, fill: "#f97316", selectable: false, evented: false }));
    add(R({ left: 0, top: h - accentH, width: w, height: accentH, fill: "#f97316", selectable: false, evented: false }));
    const sm = 70;
    add(T("Nº", { left: sm, top: y(75), fontFamily: "Georgia", fontSize: 42, fill: "#f97316", fontStyle: "italic" }));
    add(L(sm, y(172), 540, y(172), { stroke: "#f97316", strokeWidth: 2 }));

    if (isDynamic) {
      add(TB(titleText, { left: sm, top: y(194), width: 940, fontFamily: "Impact", fontSize: 115, fill: "#ffffff", lineHeight: 0.9 }));
      add(L(sm, y(626), 1004, y(626), { stroke: "#333333", strokeWidth: 1 }));
      add(TB(bodyText, { left: sm, top: y(648), width: 940, fontFamily: "Arial", fontSize: 34, fill: "#cccccc", lineHeight: 1.5 }));
    } else {
      add(T("MAKE\nIT\nHAPPEN.", { left: sm, top: y(194), fontFamily: "Impact", fontSize: 188, fill: "#ffffff", lineHeight: 0.85 }));
      add(L(sm, y(648), 1004, y(648), { stroke: "#333333", strokeWidth: 1 }));
      add(T("Success isn't luck.\nIt's consistency over time.", { left: sm, top: y(670), fontFamily: "Arial", fontSize: 36, fill: "#aaaaaa", lineHeight: 1.5 }));
    }

    add(T("@yourbrand", { left: sm, top: Math.round(h * 0.885), fontFamily: "Arial", fontSize: 22, fill: "#f97316", charSpacing: 120 }));
    if (numLabel) add(T(numLabel, { left: 940, top: Math.round(h * 0.885), fontFamily: "Arial", fontSize: 20, fill: "#555555" }));
  }

  // ── PASTEL ────────────────────────────────────────────────────────────────
  if (id === "pastel") {
    bg("#fff8f5");
    add(C({ left: 778, top: y(-130), radius: 410, fill: "#fecdd3", opacity: 0.6 }));
    add(C({ left: -108, top: y(778), radius: 346, fill: "#fed7aa", opacity: 0.5 }));
    add(C({ left: 918, top: y(842), radius: 194, fill: "#fbcfe8", opacity: 0.45 }));
    const pm = 80;
    add(L(pm, y(113), 1000, y(113), { stroke: "#7c2d12", strokeWidth: 1, opacity: 0.2 }));
    add(T("creator studio", { left: pm, top: y(70), fontFamily: "Georgia", fontSize: 18, fill: "#9a3412", fontStyle: "italic", opacity: 0.65 }));

    if (isDynamic) {
      add(TB(titleText, { left: pm, top: y(140), width: 920, fontFamily: "Georgia", fontSize: 96, fill: "#1c1917", lineHeight: 1.05, fontStyle: "italic" }));
      add(TB(bodyText, { left: pm, top: y(540), width: 920, fontFamily: "Georgia", fontSize: 40, fill: "#44403c", lineHeight: 1.5, fontStyle: "italic" }));
    } else {
      add(T("slow\ndown &\ncreate.", { left: pm, top: y(140), fontFamily: "Georgia", fontSize: 120, fill: "#1c1917", lineHeight: 1.0, fontStyle: "italic" }));
      add(T("Beauty is found in the quiet\nspaces between the chaos.\nMake time for what matters.", { left: pm, top: y(540), fontFamily: "Georgia", fontSize: 40, fill: "#44403c", lineHeight: 1.5, fontStyle: "italic" }));
    }

    add(L(pm, y(918), 1000, y(918), { stroke: "#7c2d12", strokeWidth: 1, opacity: 0.2 }));
    add(T("@yourbrand", { left: pm, top: bY, fontFamily: "Georgia", fontSize: 22, fill: "#9a3412", fontStyle: "italic", opacity: 0.75 }));
    if (numLabel) add(T(numLabel, { left: 940, top: y(67), fontFamily: "Arial", fontSize: 18, fill: "#9a3412", opacity: 0.45 }));
  }

  // ── PANORAMIC ─────────────────────────────────────────────────────────────
  // The orb lives in a virtual 3240px-wide canvas centered at x=1620.
  // Each slide N shifts the viewport left by (N-1)*1080, revealing a different
  // portion of the orb — creating the "part of a bigger image" carousel effect.
  if (id === "panoramic") {
    bg("#06080f");
    const slide = Math.max(1, parseInt(numLabel || "1") || 1);
    const orbX = 1620 - (slide - 1) * 1080; // project virtual center to slide viewport

    add(C({ left: orbX, top: y(290), radius: 1200, fill: "#0c1a4a", opacity: 0.7, selectable: false, evented: false }));
    add(C({ left: orbX + 100, top: y(244), radius: 900, fill: "#1e40af", opacity: 0.55, selectable: false, evented: false }));
    add(C({ left: orbX + 200, top: y(196), radius: 620, fill: "#3b82f6", opacity: 0.45, selectable: false, evented: false }));
    add(C({ left: orbX + 280, top: y(160), radius: 380, fill: "#93c5fd", opacity: 0.35, selectable: false, evented: false }));
    add(C({ left: orbX + 340, top: y(132), radius: 180, fill: "#dbeafe", opacity: 0.22, selectable: false, evented: false }));

    add(L(lm, y(800), rm, y(800), { stroke: "rgba(255,255,255,0.12)", strokeWidth: 1 }));

    if (isDynamic) {
      add(TB(titleText, { left: lm, top: y(826), width: 880, fontFamily: "Impact", fontSize: 88, fill: "#ffffff", lineHeight: 0.9 }));
      if (bodyText) add(TB(bodyText, { left: lm, top: y(962), width: 800, fontFamily: "Georgia", fontSize: 30, fill: "#93c5fd", fontStyle: "italic", lineHeight: 1.4 }));
    } else {
      add(T("EXPLORE\nTHE INFINITE.", { left: lm, top: y(826), fontFamily: "Impact", fontSize: 110, fill: "#ffffff", lineHeight: 0.88 }));
    }

    add(T("@yourbrand", { left: lm, top: bY, fontFamily: "Arial", fontSize: 22, fill: "#60a5fa", charSpacing: 150 }));
    if (numLabel) add(T(numLabel, { left: 940, top: y(42), fontFamily: "Arial", fontSize: 18, fill: "#60a5fa", opacity: 0.65 }));
  }

  // ── EDITORIAL ─────────────────────────────────────────────────────────────
  // Magazine-style with a giant low-opacity slide number as background texture.
  // The number changes per slide, making each frame feel distinct while the
  // orange accent stripe maintains visual continuity across the carousel.
  if (id === "editorial") {
    bg("#f4f0eb");
    const slide = Math.max(1, parseInt(numLabel || "1") || 1);
    const slideStr = String(slide).padStart(2, "0");

    add(T(slideStr, { left: -80, top: y(-200), fontFamily: "Impact", fontSize: 920, fill: "#000000", opacity: 0.055, selectable: false, evented: false }));
    add(R({ left: 0, top: 0, width: 10, height: h, fill: "#c2410c", selectable: false, evented: false }));

    const em = 36;
    add(T(slideStr, { left: em, top: y(46), fontFamily: "Impact", fontSize: 72, fill: "#c2410c" }));
    add(L(em, y(172), 900, y(172), { stroke: "#1a1a1a", strokeWidth: 3 }));

    if (isDynamic) {
      add(TB(titleText, { left: em, top: y(196), width: 980, fontFamily: "Impact", fontSize: 108, fill: "#1a1a1a", lineHeight: 0.9 }));
      if (bodyText) add(TB(bodyText, { left: em, top: y(582), width: 900, fontFamily: "Georgia", fontSize: 38, fill: "#333333", lineHeight: 1.55, fontStyle: "italic" }));
    } else {
      add(T("MAKE IT\nMATTER.", { left: em, top: y(196), fontFamily: "Impact", fontSize: 150, fill: "#1a1a1a", lineHeight: 0.85 }));
      add(T("Great design starts with\na great idea.", { left: em, top: y(640), fontFamily: "Georgia", fontSize: 42, fill: "#333333", lineHeight: 1.5, fontStyle: "italic" }));
    }

    add(T("@yourbrand", { left: em, top: bY, fontFamily: "Arial", fontSize: 22, fill: "#c2410c", charSpacing: 100 }));
  }

  canvas.renderAll();
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function CanvasEditorPage() {
  const router          = useRouter();
  const canvasEl        = useRef<HTMLCanvasElement>(null);
  const fc              = useRef<any>(null);
  const fabricMod       = useRef<any>(null);
  const containerRef    = useRef<HTMLDivElement>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);
  const clickHandlerRef = useRef<((opt: any) => void) | null>(null);
  const propsRef        = useRef({ fill: "#6366f1", stroke: "#000000", strokeWidth: 2, fontSize: 36, fontFamily: "Arial" });

  // Canvas dimensions
  const [sizeId, setSizeId] = useState<SizeId>("square");
  const [canvW, setCanvW]   = useState(1080);
  const [canvH, setCanvH]   = useState(1080);
  const dimsRef             = useRef({ w: 1080, h: 1080 });

  // ── Carousel slide state ──────────────────────────────────────────────────
  const [slides, setSlides]       = useState<SlideState[]>([{ id: uid(), json: null, thumbnail: "", label: "01" }]);
  const [activeIdx, setActiveIdx] = useState(0);
  const slidesRef                 = useRef<SlideState[]>(slides); // always-current ref for async callbacks
  const activeIdxRef              = useRef(0);
  useEffect(() => { slidesRef.current  = slides;    }, [slides]);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  // ── Editor state ─────────────────────────────────────────────────────────
  const [activeTool, setActiveTool]     = useState<Tool>("select");
  const [scale, setScale]               = useState(0.6);
  const [selectedObj, setSelectedObj]   = useState<any>(null);
  const [objType, setObjType]           = useState<string>("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAiPanel, setShowAiPanel]   = useState(false);
  const [thumbnails, setThumbnails]     = useState<Record<string, string>>({});
  const [thumbsLoading, setThumbsLoading] = useState(false);
  const thumbsGenerated                 = useRef(false);

  // ── UI panel state ────────────────────────────────────────────────────────
  const [leftOpen, setLeftOpen]           = useState(true);
  const [rightOpen, setRightOpen]         = useState(true);
  const [previewOpen, setPreviewOpen]     = useState(false);
  const [hasUnsaved, setHasUnsaved]       = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingNavUrl, setPendingNavUrl] = useState<string | null>(null);

  // ── AI panel state ────────────────────────────────────────────────────────
  const [aiTopic, setAiTopic]             = useState("");
  const [aiSlideCount, setAiSlideCount]   = useState(6);
  const [aiTone, setAiTone]               = useState("inspirational");
  const [aiTemplate, setAiTemplate]       = useState("noir");
  const [aiLoading, setAiLoading]         = useState(false);
  const [aiError, setAiError]             = useState("");
  const [exportingAll, setExportingAll]   = useState(false);

  // ── Object properties ─────────────────────────────────────────────────────
  const [fill, setFill]             = useState("#6366f1");
  const [stroke, setStroke]         = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize]     = useState(36);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [bold, setBold]             = useState(false);
  const [italic, setItalic]         = useState(false);
  const [textAlign, setTextAlign]   = useState<"left" | "center" | "right">("left");
  const [opacity, setOpacity]       = useState(100);
  const [objBounds, setObjBounds]   = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [brushSize, setBrushSize]   = useState(8);
  const [brushColor, setBrushColor] = useState("#000000");
  const [bgColor, setBgColor]       = useState("#ffffff");

  // ── History ───────────────────────────────────────────────────────────────
  const history     = useRef<string[]>([]);
  const histIdx     = useRef(-1);
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

  const syncBounds = (obj: any) => {
    if (!obj) return;
    const bw = Math.round((obj.width ?? 0) * (obj.scaleX ?? 1));
    const bh = Math.round((obj.height ?? 0) * (obj.scaleY ?? 1));
    setObjBounds({ x: Math.round(obj.left ?? 0), y: Math.round(obj.top ?? 0), w: bw, h: bh });
  };

  const handleSelect = (e: any) => {
    const obj = e.selected?.[0];
    if (!obj) return;
    setSelectedObj(obj);
    const type: string = obj.type;
    setObjType(type);
    setOpacity(Math.round((obj.opacity ?? 1) * 100));
    syncBounds(obj);
    if (type === "i-text" || type === "textbox") {
      setFontSize(obj.fontSize ?? 36);
      setFontFamily(obj.fontFamily ?? "Arial");
      setFill(typeof obj.fill === "string" ? obj.fill : "#000000");
      setBold(obj.fontWeight === "bold");
      setItalic(obj.fontStyle === "italic");
      setTextAlign((obj.textAlign as "left" | "center" | "right") ?? "left");
    } else if (["rect", "circle", "triangle", "ellipse"].includes(type)) {
      setFill(typeof obj.fill === "string" ? obj.fill : "#6366f1");
      setStroke(obj.stroke ?? "#000000");
      setStrokeWidth(obj.strokeWidth ?? 2);
    } else if (type === "line") {
      setStroke(obj.stroke ?? "#000000");
      setStrokeWidth(obj.strokeWidth ?? 2);
    }
  };

  // ── Fabric init ───────────────────────────────────────────────────────────
  useEffect(() => {
    let canvas: any;
    import("fabric").then((mod) => {
      fabricMod.current = mod;
      canvas = new mod.Canvas(canvasEl.current!, { width: 1080, height: 1080, backgroundColor: "#ffffff" });
      fc.current = canvas;

      // Auto-apply template from ?template= URL param (set by the Templates page)
      const urlParams = new URLSearchParams(window.location.search);
      const urlTpl = urlParams.get("template");
      if (urlTpl) {
        const tplDef = TEMPLATES.find(t => t.id === urlTpl);
        if (tplDef) {
          buildTemplate(urlTpl, canvas, mod);
          setBgColor(tplDef.bgColor);
        }
      }

      saveHistory();
      canvas.on("selection:created", handleSelect);
      canvas.on("selection:updated", handleSelect);
      canvas.on("selection:cleared", () => { setSelectedObj(null); setObjType(""); setObjBounds({ x: 0, y: 0, w: 0, h: 0 }); });
      canvas.on("object:added",    () => { if (!skipHistory.current) saveHistory(); setHasUnsaved(true); });
      canvas.on("object:modified", (e: any) => { saveHistory(); if (e.target) syncBounds(e.target); setHasUnsaved(true); });
      canvas.on("object:moving",   (e: any) => { if (e.target) syncBounds(e.target); });
      canvas.on("object:removed",  () => { saveHistory(); setHasUnsaved(true); });
    });
    return () => { canvas?.dispose(); fc.current = null; };
  }, [saveHistory]);

  // ── Slide management ──────────────────────────────────────────────────────

  const captureCurrentSlide = useCallback((): Pick<SlideState, "json" | "thumbnail"> => {
    if (!fc.current) return { json: null, thumbnail: "" };
    const json      = JSON.stringify(fc.current.toJSON());
    const mult      = Math.min(80 / dimsRef.current.w, 80 / dimsRef.current.h);
    const thumbnail = fc.current.toDataURL({ format: "jpeg", quality: 0.7, multiplier: mult });
    return { json, thumbnail };
  }, []);

  const loadSlide = useCallback((slide: SlideState) => {
    if (!fc.current) return;
    if (slide.json) {
      skipHistory.current = true;
      fc.current.loadFromJSON(slide.json).then(() => {
        fc.current?.renderAll();
        skipHistory.current = false;
      });
    } else {
      fc.current.clear();
      fc.current.set("backgroundColor", bgColor);
      fc.current.renderAll();
    }
  }, [bgColor]);

  const switchSlide = useCallback((newIdx: number) => {
    if (!fc.current) return;
    const captured = captureCurrentSlide();
    setSlides(prev => {
      const next = prev.map((s, i) => i === activeIdxRef.current ? { ...s, ...captured } : s);
      loadSlide(next[newIdx]);
      return next;
    });
    setActiveIdx(newIdx);
    activeIdxRef.current = newIdx;
    setSelectedObj(null);
    setObjType("");
  }, [captureCurrentSlide, loadSlide]);

  const addSlide = useCallback(() => {
    const captured = captureCurrentSlide();
    setSlides(prev => {
      const updated  = prev.map((s, i) => i === activeIdxRef.current ? { ...s, ...captured } : s);
      const newSlide = { id: uid(), json: null, thumbnail: "", label: pad(updated.length + 1) };
      const next     = [...updated, newSlide];
      // Clear canvas for new blank slide
      if (fc.current) {
        fc.current.clear();
        fc.current.set("backgroundColor", bgColor);
        fc.current.renderAll();
      }
      const newIdx = next.length - 1;
      setActiveIdx(newIdx);
      activeIdxRef.current = newIdx;
      return next;
    });
    setSelectedObj(null);
    setObjType("");
  }, [captureCurrentSlide, bgColor]);

  const deleteSlide = useCallback((idx: number) => {
    setSlides(prev => {
      if (prev.length <= 1) return prev;
      const next    = prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, label: pad(i + 1) }));
      const newIdx  = Math.min(idx, next.length - 1);
      loadSlide(next[newIdx]);
      setActiveIdx(newIdx);
      activeIdxRef.current = newIdx;
      setSelectedObj(null);
      setObjType("");
      return next;
    });
  }, [loadSlide]);

  const duplicateSlide = useCallback((idx: number) => {
    const captured = captureCurrentSlide();
    setSlides(prev => {
      const updated = prev.map((s, i) => i === activeIdxRef.current ? { ...s, ...captured } : s);
      const copy    = { ...updated[idx], id: uid() };
      const next    = [
        ...updated.slice(0, idx + 1),
        copy,
        ...updated.slice(idx + 1),
      ].map((s, i) => ({ ...s, label: pad(i + 1) }));
      return next;
    });
  }, [captureCurrentSlide]);

  // ── Export all ────────────────────────────────────────────────────────────

  const exportAll = useCallback(async () => {
    if (!fc.current) return;
    setExportingAll(true);

    const captured   = captureCurrentSlide();
    const savedIdx   = activeIdxRef.current;
    const allSlides  = slidesRef.current.map((s, i) =>
      i === savedIdx ? { ...s, ...captured } : s
    );

    for (const slide of allSlides) {
      if (slide.json) {
        await fc.current.loadFromJSON(slide.json);
        fc.current.renderAll();
      } else {
        fc.current.clear();
        fc.current.set("backgroundColor", bgColor);
        fc.current.renderAll();
      }
      const dataUrl = fc.current.toDataURL({ format: "png", multiplier: 1 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `slide-${slide.label}.png`;
      a.click();
      await new Promise<void>(r => setTimeout(r, 300));
    }

    // Restore the active slide
    await fc.current.loadFromJSON(allSlides[savedIdx].json ?? "{}");
    fc.current.renderAll();
    setExportingAll(false);
  }, [captureCurrentSlide, bgColor]);

  // ── AI generation ─────────────────────────────────────────────────────────

  const generateCarousel = useCallback(async () => {
    if (!aiTopic.trim() || !fabricMod.current) return;
    setAiLoading(true);
    setAiError("");

    try {
      const res = await fetch("/api/carousel/from-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText:    aiTopic,
          slideCount: aiSlideCount,
          theme:      aiTemplate,
          tone:       aiTone,
          handle:     "",
          font:       "serif",
          size:       "square",
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const generated: { title: string; body: string; numberLabel: string; type: string }[] = data.slides;

      const mod = fabricMod.current;
      const newSlides: SlideState[] = [];

      for (let i = 0; i < generated.length; i++) {
        const g  = generated[i];
        const el = document.createElement("canvas");
        const sc = new mod.StaticCanvas(el, { width: dimsRef.current.w, height: dimsRef.current.h });

        buildTemplate(aiTemplate, sc, mod, {
          title:       g.title,
          body:        g.body,
          slideNumber: g.numberLabel,
        });

        const mult      = Math.min(80 / dimsRef.current.w, 80 / dimsRef.current.h);
        const thumbnail = sc.toDataURL({ format: "jpeg", quality: 0.7, multiplier: mult });
        const json      = JSON.stringify(sc.toJSON());
        sc.dispose();

        newSlides.push({ id: uid(), json, thumbnail, label: g.numberLabel });
      }

      // Set state and load first slide
      setSlides(newSlides);
      slidesRef.current = newSlides;
      setActiveIdx(0);
      activeIdxRef.current = 0;

      const tplDef = TEMPLATES.find(t => t.id === aiTemplate);
      if (tplDef) setBgColor(tplDef.bgColor);

      fc.current?.loadFromJSON(newSlides[0].json!).then(() => fc.current?.renderAll());
      setShowAiPanel(false);
    } catch (e: any) {
      setAiError(e.message ?? "Generation failed.");
    } finally {
      setAiLoading(false);
    }
  }, [aiTopic, aiSlideCount, aiTemplate]);

  // ── Template gallery thumbnails ───────────────────────────────────────────

  const generateThumbnails = useCallback(async () => {
    if (thumbsGenerated.current || !fabricMod.current) return;
    thumbsGenerated.current = true;
    setThumbsLoading(true);
    const mod    = fabricMod.current;
    const result: Record<string, string> = {};
    for (const tpl of TEMPLATES) {
      const el = document.createElement("canvas");
      const sc = new mod.StaticCanvas(el, { width: 1080, height: 1080 });
      buildTemplate(tpl.id, sc, mod);
      result[tpl.id] = sc.toDataURL({ format: "jpeg", quality: 0.82, multiplier: 200 / 1080 });
      sc.dispose();
    }
    setThumbnails(result);
    setThumbsLoading(false);
  }, []);

  const openTemplates = () => {
    setShowAiPanel(false);
    setShowTemplates(true);
    generateThumbnails();
  };

  const applyTemplate = (templateId: string) => {
    if (!fc.current || !fabricMod.current) return;
    changeSize("square");
    buildTemplate(templateId, fc.current, fabricMod.current);
    const tpl = TEMPLATES.find(t => t.id === templateId);
    if (tpl) setBgColor(tpl.bgColor);
    setSelectedObj(null);
    setObjType("");
    setShowTemplates(false);

    // Update thumbnail for current slide
    const captured = captureCurrentSlide();
    setSlides(prev => prev.map((s, i) => i === activeIdxRef.current ? { ...s, ...captured } : s));
    saveHistory();
  };

  // ── Size ──────────────────────────────────────────────────────────────────

  const recalcScale = useCallback((w: number, h: number) => {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setScale(Math.max(Math.min((width - 48) / w, (height - 48) / h, 1), 0.1));
  }, []);

  const changeSize = useCallback((id: SizeId) => {
    const sz = CANVAS_SIZES.find(s => s.id === id)!;
    setSizeId(id);
    setCanvW(sz.w);
    setCanvH(sz.h);
    dimsRef.current = { w: sz.w, h: sz.h };
    if (fc.current) { fc.current.setDimensions({ width: sz.w, height: sz.h }); fc.current.renderAll(); }
    recalcScale(sz.w, sz.h);
  }, [recalcScale]);

  // ── Tool switching ────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = fc.current;
    if (!canvas) return;
    if (clickHandlerRef.current) { canvas.off("mouse:down", clickHandlerRef.current); clickHandlerRef.current = null; }

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
        if (obj) { canvas.add(obj); canvas.setActiveObject(obj); canvas.renderAll(); setActiveTool("select"); }
      };
      clickHandlerRef.current = handler;
      canvas.on("mouse:down", handler);
    }
    canvas.renderAll();
  }, [activeTool]);

  // ── ResizeObserver ────────────────────────────────────────────────────────

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

  // ── Keyboard shortcuts ────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.metaKey || e.ctrlKey;
      if (ctrl && e.key === "z" && !e.shiftKey)                     { e.preventDefault(); undo(); }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.key === "Escape") { setShowTemplates(false); setShowAiPanel(false); }
      if ((e.key === "Delete" || e.key === "Backspace") && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        const canvas = fc.current;
        if (!canvas) return;
        const active = canvas.getActiveObjects();
        if (active.length) { canvas.remove(...active); canvas.discardActiveObject(); canvas.renderAll(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ── beforeunload guard ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsaved) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [hasUnsaved]);

  const undo = () => {
    if (histIdx.current <= 0 || !fc.current) return;
    histIdx.current--;
    skipHistory.current = true;
    fc.current.loadFromJSON(history.current[histIdx.current]).then(() => { fc.current?.renderAll(); skipHistory.current = false; });
  };

  const redo = () => {
    if (histIdx.current >= history.current.length - 1 || !fc.current) return;
    histIdx.current++;
    skipHistory.current = true;
    fc.current.loadFromJSON(history.current[histIdx.current]).then(() => { fc.current?.renderAll(); skipHistory.current = false; });
  };

  const handleExport = () => {
    const canvas = fc.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL({ format: "png", multiplier: 1 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `slide-${slides[activeIdx]?.label ?? "01"}.png`;
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

  const duplicateObject = () => {
    const obj = fc.current?.getActiveObject();
    if (!obj) return;
    obj.clone().then((clone: any) => {
      clone.set({ left: (obj.left ?? 0) + 20, top: (obj.top ?? 0) + 20 });
      fc.current?.add(clone);
      fc.current?.setActiveObject(clone);
      fc.current?.renderAll();
    });
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

  const isTextObj     = objType === "i-text" || objType === "textbox";
  const isShapeObj    = ["rect", "circle", "triangle", "ellipse"].includes(objType);
  const isLineObj     = objType === "line";
  const fillStr       = typeof fill === "string" && fill.startsWith("#") ? fill : "#6366f1";
  const strokeStr     = stroke.startsWith("#") ? stroke : "#000000";
  const currentSlideId = slides[0]?.id ?? 'default';

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full relative">

      {/* ── Tool sidebar ─────────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: leftOpen ? 68 : 0, opacity: leftOpen ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="overflow-hidden shrink-0 flex flex-col border-r border-[#222] bg-[#141414]"
      >
        <div className="w-[68px] flex flex-col items-center py-3 gap-0.5 h-full">
          {TOOLS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              title={label}
              onClick={() => setActiveTool(id)}
              className={cn(
                "flex flex-col items-center justify-center w-14 h-12 rounded-lg transition-colors gap-0.5",
                activeTool === id
                  ? "bg-primary/20 text-primary ring-1 ring-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07]"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-medium leading-none">{label}</span>
            </button>
          ))}
          <div className="h-px w-8 bg-border my-1" />
          <button title="Upload image" onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center w-14 h-12 rounded-lg gap-0.5 text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors">
            <ImagePlus className="w-4 h-4" />
            <span className="text-[9px] font-medium leading-none">Image</span>
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <div className="mt-auto flex flex-col gap-0.5">
            <button title="Undo (Ctrl+Z)" onClick={undo}
              className="flex flex-col items-center justify-center w-14 h-10 rounded-lg gap-0.5 text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[9px] font-medium leading-none">Undo</span>
            </button>
            <button title="Redo (Ctrl+Y)" onClick={redo}
              className="flex flex-col items-center justify-center w-14 h-10 rounded-lg gap-0.5 text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors">
              <RotateCw className="w-3.5 h-3.5" />
              <span className="text-[9px] font-medium leading-none">Redo</span>
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Left panel toggle button */}
      <button
        onClick={() => setLeftOpen(v => !v)}
        className="absolute top-1/2 -translate-y-1/2 z-20 w-4 h-8 bg-[#1e1e1e] border border-[#222] rounded-r flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
        style={{ left: leftOpen ? 68 : 0, transition: 'left 0.3s' }}
      >
        {leftOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* ── Canvas area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Toolbar */}
        <div className="shrink-0 flex items-center justify-between px-3 h-11 border-b border-border bg-background/80">
          <div className="flex items-center gap-1">
            {CANVAS_SIZES.map(sz => (
              <button key={sz.id} title={sz.sublabel} onClick={() => changeSize(sz.id)}
                className={cn("px-2.5 h-7 rounded-md text-xs font-medium transition-colors",
                  sizeId === sz.id ? "bg-primary/20 text-primary ring-1 ring-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07]"
                )}>{sz.label}</button>
            ))}
            <div className="h-3 w-px bg-border mx-1" />
            <button onClick={openTemplates}
              className={cn("flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs transition-colors",
                showTemplates ? "bg-primary/20 text-primary ring-1 ring-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07]"
              )}>
              <LayoutTemplate className="w-3.5 h-3.5" />Templates
            </button>
            <button onClick={() => { setShowTemplates(false); setShowAiPanel(v => !v); generateThumbnails(); }}
              className={cn("flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs transition-colors",
                showAiPanel ? "bg-primary/20 text-primary ring-1 ring-primary/25" : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07]"
              )}>
              <Sparkles className="w-3.5 h-3.5" />AI Carousel
            </button>
            <div className="h-3 w-px bg-border mx-1" />
            <span className="text-xs text-muted-foreground font-mono hidden sm:inline">{canvW} × {canvH}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors h-7"
            >
              <Smartphone className="w-3.5 h-3.5" /> Preview
            </button>
            <button
              onClick={() => {
                if (!fc.current) return;
                const json = JSON.stringify(fc.current.toJSON());
                localStorage.setItem(`canvas_slide_${currentSlideId}`, json);
                setHasUnsaved(false);
                toast.success('Saved to browser storage');
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 h-7 text-xs rounded-lg transition-all font-medium",
                hasUnsaved
                  ? "bg-primary text-primary-foreground hover:brightness-110"
                  : "border border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {hasUnsaved ? 'Save changes' : 'Saved'}
            </button>
            <div className="h-3 w-px bg-border mx-0.5" />
            <button onClick={handleClear} className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/[0.07] transition-colors">
              <Trash2 className="w-3.5 h-3.5" />Clear
            </button>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs bg-foreground/[0.07] text-foreground hover:bg-foreground/[0.12] transition-colors">
              <Download className="w-3.5 h-3.5" />Export
            </button>
            <button onClick={exportAll} disabled={exportingAll}
              className="flex items-center gap-1.5 px-2.5 h-7 rounded-md text-xs bg-primary/15 text-primary ring-1 ring-primary/20 hover:bg-primary/25 transition-colors disabled:opacity-50">
              {exportingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              {exportingAll ? "Exporting…" : `Export All (${slides.length})`}
            </button>
          </div>
        </div>

        {/* Canvas viewport */}
        <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-auto p-4 bg-zinc-950/50">
          <div style={{ width: canvW * scale, height: canvH * scale, flexShrink: 0 }}>
            <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: canvW, height: canvH, boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 8px 48px rgba(0,0,0,0.6)", borderRadius: 4, overflow: "hidden" }}>
              <canvas ref={canvasEl} />
            </div>
          </div>
        </div>

        {/* ── Slide strip ────────────────────────────────────────────────── */}
        <div className="shrink-0 border-t border-border bg-background flex items-center gap-2 px-3 py-2 overflow-x-auto">
          {slides.map((slide, i) => {
            const thumbW = 48;
            const thumbH = Math.round(thumbW * (canvH / canvW));
            return (
              <div key={slide.id} className="relative group shrink-0 flex flex-col items-center gap-1">
                <button
                  onClick={() => switchSlide(i)}
                  style={{ width: thumbW, height: thumbH }}
                  className={cn(
                    "rounded overflow-hidden border-2 transition-all",
                    activeIdx === i ? "border-primary shadow-[0_0_0_2px] shadow-primary/30" : "border-transparent hover:border-border"
                  )}
                >
                  {slide.thumbnail
                    ? <img src={slide.thumbnail} className="w-full h-full object-cover" alt={`Slide ${slide.label}`} />
                    : <div className="w-full h-full bg-zinc-800 flex items-center justify-center"><span className="text-[8px] text-zinc-500">{slide.label}</span></div>
                  }
                </button>
                <span className="text-[9px] text-muted-foreground">{slide.label}</span>

                {/* Hover actions */}
                <div className="absolute -top-1 -right-1 hidden group-hover:flex gap-0.5 z-10">
                  <button onClick={() => duplicateSlide(i)} title="Duplicate" className="flex items-center justify-center w-4 h-4 rounded bg-background border border-border text-muted-foreground hover:text-foreground">
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                  {slides.length > 1 && (
                    <button onClick={() => deleteSlide(i)} title="Delete" className="flex items-center justify-center w-4 h-4 rounded bg-background border border-border text-red-400 hover:text-red-500">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add slide */}
          <button
            onClick={addSlide}
            style={{ width: 48, height: Math.round(48 * (canvH / canvW)) }}
            className="shrink-0 rounded border border-dashed border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            title="Add slide"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right panel toggle button */}
      <button
        onClick={() => setRightOpen(v => !v)}
        className="absolute top-1/2 -translate-y-1/2 z-20 w-4 h-8 bg-[#1e1e1e] border border-[#222] rounded-l flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
        style={{ right: rightOpen ? 224 : 0, transition: 'right 0.3s' }}
      >
        {rightOpen ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      {/* ── Properties panel ─────────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: rightOpen ? 224 : 0, opacity: rightOpen ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="overflow-hidden shrink-0 border-l border-border bg-background"
      >
      <div className="w-56 h-full overflow-y-auto">
        <div className="p-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Properties</p>
        </div>
        <div className="p-3 space-y-4">

          {!selectedObj && activeTool !== "draw" && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Background</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bgColor} onChange={e => updateBg(e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-border" />
                <span className="text-xs font-mono text-muted-foreground">{bgColor}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {COLOR_SWATCHES.map(c => (
                  <button key={c} title={c} onClick={() => updateBg(c)}
                    style={{ background: c }} className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform" />
                ))}
              </div>
            </div>
          )}

          {activeTool === "draw" && (
            <>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Brush color</label>
                <input type="color" value={brushColor} onChange={e => { setBrushColor(e.target.value); if (fc.current?.freeDrawingBrush) fc.current.freeDrawingBrush.color = e.target.value; }} className="w-8 h-8 rounded cursor-pointer border border-border" />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Brush size: {brushSize}px</label>
                <input type="range" min={1} max={80} value={brushSize} onChange={e => { setBrushSize(+e.target.value); if (fc.current?.freeDrawingBrush) fc.current.freeDrawingBrush.width = +e.target.value; }} className="w-full accent-primary" />
              </div>
            </>
          )}

          {selectedObj && (
            <>
              {/* Position & size */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Position / Size</label>
                <div className="grid grid-cols-2 gap-1">
                  {[["X", objBounds.x], ["Y", objBounds.y], ["W", objBounds.w], ["H", objBounds.h]].map(([k, v]) => (
                    <div key={k} className="flex items-center gap-1 h-7 px-2 rounded-md border border-border bg-muted/20">
                      <span className="text-[9px] text-muted-foreground font-medium w-3">{k}</span>
                      <span className="text-xs text-foreground font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Duplicate + layer */}
              <div className="flex gap-1.5">
                <button onClick={duplicateObject}
                  className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors">
                  <Copy className="w-3 h-3" />Copy
                </button>
                <button onClick={() => { fc.current?.bringObjectToFront(fc.current.getActiveObject()); fc.current?.renderAll(); }}
                  title="Bring to front"
                  className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors">
                  <BringToFront className="w-3 h-3" />Front
                </button>
                <button onClick={() => { fc.current?.sendObjectToBack(fc.current.getActiveObject()); fc.current?.renderAll(); }}
                  title="Send to back"
                  className="flex-1 flex items-center justify-center gap-1 h-7 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors">
                  <SendToBack className="w-3 h-3" />Back
                </button>
              </div>

              {/* Opacity */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Opacity: {opacity}%</label>
                <input type="range" min={0} max={100} value={opacity} onChange={e => {
                  const v = +e.target.value;
                  setOpacity(v);
                  updateProp({ opacity: v / 100 });
                }} className="w-full accent-primary" />
              </div>
            </>
          )}

          {isTextObj && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={fillStr} onChange={e => { setFill(e.target.value); updateProp({ fill: e.target.value }); }} className="w-8 h-8 rounded cursor-pointer border border-border" />
                  <span className="text-xs font-mono text-muted-foreground">{fillStr}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {COLOR_SWATCHES.map(c => (
                    <button key={c} title={c} onClick={() => { setFill(c); updateProp({ fill: c }); }}
                      style={{ background: c }} className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform" />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Font</label>
                <select value={fontFamily} onChange={e => { setFontFamily(e.target.value); updateProp({ fontFamily: e.target.value }); }} className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 text-foreground">
                  {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Size</label>
                <input type="number" value={fontSize} min={8} max={400} onChange={e => { setFontSize(+e.target.value); updateProp({ fontSize: +e.target.value }); }} className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 text-foreground" />
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => { const nb = !bold; setBold(nb); updateProp({ fontWeight: nb ? "bold" : "normal" }); }} className={cn("flex-1 h-8 rounded-md text-xs font-bold border transition-colors", bold ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground")}>B</button>
                <button onClick={() => { const ni = !italic; setItalic(ni); updateProp({ fontStyle: ni ? "italic" : "normal" }); }} className={cn("flex-1 h-8 rounded-md text-xs italic border transition-colors", italic ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground")}>I</button>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Align</label>
                <div className="flex gap-1.5">
                  {(["left", "center", "right"] as const).map(a => {
                    const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                    return (
                      <button key={a} onClick={() => { setTextAlign(a); updateProp({ textAlign: a }); }}
                        className={cn("flex-1 h-7 rounded-md border flex items-center justify-center transition-colors",
                          textAlign === a ? "bg-primary/20 text-primary border-primary/30" : "border-border text-muted-foreground hover:text-foreground")}>
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {isShapeObj && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Fill</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={fillStr} onChange={e => { setFill(e.target.value); updateProp({ fill: e.target.value }); }} className="w-8 h-8 rounded cursor-pointer border border-border" />
                  <span className="text-xs font-mono text-muted-foreground">{fillStr}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {COLOR_SWATCHES.map(c => (
                    <button key={c} title={c} onClick={() => { setFill(c); updateProp({ fill: c }); }}
                      style={{ background: c }} className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform" />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Stroke</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={strokeStr} onChange={e => { setStroke(e.target.value); updateProp({ stroke: e.target.value }); }} className="w-8 h-8 rounded cursor-pointer border border-border" />
                  <span className="text-xs font-mono text-muted-foreground">{strokeStr}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Stroke width</label>
                <input type="number" value={strokeWidth} min={0} max={50} onChange={e => { setStrokeWidth(+e.target.value); updateProp({ strokeWidth: +e.target.value }); }} className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 text-foreground" />
              </div>
            </>
          )}

          {isLineObj && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={strokeStr} onChange={e => { setStroke(e.target.value); updateProp({ stroke: e.target.value }); }} className="w-8 h-8 rounded cursor-pointer border border-border" />
                  <span className="text-xs font-mono text-muted-foreground">{strokeStr}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {COLOR_SWATCHES.map(c => (
                    <button key={c} title={c} onClick={() => { setStroke(c); updateProp({ stroke: c }); }}
                      style={{ background: c }} className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform" />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Width</label>
                <input type="number" value={strokeWidth} min={1} max={50} onChange={e => { setStrokeWidth(+e.target.value); updateProp({ strokeWidth: +e.target.value }); }} className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 text-foreground" />
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
              <Trash2 className="w-3.5 h-3.5" />Delete object
            </button>
          )}

          {!selectedObj && activeTool === "select" && (
            <p className="text-xs text-muted-foreground text-center pt-4">Select an object to edit its properties</p>
          )}
          {["text", "rect", "circle", "line"].includes(activeTool) && (
            <p className="text-xs text-muted-foreground text-center pt-4">Click on the canvas to place</p>
          )}
        </div>
      </div>
      </motion.aside>

      {/* ── Instagram phone preview modal ────────────────────────────────── */}
      {previewOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="relative"
            style={{ width: 320, height: 640 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Phone frame */}
            <div className="absolute inset-0 rounded-[40px] bg-zinc-900 ring-4 ring-zinc-700 shadow-2xl overflow-hidden">
              {/* Status bar */}
              <div className="h-8 bg-zinc-950 flex items-center justify-between px-6">
                <span className="text-[9px] text-white font-medium">9:41</span>
                <div className="w-20 h-4 bg-zinc-900 rounded-full" />
                <div className="flex gap-1">
                  <div className="w-3 h-2 bg-white/50 rounded-sm" />
                  <div className="w-1.5 h-2 bg-white/50 rounded-sm" />
                </div>
              </div>
              {/* IG header */}
              <div className="h-10 bg-black flex items-center justify-between px-4 border-b border-zinc-800">
                <span className="text-white text-xs font-semibold">@yourhandle</span>
                <div className="flex gap-2">
                  <div className="w-4 h-4 rounded-full bg-zinc-700" />
                  <div className="w-4 h-4 rounded-full bg-zinc-700" />
                </div>
              </div>
              {/* Canvas preview inside phone */}
              <div className="bg-zinc-950 flex items-center justify-center overflow-hidden" style={{ height: 'calc(100% - 120px)' }}>
                <canvas
                  ref={(el) => {
                    if (el && fc.current) {
                      const ctx = el.getContext('2d');
                      if (ctx) {
                        const dataURL = fc.current.toDataURL({ format: 'jpeg', quality: 0.85, multiplier: 0.3 });
                        const img = new Image();
                        img.onload = () => {
                          el.width = 280;
                          el.height = 280;
                          ctx.drawImage(img, 0, 0, 280, 280);
                        };
                        img.src = dataURL;
                      }
                    }
                  }}
                  style={{ width: 280, height: 280, objectFit: 'cover' }}
                />
              </div>
              {/* IG bottom actions */}
              <div className="h-10 bg-black flex items-center justify-around px-6 border-t border-zinc-800">
                {['♡', '💬', '↗', '🔖'].map((icon) => (
                  <span key={icon} className="text-white text-sm">{icon}</span>
                ))}
              </div>
              {/* Home indicator */}
              <div className="h-8 bg-zinc-950 flex items-center justify-center">
                <div className="w-24 h-1 bg-zinc-600 rounded-full" />
              </div>
            </div>
            {/* Close */}
            <button
              onClick={() => setPreviewOpen(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-white hover:bg-zinc-700 transition-colors text-sm"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Save/discard dialog ───────────────────────────────────────────── */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-foreground font-semibold mb-2">Unsaved changes</h3>
            <p className="text-muted-foreground text-sm mb-5">
              You have unsaved changes. Save them before leaving?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowSaveDialog(false);
                  setHasUnsaved(false);
                  if (pendingNavUrl) router.push(pendingNavUrl);
                }}
                className="flex-1 px-4 py-2 text-sm border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => {
                  if (fc.current) {
                    const json = JSON.stringify(fc.current.toJSON());
                    localStorage.setItem(`canvas_slide_${currentSlideId}`, json);
                  }
                  setShowSaveDialog(false);
                  setHasUnsaved(false);
                  if (pendingNavUrl) router.push(pendingNavUrl);
                }}
                className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:brightness-110 transition-all font-medium"
              >
                Save & leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template gallery overlay ──────────────────────────────────────── */}
      {showTemplates && (
        <>
          <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm" onClick={() => setShowTemplates(false)} />
          <div className="absolute left-14 top-0 bottom-0 z-30 w-72 border-r border-border bg-background shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
              <span className="text-sm font-medium">Templates</span>
              <button onClick={() => setShowTemplates(false)} className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <p className="text-xs text-muted-foreground">Select a template to load it onto the current slide.</p>
              {thumbsLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />Rendering previews…
                </div>
              )}
              {!thumbsLoading && TEMPLATES.map(tpl => (
                <button key={tpl.id} onClick={() => applyTemplate(tpl.id)}
                  className="w-full text-left group rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                  <div className="relative w-full aspect-square bg-zinc-900 overflow-hidden">
                    {thumbnails[tpl.id]
                      ? <img src={thumbnails[tpl.id]} alt={tpl.name} className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.03]" />
                      : <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    }
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

      {/* ── AI Carousel panel ─────────────────────────────────────────────── */}
      {showAiPanel && (
        <>
          <div className="absolute inset-0 z-20 bg-background/60 backdrop-blur-sm" onClick={() => setShowAiPanel(false)} />
          <div className="absolute right-52 top-0 bottom-0 z-30 w-80 border-l border-border bg-background shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-4 h-11 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">AI Carousel</span>
              </div>
              <button onClick={() => setShowAiPanel(false)} className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/[0.07] transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Describe your topic or paste content. Gemini will generate slide titles and text, then apply your chosen template consistently across all slides.
              </p>

              {/* Topic */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Topic or content</label>
                <textarea
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  placeholder="e.g. 5 tips for better sleep, or paste an article…"
                  rows={5}
                  className="w-full rounded-md border border-border bg-background text-xs px-3 py-2 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              {/* Slide count */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Number of slides: {aiSlideCount}</label>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={aiSlideCount}
                  onChange={e => setAiSlideCount(+e.target.value)}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>3</span><span>10</span>
                </div>
              </div>

              {/* Tone */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Tone</label>
                <select value={aiTone} onChange={e => setAiTone(e.target.value)} className="w-full h-8 rounded-md border border-border bg-background text-xs px-2 text-foreground">
                  {TONES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>

              {/* Template */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Design template</label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => setAiTemplate(tpl.id)}
                      className={cn(
                        "p-2 rounded-lg border text-left transition-colors",
                        aiTemplate === tpl.id
                          ? "border-primary/50 bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                      )}
                    >
                      <div className="w-full aspect-square rounded mb-1.5 overflow-hidden">
                        {thumbnails[tpl.id]
                          ? <img src={thumbnails[tpl.id]} alt={tpl.name} className="w-full h-full object-contain" />
                          : <div className="w-full h-full rounded" style={{ background: tpl.bgColor }} />
                        }
                      </div>
                      <p className="text-xs font-medium">{tpl.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {aiError && <p className="text-xs text-red-400 bg-red-500/10 rounded-md px-3 py-2">{aiError}</p>}
            </div>

            <div className="p-4 border-t border-border shrink-0">
              <button
                onClick={generateCarousel}
                disabled={aiLoading || !aiTopic.trim()}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {aiLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                  : <><Sparkles className="w-4 h-4" />Generate Carousel</>
                }
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
