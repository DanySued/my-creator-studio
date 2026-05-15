'use client';

import { CAROUSEL_TEMPLATES, CarouselTemplate } from '@/lib/carouselTemplates';
import { Check } from 'lucide-react';

interface Props {
  selected: CarouselTemplate | null;
  onSelect: (template: CarouselTemplate) => void;
}

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: CarouselTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group relative rounded-2xl overflow-hidden text-left focus:outline-none transition-all duration-200 ${
        selected
          ? 'ring-2 ring-purple-500 shadow-xl shadow-purple-900/30 scale-[1.02]'
          : 'ring-1 ring-zinc-800 hover:ring-zinc-600 hover:shadow-lg hover:shadow-black/30 hover:scale-[1.01]'
      }`}
    >
      {/* Slide preview */}
      <div
        className="aspect-square w-full flex flex-col justify-between p-5 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${template.gradientFrom}, ${template.gradientTo})`,
          fontFamily: template.fontFamily,
        }}
      >
        {/* Shine overlay on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

        {/* Slide number */}
        <span className="text-xs font-bold" style={{ color: template.accentColor }}>
          01
        </span>

        {/* Content preview */}
        <div className="space-y-2">
          <div
            className="text-sm font-bold leading-tight"
            style={{ color: template.titleColor }}
          >
            Your Title Here
          </div>
          <div
            className="text-[11px] leading-snug opacity-75 line-clamp-3"
            style={{ color: template.contentColor }}
          >
            Your content will appear here after Gemini processes your document.
          </div>
        </div>

        {/* Footer */}
        <div className="text-[10px] font-semibold" style={{ color: template.accentColor }}>
          ● Creator Studio
        </div>
      </div>

      {/* Name row */}
      <div className="bg-zinc-900 px-4 py-3 flex items-center justify-between border-t border-zinc-800">
        <div>
          <p className="text-sm font-semibold text-white">{template.name}</p>
          <p className="text-xs text-zinc-500 mt-0.5">{template.description}</p>
        </div>
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${
            selected
              ? 'bg-purple-500 scale-100'
              : 'bg-zinc-800 scale-75 opacity-0 group-hover:opacity-40 group-hover:scale-90'
          }`}
        >
          <Check size={11} className="text-white" />
        </div>
      </div>
    </button>
  );
}

export function TemplateGallery({ selected, onSelect }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-1">Choose a Template</h2>
        <p className="text-zinc-500 text-sm">
          Pick a visual style. You can customise fonts, colours, and text in the editor.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1 pb-4">
        {CAROUSEL_TEMPLATES.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            selected={selected?.id === t.id}
            onSelect={() => onSelect(t)}
          />
        ))}
      </div>
    </div>
  );
}
