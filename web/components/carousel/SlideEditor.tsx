'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { CarouselTemplate } from '@/lib/carouselTemplates';
import { EditorToolbar, SelectedInfo } from './EditorToolbar';
import { Smartphone, Loader, ArrowRight } from 'lucide-react';

export interface SlideState {
  json: object;
}

interface Props {
  template: CarouselTemplate;
  slideStates: object[];
  carouselTitle: string;
  onSlideStatesChange: (states: object[]) => void;
  onExportReady: (dataUrls: string[]) => void;
}

export function SlideEditor({ template, slideStates, carouselTitle, onSlideStatesChange, onExportReady }: Props) {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fabricRef = useRef<any>(null);
  const slideStatesRef = useRef(slideStates);
  const currentSlideRef = useRef(0);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [selected, setSelected] = useState<SelectedInfo>({ type: 'none' });
  const [isExporting, setIsExporting] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState('');

  // Keep refs in sync
  slideStatesRef.current = slideStates;
  currentSlideRef.current = currentSlide;

  // Initialize Fabric.js canvas once
  useEffect(() => {
    if (!canvasEl.current) return;

    let canvas: NonNullable<typeof fabricRef.current>;

    import('fabric').then(({ Canvas }) => {
      canvas = new Canvas(canvasEl.current!, {
        width: 540,
        height: 540,
        preserveObjectStacking: true,
      });
      fabricRef.current = canvas;

      // Load first slide
      const initial = slideStatesRef.current[0];
      if (initial) {
        canvas.loadFromJSON(initial).then(() => canvas.renderAll());
      }

      // Selection events
      const updateSel = (obj: NonNullable<typeof fabricRef.current>) => {
        if (!obj) { setSelected({ type: 'none' }); return; }
        const type = obj.type === 'i-text' || obj.type === 'textbox' ? 'text'
          : obj.type === 'image' ? 'image' : 'shape';
        setSelected({
          type,
          fontFamily: obj.fontFamily,
          fontSize: obj.fontSize,
          fill: typeof obj.fill === 'string' ? obj.fill : '#ffffff',
          bold: obj.fontWeight === 'bold',
          italic: obj.fontStyle === 'italic',
        });
      };

      canvas.on('selection:created', (e: { selected: NonNullable<typeof fabricRef.current>[] }) => updateSel(e.selected?.[0]));
      canvas.on('selection:updated', (e: { selected: NonNullable<typeof fabricRef.current>[] }) => updateSel(e.selected?.[0]));
      canvas.on('selection:cleared', () => setSelected({ type: 'none' }));
    });

    return () => {
      canvas?.dispose();
      fabricRef.current = null;
    };
  }, []);

  // Save current slide state and load new one
  const switchSlide = useCallback(async (newIndex: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Save current
    const newStates = [...slideStatesRef.current];
    newStates[currentSlideRef.current] = canvas.toJSON();
    slideStatesRef.current = newStates;
    onSlideStatesChange(newStates);

    // Load new
    await canvas.loadFromJSON(newStates[newIndex]);
    canvas.renderAll();
    setCurrentSlide(newIndex);
    setSelected({ type: 'none' });
  }, [onSlideStatesChange]);

  const saveCurrent = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const newStates = [...slideStatesRef.current];
    newStates[currentSlideRef.current] = canvas.toJSON();
    slideStatesRef.current = newStates;
    onSlideStatesChange(newStates);
  }, [onSlideStatesChange]);

  // Toolbar callbacks
  const addText = useCallback(() => {
    import('fabric').then(({ IText }) => {
      const t = new IText('Double-click to edit', {
        left: 80, top: 200, fontSize: 24,
        fill: template.titleColor, fontFamily: template.fontFamily,
      });
      fabricRef.current?.add(t);
      fabricRef.current?.setActiveObject(t);
      fabricRef.current?.renderAll();
    });
  }, [template]);

  const addImage = useCallback((dataUrl: string) => {
    import('fabric').then(({ FabricImage }) => {
      FabricImage.fromURL(dataUrl).then((img: NonNullable<typeof fabricRef.current>) => {
        const scale = Math.min(400 / img.width, 400 / img.height);
        img.set({ left: 70, top: 70, scaleX: scale, scaleY: scale });
        fabricRef.current?.add(img);
        fabricRef.current?.setActiveObject(img);
        fabricRef.current?.renderAll();
      });
    });
  }, []);

  const deleteSelected = useCallback(() => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return;
    fabricRef.current?.remove(obj);
    fabricRef.current?.renderAll();
  }, []);

  const bringForward = useCallback(() => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return;
    fabricRef.current?.bringObjectForward(obj);
    fabricRef.current?.renderAll();
  }, []);

  const sendBackward = useCallback(() => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return;
    fabricRef.current?.sendObjectBackwards(obj);
    fabricRef.current?.renderAll();
  }, []);

  const setFontFamily = useCallback((font: string) => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return;
    obj.set('fontFamily', font);
    fabricRef.current?.renderAll();
    setSelected((s) => ({ ...s, fontFamily: font }));
  }, []);

  const setFontSize = useCallback((size: number) => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return;
    obj.set('fontSize', size);
    fabricRef.current?.renderAll();
    setSelected((s) => ({ ...s, fontSize: size }));
  }, []);

  const setFill = useCallback((color: string) => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return;
    obj.set('fill', color);
    fabricRef.current?.renderAll();
    setSelected((s) => ({ ...s, fill: color }));
  }, []);

  const toggleBold = useCallback(() => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return;
    const isBold = obj.fontWeight === 'bold';
    obj.set('fontWeight', isBold ? 'normal' : 'bold');
    fabricRef.current?.renderAll();
    setSelected((s) => ({ ...s, bold: !isBold }));
  }, []);

  const toggleItalic = useCallback(() => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return;
    const isItalic = obj.fontStyle === 'italic';
    obj.set('fontStyle', isItalic ? 'normal' : 'italic');
    fabricRef.current?.renderAll();
    setSelected((s) => ({ ...s, italic: !isItalic }));
  }, []);

  const setBgColor = useCallback((color: string) => {
    import('fabric').then(({ Rect }) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const objs = canvas.getObjects();
      const bg = objs.find((o: { data?: { role?: string } }) => o.data?.role === 'bg');
      if (bg) {
        bg.set('fill', color);
        canvas.renderAll();
      } else {
        const rect = new Rect({ left: 0, top: 0, width: 540, height: 540, fill: color, selectable: false, evented: false, data: { role: 'bg' } });
        canvas.add(rect);
        canvas.sendObjectToBack(rect);
        canvas.renderAll();
      }
    });
  }, []);

  const setBgPhoto = useCallback((url: string) => {
    import('fabric').then(({ FabricImage }) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      FabricImage.fromURL(url, { crossOrigin: 'anonymous' }).then((img: NonNullable<typeof fabricRef.current>) => {
        const scale = Math.max(540 / img.width, 540 / img.height);
        img.set({ left: 0, top: 0, scaleX: scale, scaleY: scale, selectable: false, evented: false, data: { role: 'pexels-bg' } });
        // Remove existing pexels bg
        const existing = canvas.getObjects().find((o: { data?: { role?: string } }) => o.data?.role === 'pexels-bg');
        if (existing) canvas.remove(existing);
        canvas.add(img);
        canvas.sendObjectToBack(img);
        canvas.renderAll();
      });
    });
  }, []);

  // Show phone frame preview for current slide
  const openPhonePreview = useCallback(() => {
    saveCurrent();
    const canvas = fabricRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL({ format: 'jpeg', quality: 0.9, multiplier: 1 });
    setPreviewDataUrl(url);
    setShowPhoneModal(true);
  }, [saveCurrent]);

  // Export all slides
  const handleExport = useCallback(async () => {
    saveCurrent();
    setIsExporting(true);

    try {
      const { Canvas } = await import('fabric');
      const tempEl = document.createElement('canvas');
      const c = new Canvas(tempEl, { width: 540, height: 540 });
      const dataUrls: string[] = [];

      const states = slideStatesRef.current;
      for (const state of states) {
        await c.loadFromJSON(state);
        c.renderAll();
        dataUrls.push(c.toDataURL({ format: 'jpeg', quality: 0.95, multiplier: 2 }));
      }
      c.dispose();
      onExportReady(dataUrls);
    } finally {
      setIsExporting(false);
    }
  }, [saveCurrent, onExportReady]);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Slide strip - left column */}
      <div className="w-28 flex-shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col overflow-y-auto py-3 gap-2">
        {slideStates.map((_, i) => (
          <button
            key={i}
            onClick={() => switchSlide(i)}
            className={`mx-2 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
              i === currentSlide ? 'border-purple-400' : 'border-zinc-700 hover:border-zinc-500'
            }`}
          >
            <div
              className="aspect-square w-full flex items-end p-1.5"
              style={{ background: `linear-gradient(135deg, ${template.gradientFrom}, ${template.gradientTo})` }}
            >
              <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ color: template.accentColor, background: 'rgba(0,0,0,0.4)' }}>
                {i + 1}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 flex-shrink-0">
          <span className="text-xs text-zinc-400">
            Slide {currentSlide + 1} / {slideStates.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={openPhonePreview}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-white transition-colors"
            >
              <Smartphone size={13} /> Preview
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-xs text-white transition-colors"
            >
              {isExporting ? <Loader size={13} className="animate-spin" /> : <ArrowRight size={13} />}
              {isExporting ? 'Preparing…' : 'Export'}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-6">
          <div className="shadow-2xl rounded-sm overflow-hidden flex-shrink-0" style={{ width: 540, height: 540 }}>
            <canvas ref={canvasEl} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <EditorToolbar
        selected={selected}
        onAddText={addText}
        onAddImage={addImage}
        onDelete={deleteSelected}
        onBringForward={bringForward}
        onSendBackward={sendBackward}
        onSetFontFamily={setFontFamily}
        onSetFontSize={setFontSize}
        onSetFill={setFill}
        onToggleBold={toggleBold}
        onToggleItalic={toggleItalic}
        onSetBgColor={setBgColor}
        onSetBgPhoto={setBgPhoto}
      />

      {/* Phone preview modal */}
      {showPhoneModal && (
        <div
          className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setShowPhoneModal(false)}
        >
          <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center gap-4">
            <div className="relative bg-black rounded-[36px] border-[6px] border-zinc-700 shadow-2xl overflow-hidden" style={{ width: 320, height: 620 }}>
              {/* Status bar */}
              <div className="flex justify-between items-center px-5 pt-2 pb-1 bg-black text-white text-[10px]">
                <span className="font-semibold">9:41</span>
                <span>100%</span>
              </div>
              {/* IG header */}
              <div className="bg-black text-white px-4 py-2 border-b border-zinc-800">
                <span className="font-bold text-[15px] italic">Instagram</span>
              </div>
              {/* Profile */}
              <div className="bg-black text-white px-3 py-2 flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 ring-2 ring-offset-1 ring-offset-black ring-pink-500" />
                <span className="text-xs font-semibold flex-1">creator_studio</span>
                <span className="text-xs text-blue-400 font-semibold">Follow</span>
              </div>
              {/* Slide */}
              <div style={{ width: 308, height: 308 }} className="bg-zinc-900">
                {previewDataUrl && <img src={previewDataUrl} alt="Preview" className="w-full h-full object-cover" />}
              </div>
              {/* Actions */}
              <div className="bg-black text-white px-3 py-2 text-xs">❤️ 💬 ➤ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 🔖</div>
              <div className="bg-black text-white px-3 py-1">
                <p className="text-xs font-semibold">1,234 likes</p>
                <p className="text-xs"><span className="font-semibold">creator_studio</span> <span className="text-zinc-400">{carouselTitle}</span></p>
              </div>
            </div>
            <button onClick={() => setShowPhoneModal(false)} className="px-4 py-2 bg-zinc-800 rounded-lg text-sm text-white hover:bg-zinc-700">
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
