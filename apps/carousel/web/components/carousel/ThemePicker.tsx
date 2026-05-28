'use client'

import { CAROUSEL_THEMES, CarouselTheme } from '@/lib/carouselThemes'
import { SlideCard, Slide } from '@/components/carousel/SlideCard'

interface ThemePickerProps {
  selected: string
  onChange: (id: string) => void
}

// Static placeholder slides shown inside each theme card preview
const PREVIEW_COVER: Slide = {
  id: 'preview-cover',
  type: 'cover',
  numberLabel: '01',
  title: 'Your Story',
  body: 'A tagline that hooks.',
}
const PREVIEW_CONTENT: Slide = {
  id: 'preview-content',
  type: 'content',
  numberLabel: '02',
  title: 'Key Point',
  body: 'Supporting insight that makes your point clear and memorable.',
}
const PREVIEW_CTA: Slide = {
  id: 'preview-cta',
  type: 'cta',
  numberLabel: '03',
  title: 'Follow for more',
  body: '',
}

const MINI_SCALE = 0.042  // 3 slides × 1080 × 0.042 ≈ 136px, fits a ~146px column

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: CarouselTheme
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="flex flex-col items-center gap-1.5 group focus:outline-none"
    >
      {/* 3-slide mini carousel preview */}
      <div
        className="flex overflow-hidden transition-all duration-150"
        style={{
          borderRadius: 6,
          outline: selected
            ? `2px solid ${theme.accent}`
            : '2px solid transparent',
          boxShadow: selected
            ? `0 0 0 1px ${theme.accent}50`
            : '0 0 0 1px rgba(255,255,255,0.06)',
          gap: 1,
        }}
      >
        <SlideCard slide={PREVIEW_COVER} theme={theme} scale={MINI_SCALE} />
        <SlideCard slide={PREVIEW_CONTENT} theme={theme} scale={MINI_SCALE} />
        <SlideCard slide={PREVIEW_CTA} theme={theme} scale={MINI_SCALE} />
      </div>

      {/* Theme name */}
      <span
        className="text-[9px] font-medium transition-colors"
        style={{ color: selected ? theme.accent : '#71717a' }}
      >
        {theme.name}
      </span>
    </button>
  )
}

export function ThemePicker({ selected, onChange }: ThemePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {CAROUSEL_THEMES.map((theme) => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          selected={selected === theme.id}
          onSelect={() => onChange(theme.id)}
        />
      ))}
    </div>
  )
}
