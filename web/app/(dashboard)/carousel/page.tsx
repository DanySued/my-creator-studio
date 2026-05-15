'use client';

import { useState } from 'react';
import { CarouselTemplate } from '@/lib/carouselTemplates';
import { TemplateGallery } from '@/components/carousel/TemplateGallery';
import { CarouselSetup, SetupConfig } from '@/components/carousel/CarouselSetup';
import { SlideEditor } from '@/components/carousel/SlideEditor';
import { CarouselExport } from '@/components/carousel/CarouselExport';
import { ChevronRight } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

const STEP_LABELS = ['Template', 'Setup', 'Edit', 'Export'];

async function buildSlideStates(template: CarouselTemplate, slides: { title: string; content: string }[], carouselTitle: string): Promise<object[]> {
  const { Canvas, Rect, Textbox, IText, Gradient } = await import('fabric');

  const tempEl = document.createElement('canvas');
  const c = new Canvas(tempEl, { width: 540, height: 540, renderOnAddRemove: false });
  const states: object[] = [];

  for (let i = 0; i < slides.length; i++) {
    c.clear();

    // Background gradient
    const bg = new Rect({
      left: 0, top: 0, width: 540, height: 540,
      fill: new Gradient({
        type: 'linear',
        gradientUnits: 'pixels',
        coords: { x1: 0, y1: 0, x2: 540, y2: 540 },
        colorStops: [
          { offset: 0, color: template.gradientFrom },
          { offset: 1, color: template.gradientTo },
        ],
      }),
      selectable: false, evented: false,
      data: { role: 'bg' },
    });
    c.add(bg);

    // Slide number
    const num = new IText(String(i + 1).padStart(2, '0'), {
      left: 40, top: 40,
      fontSize: 20, fontWeight: 'bold',
      fill: template.accentColor,
      fontFamily: template.fontFamily,
    });
    c.add(num);

    // Total indicator
    const total = new IText(`/ ${slides.length}`, {
      left: 74, top: 48,
      fontSize: 13,
      fill: template.contentColor,
      fontFamily: template.fontFamily,
    });
    c.add(total);

    // Title
    const titleText = new Textbox(slides[i].title, {
      left: 40, top: 110, width: 460,
      fontSize: 34, fontWeight: 'bold',
      fill: template.titleColor,
      fontFamily: template.fontFamily,
      lineHeight: 1.2,
    });
    c.add(titleText);

    // Content
    const contentText = new Textbox(slides[i].content, {
      left: 40, top: 260, width: 460,
      fontSize: 18,
      fill: template.contentColor,
      fontFamily: template.fontFamily,
      lineHeight: 1.6,
    });
    c.add(contentText);

    // Branding / title footer
    const brand = new IText(carouselTitle, {
      left: 40, top: 490,
      fontSize: 14,
      fill: template.accentColor,
      fontFamily: template.fontFamily,
    });
    c.add(brand);

    c.renderAll();
    states.push(c.toJSON());
  }

  c.dispose();
  return states;
}

export default function CarouselPage() {
  const [step, setStep] = useState<Step>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<CarouselTemplate | null>(null);
  const [setupConfig, setSetupConfig] = useState<SetupConfig | null>(null);
  const [slideStates, setSlideStates] = useState<object[]>([]);
  const [exportDataUrls, setExportDataUrls] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const handleGenerate = async (config: SetupConfig) => {
    setGenerateError(null);
    setIsGenerating(true);
    try {
      const res = await fetch('/api/carousel/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: config.content,
          slideCount: config.slideCount,
          tone: config.tone,
          title: config.title,
          theme: selectedTemplate?.id ?? 'midnight',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Generation failed');
      }

      const data = await res.json();
      const slides: { title: string; content: string }[] = data.slides;

      setSetupConfig(config);
      const states = await buildSlideStates(selectedTemplate!, slides, config.title);
      setSlideStates(states);
      setStep(3);
    } catch (e) {
      setGenerateError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Step indicator */}
      <div className="flex-shrink-0 flex items-center gap-0 px-6 py-3 border-b border-zinc-800 bg-zinc-900">
        {STEP_LABELS.map((label, i) => {
          const s = (i + 1) as Step;
          const active = step === s;
          const done = step > s;
          return (
            <div key={s} className="flex items-center">
              <button
                onClick={() => done && setStep(s)}
                disabled={!done}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  active ? 'text-white bg-zinc-700' :
                  done ? 'text-zinc-300 hover:text-white cursor-pointer' :
                  'text-zinc-600 cursor-default'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  active ? 'bg-purple-500 text-white' :
                  done ? 'bg-emerald-600 text-white' :
                  'bg-zinc-700 text-zinc-500'
                }`}>
                  {done ? '✓' : s}
                </span>
                {label}
              </button>
              {i < STEP_LABELS.length - 1 && <ChevronRight size={14} className="text-zinc-700 mx-1" />}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Step 1 — Template */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto p-8 flex flex-col">
            <TemplateGallery selected={selectedTemplate} onSelect={setSelectedTemplate} />
            <div className="flex justify-end mt-6 pt-4 border-t border-zinc-800 flex-shrink-0">
              <button
                onClick={() => setStep(2)}
                disabled={!selectedTemplate}
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors"
              >
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Setup */}
        {step === 2 && (
          <div className="flex-1 overflow-y-auto p-8">
            {generateError && (
              <div className="max-w-2xl mx-auto mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {generateError}
              </div>
            )}
            <CarouselSetup onGenerate={handleGenerate} isGenerating={isGenerating} />
          </div>
        )}

        {/* Step 3 — Editor */}
        {step === 3 && slideStates.length > 0 && (
          <div className="flex-1 overflow-hidden relative">
            <SlideEditor
              template={selectedTemplate!}
              slideStates={slideStates}
              carouselTitle={setupConfig?.title ?? 'My Carousel'}
              onSlideStatesChange={setSlideStates}
              onExportReady={(urls) => {
                setExportDataUrls(urls);
                setStep(4);
              }}
            />
          </div>
        )}

        {/* Step 4 — Export */}
        {step === 4 && (
          <div className="flex-1 overflow-y-auto p-8">
            <CarouselExport
              exportDataUrls={exportDataUrls}
              title={setupConfig?.title ?? 'carousel'}
              onBack={() => setStep(3)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
