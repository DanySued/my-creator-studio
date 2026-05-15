'use client';

import { CAROUSEL_TEMPLATES, CarouselTemplate } from '@/lib/carouselTemplates';
import { Check } from 'lucide-react';

interface Props {
  selected: CarouselTemplate | null;
  onSelect: (template: CarouselTemplate) => void;
}

function TemplateCard({ template, selected, onSelect }: {
  template: CarouselTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`group relative rounded-2xl overflow-hidden border-2 transition-all duration-200 text-left focus:outline-none ${
        selected ? 'border-purple-400 shadow-lg shadow-purple-500/20 scale-[1.02]' : 'border-zinc-700 hover:border-zinc-500'
      }`}
    >
      {/* Mini slide preview */}
      <div
        className="aspect-square w-full flex flex-col justify-between p-4"
        style={{
          background: `linear-gradient(135deg, ${template.gradientFrom}, ${template.gradientTo})`,
          fontFamily: template.fontFamily,
        }}
      >
        {/* Slide number */}
        <span className="text-xs font-bold" style={{ color: template.accentColor }}>01</span>

        {/* Content preview */}
        <div className="space-y-2">
          <div
            className="text-sm font-bold leading-tight"
            style={{ color: template.titleColor }}
          >
            Your Title Here
          </div>
          <div
            className="text-xs leading-snug opacity-80 line-clamp-3"
            style={{ color: template.contentColor }}
          >
            Your content will appear here after Gemini processes your document.
          </div>
        </div>

        {/* Branding footer */}
        <div className="text-[10px] font-semibold" style={{ color: template.accentColor }}>
          ● Creator Studio
        </div>
      </div>

      {/* Template name */}
      <div className="bg-zinc-900 px-3 py-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{template.name}</p>
          <p className="text-xs text-zinc-400">{template.description}</p>
        </div>
        {selected && (
          <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
            <Check size={12} className="text-white" />
          </div>
        )}
      </div>
    </button>
  );
}

export function TemplateGallery({ selected, onSelect }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-1">Choose a Template</h2>
        <p className="text-zinc-400 text-sm">Pick a style for your Instagram carousel. You can customize everything later.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1 overflow-y-auto pb-4">
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
