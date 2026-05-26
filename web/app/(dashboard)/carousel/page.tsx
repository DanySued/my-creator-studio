'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, Download, Plus, Trash2, GripVertical, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { SlideCard, Slide, SlideType } from '@/components/carousel/SlideCard';
import { ThemePicker } from '@/components/carousel/ThemePicker';
import { SlideEditModal } from '@/components/carousel/SlideEditModal';
import { getTheme } from '@/lib/carouselThemes';

const toLabel = (n: number) => String(n).padStart(2, '0');

export default function CarouselPage() {
  const [rawText, setRawText] = useState('');
  const [themeId, setThemeId] = useState('thread');
  const [handle, setHandle] = useState('');
  const [slideCount, setSlideCount] = useState<number | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const dragOverIdx = useRef<number | null>(null);
  const theme = getTheme(themeId);

  // Auto-save draft to localStorage
  useEffect(() => {
    if (slides.length > 0) {
      const draft = { slides, themeId, handle, rawText, savedAt: Date.now() };
      localStorage.setItem('carousel_draft', JSON.stringify(draft));
    }
  }, [slides, themeId, handle, rawText]);

  // Load draft on mount (and check for template from templates page)
  useEffect(() => {
    try {
      // Check for template first
      const tplRaw = localStorage.getItem('carousel_template');
      if (tplRaw) {
        localStorage.removeItem('carousel_template');
        const tpl = JSON.parse(tplRaw);
        if (tpl.slides?.length > 0) {
          toast('Template loaded', { description: 'Customize the slides and download.' });
          setSlides(tpl.slides);
          if (tpl.themeId) setThemeId(tpl.themeId);
          return;
        }
      }

      const raw = localStorage.getItem('carousel_draft');
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.slides?.length > 0) {
        toast('Draft restored', { description: 'Your last carousel was loaded from your browser.' });
        setSlides(draft.slides);
        if (draft.themeId) setThemeId(draft.themeId);
        if (draft.handle) setHandle(draft.handle);
        if (draft.rawText) setRawText(draft.rawText);
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerate = async () => {
    const text = rawText.trim();
    if (!text || text.length < 20) {
      setError('Please paste at least 20 characters of text.');
      return;
    }
    setError(null);
    setIsGenerating(true);
    try {
      const res = await fetch('/api/carousel/from-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: text, theme: themeId, handle, slideCount }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }
      const data = await res.json();
      const mapped: Slide[] = data.slides.map(
        (s: { type: string; number_label: string; title: string; body: string }, i: number) => ({
          id: `slide-${i}-${Date.now()}`,
          type: s.type as SlideType,
          numberLabel: s.number_label,
          title: s.title,
          body: s.body,
        })
      );
      setSlides(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!slides.length) return;
    setIsDownloading(true);
    setError(null);
    try {
      const res = await fetch('/api/carousel/render-png', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slides: slides.map((s) => ({ type: s.type, number_label: s.numberLabel, title: s.title, body: s.body })),
          theme: themeId,
          handle,
        }),
      });
      if (!res.ok) throw new Error('Render failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'carousel.zip';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Carousel downloaded!', { description: `${slides.length} slides saved as ZIP` });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSaveEdit = (updated: Slide) => {
    setSlides((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleDelete = (id: string) => {
    const slide = slides.find((s) => s.id === id);
    if (!slide) return;
    const idx = slides.findIndex((s) => s.id === id);
    setSlides((prev) => {
      const next = prev.filter((s) => s.id !== id);
      return next.map((s, i) => ({ ...s, numberLabel: toLabel(i + 1) }));
    });
    toast('Slide deleted', {
      action: {
        label: 'Undo',
        onClick: () => {
          setSlides((prev) => {
            const next = [...prev];
            next.splice(idx, 0, slide);
            return next.map((s, i) => ({ ...s, numberLabel: toLabel(i + 1) }));
          });
        },
      },
      duration: 4000,
    });
  };

  const handleAddSlide = () => {
    const newSlide: Slide = {
      id: `slide-new-${Date.now()}`,
      type: 'content',
      numberLabel: toLabel(slides.length + 1),
      title: 'New Slide',
      body: '',
    };
    setSlides((prev) => [...prev.slice(0, -1), newSlide, ...prev.slice(-1)]);
    setEditingSlide(newSlide);
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverIdx.current = idx;
  };
  const handleDrop = () => {
    if (dragIdx === null || dragOverIdx.current === null || dragIdx === dragOverIdx.current) {
      setDragIdx(null);
      return;
    }
    setSlides((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(dragOverIdx.current!, 0, moved);
      return next.map((s, i) => ({ ...s, numberLabel: toLabel(i + 1) }));
    });
    setDragIdx(null);
    dragOverIdx.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="flex h-full bg-background overflow-hidden relative">
      {/* ─── Left sidebar ─── */}
      <motion.div
        animate={{ width: sidebarOpen ? 340 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="flex-shrink-0 flex flex-col border-r border-border overflow-hidden relative"
      >
        <div className="flex flex-col h-full overflow-hidden w-[340px]">
          {/* Scrollable top */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div>
              <h2 className="text-foreground font-semibold text-sm">Carousel Creator</h2>
              <p className="text-muted-foreground text-[11px] mt-0.5">Paste text → AI formats slides → download PNG</p>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                Your text <span className="text-muted-foreground/50">⌘↵ to generate</span>
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={9}
                placeholder="Paste an article, bullet list, Twitter thread, or any text…"
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-foreground text-sm resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors placeholder:text-muted-foreground/40"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Handle</label>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="@yourhandle"
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors placeholder:text-muted-foreground/40"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">
                Slides <span className="text-muted-foreground/50">(blank = auto)</span>
              </label>
              <input
                type="number"
                min={3}
                max={15}
                value={slideCount ?? ''}
                onChange={(e) => setSlideCount(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Auto"
                className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-foreground text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors placeholder:text-muted-foreground/40"
              />
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-2">Theme</label>
              <ThemePicker selected={themeId} onChange={setThemeId} />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 overflow-hidden"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sticky bottom — generate button */}
          <div className="p-4 border-t border-border shrink-0">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleGenerate}
              disabled={isGenerating || !rawText.trim()}
              className="w-full py-2.5 bg-primary hover:brightness-110 disabled:bg-secondary disabled:text-muted-foreground text-primary-foreground text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
              ) : (
                'Generate Slides'
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Toggle arrow button — sits at the sidebar border edge */}
      <button
        onClick={() => setSidebarOpen(v => !v)}
        className="absolute top-1/2 -translate-y-1/2 z-20 w-5 h-10 flex items-center justify-center bg-card border border-border rounded-r-md text-muted-foreground hover:text-foreground transition-colors"
        style={{ left: sidebarOpen ? 340 : 0, transition: 'left 0.3s' }}
      >
        {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* ─── Right: slide grid ─── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {slides.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="h-full flex items-center justify-center"
            >
              <div className="text-center text-muted-foreground/40 select-none">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
                  className="text-4xl mb-3 opacity-40"
                >
                  ✦
                </motion.div>
                <p className="text-sm">Paste your text and click Generate Slides</p>
                <p className="text-xs mt-1 text-muted-foreground/30">or press ⌘↵</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6"
            >
              {/* Action bar */}
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-between mb-5"
              >
                <span className="text-xs text-muted-foreground">{slides.length} slides</span>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAddSlide}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-border/80 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add slide
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-primary-foreground bg-primary hover:brightness-110 disabled:bg-secondary disabled:text-muted-foreground rounded-lg transition-all font-medium"
                  >
                    {isDownloading ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering…</>
                    ) : (
                      <><Download className="w-3.5 h-3.5" /> Download ZIP</>
                    )}
                  </motion.button>
                </div>
              </motion.div>

              {/* Slide grid with theme crossfade */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={themeId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex flex-wrap gap-4"
                >
                  <AnimatePresence>
                    {slides.map((slide, idx) => (
                      <motion.div
                        key={slide.id}
                        layout
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{
                          opacity: dragIdx === idx ? 0.3 : 1,
                          scale: dragIdx === idx ? 0.96 : 1,
                        }}
                        exit={{ opacity: 0, scale: 0.88 }}
                        transition={{ duration: 0.2, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
                        className="group relative cursor-pointer"
                        draggable
                        onDragStart={() => handleDragStart(idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDrop={handleDrop}
                        onDragEnd={() => setDragIdx(null)}
                        onClick={() => setEditingSlide(slide)}
                        whileHover={{ y: -3 }}
                      >
                        <SlideCard slide={slide} theme={theme} handle={handle} scale={0.25} />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />

                        {/* Edit icon */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="bg-black/60 rounded-full p-2">
                            <Pencil className="w-4 h-4 text-white" />
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(slide.id); }}
                          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-destructive/80 hover:bg-destructive rounded-md pointer-events-auto"
                        >
                          <Trash2 className="w-2.5 h-2.5 text-white" />
                        </button>

                        {/* Drag handle */}
                        <div className="absolute top-1.5 left-1.5 opacity-[0.15] group-hover:opacity-60 pointer-events-none">
                          <GripVertical className="w-3 h-3 text-white" />
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <SlideEditModal
        slide={editingSlide}
        onSave={handleSaveEdit}
        onClose={() => setEditingSlide(null)}
      />
    </div>
  );
}
