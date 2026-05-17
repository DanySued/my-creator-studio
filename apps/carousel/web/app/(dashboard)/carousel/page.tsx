'use client';

import { useState, useRef } from 'react';
import { Loader2, Download, Plus, Trash2, GripVertical, Pencil } from 'lucide-react';
import { SlideCard, Slide, SlideType } from '@/components/carousel/SlideCard';
import { ThemePicker } from '@/components/carousel/ThemePicker';
import { SlideEditModal } from '@/components/carousel/SlideEditModal';
import { getTheme } from '@/lib/carouselThemes';

const toLabel = (n: number) => String(n).padStart(2, '0');

export default function CarouselPage() {
  const [rawText, setRawText] = useState('');
  const [themeId, setThemeId] = useState('midnight');
  const [handle, setHandle] = useState('');
  const [slideCount, setSlideCount] = useState<number | null>(null);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const dragOverIdx = useRef<number | null>(null);
  const theme = getTheme(themeId);

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
        body: JSON.stringify({
          rawText: text,
          theme: themeId,
          handle,
          slideCount: slideCount,
        }),
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
          slides: slides.map((s) => ({
            type: s.type,
            number_label: s.numberLabel,
            title: s.title,
            body: s.body,
          })),
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
    setSlides((prev) => {
      const next = prev.filter((s) => s.id !== id);
      return next.map((s, i) => ({ ...s, numberLabel: toLabel(i + 1) }));
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
    setSlides((prev) => [
      ...prev.slice(0, -1),
      newSlide,
      ...prev.slice(-1),
    ]);
    setEditingSlide(newSlide);
  };

  // Drag-to-reorder
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
    <div className="flex h-full bg-zinc-950 overflow-hidden">
      {/* ─── Left sidebar ─────────────────────────────────────── */}
      <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-zinc-800 overflow-y-auto">
        <div className="p-5 space-y-5">
          <div>
            <h2 className="text-white font-semibold text-sm">Carousel Creator</h2>
            <p className="text-zinc-500 text-[11px] mt-0.5">Paste text → AI formats slides → download PNG</p>
          </div>

          {/* Text input */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Your text <span className="text-zinc-600">⌘↵ to generate</span>
            </label>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={9}
              placeholder="Paste an article, bullet list, Twitter thread, or any text…"
              className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
            />
          </div>

          {/* Handle */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Handle</label>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@yourhandle"
              className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
            />
          </div>

          {/* Slide count */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Slides <span className="text-zinc-600">(blank = auto)</span>
            </label>
            <input
              type="number"
              min={3}
              max={15}
              value={slideCount ?? ''}
              onChange={(e) => setSlideCount(e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Auto"
              className="w-full bg-zinc-900 border border-zinc-700/60 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-zinc-500 transition-colors placeholder:text-zinc-600"
            />
          </div>

          {/* Theme picker */}
          <div>
            <label className="block text-xs text-zinc-400 mb-2">Theme</label>
            <ThemePicker selected={themeId} onChange={setThemeId} />
          </div>

          {error && (
            <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !rawText.trim()}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            ) : (
              'Generate Slides'
            )}
          </button>
        </div>
      </div>

      {/* ─── Right: slide grid ────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        {slides.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-zinc-600 select-none">
              <div className="text-4xl mb-3 opacity-40">✦</div>
              <p className="text-sm">Paste your text and click Generate Slides</p>
              <p className="text-xs mt-1 text-zinc-700">or press ⌘↵</p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            {/* Action bar */}
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs text-zinc-500">{slides.length} slides</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddSlide}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add slide
                </button>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-lg transition-colors font-medium"
                >
                  {isDownloading ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Rendering…</>
                  ) : (
                    <><Download className="w-3.5 h-3.5" /> Download ZIP</>
                  )}
                </button>
              </div>
            </div>

            {/* Slide grid */}
            <div className="flex flex-wrap gap-4">
              {slides.map((slide, idx) => (
                <div
                  key={slide.id}
                  className="group relative cursor-pointer"
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={handleDrop}
                  onDragEnd={() => setDragIdx(null)}
                  onClick={() => setEditingSlide(slide)}
                  style={{ opacity: dragIdx === idx ? 0.35 : 1, transition: 'opacity 0.15s' }}
                >
                  <SlideCard slide={slide} theme={theme} handle={handle} scale={0.25} />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none" />

                  {/* Edit icon (center on hover) */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-black/60 rounded-full p-2">
                      <Pencil className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(slide.id); }}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-500/80 hover:bg-red-500 rounded-md pointer-events-auto"
                  >
                    <Trash2 className="w-2.5 h-2.5 text-white" />
                  </button>

                  {/* Drag handle */}
                  <div className="absolute top-1.5 left-1.5 opacity-0 group-hover:opacity-50 pointer-events-none">
                    <GripVertical className="w-3 h-3 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <SlideEditModal
        slide={editingSlide}
        onSave={handleSaveEdit}
        onClose={() => setEditingSlide(null)}
      />
    </div>
  );
}
