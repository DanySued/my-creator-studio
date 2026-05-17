'use client'

import { CAROUSEL_THEMES } from '@/lib/carouselThemes'

interface ThemePickerProps {
  selected: string
  onChange: (id: string) => void
}

export function ThemePicker({ selected, onChange }: ThemePickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {CAROUSEL_THEMES.map((theme) => (
        <button
          key={theme.id}
          onClick={() => onChange(theme.id)}
          title={theme.name}
          className="group flex flex-col items-center gap-1"
        >
          <div
            style={{
              background: `linear-gradient(180deg, ${theme.bgFrom}, ${theme.bgTo})`,
              aspectRatio: '1080/1350',
              borderRadius: 6,
              border: selected === theme.id
                ? `2.5px solid ${theme.accent}`
                : '2.5px solid transparent',
              boxShadow: selected === theme.id
                ? `0 0 0 1px ${theme.accent}40`
                : 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              width: '100%',
            }}
          />
          <span
            className="text-[9px] transition-colors"
            style={{ color: selected === theme.id ? theme.accent : '#71717a' }}
          >
            {theme.name}
          </span>
        </button>
      ))}
    </div>
  )
}
