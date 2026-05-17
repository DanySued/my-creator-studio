'use client'

import { CarouselTheme } from '@/lib/carouselThemes'

export type SlideType = 'cover' | 'content' | 'cta'

export interface Slide {
  id: string
  type: SlideType
  numberLabel: string
  title: string
  body: string
}

interface SlideCardProps {
  slide: Slide
  theme: CarouselTheme
  handle?: string
  scale?: number
}

export function SlideCard({ slide, theme, handle, scale = 0.25 }: SlideCardProps) {
  const W = 1080
  const H = 1350
  const w = W * scale
  const h = H * scale
  const pad = 108 * scale

  const isCover = slide.type === 'cover'
  const isCta = slide.type === 'cta'

  const titleTop = isCover ? h * 0.30 : isCta ? h * 0.38 : h * 0.22
  const titleSize = isCover ? 44 * scale : isCta ? 34 * scale : 28 * scale
  const bodyTop = isCover ? h * 0.75 : h * 0.60
  const sepTop = isCover ? h * 0.59 : h * 0.50

  return (
    <div
      style={{
        width: w,
        height: h,
        background: `linear-gradient(180deg, ${theme.bgFrom} 0%, ${theme.bgTo} 100%)`,
        position: 'relative',
        borderRadius: 8 * scale,
        overflow: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
        fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
      }}
    >
      {/* Number label */}
      {!isCta && (
        <div style={{
          position: 'absolute',
          top: pad * 0.45,
          left: pad * 0.5,
          fontSize: 11 * scale,
          color: theme.accent,
          fontWeight: 700,
          letterSpacing: '0.06em',
          opacity: 0.9,
        }}>
          {slide.numberLabel}
        </div>
      )}

      {/* Handle */}
      {handle && (
        <div style={{
          position: 'absolute',
          top: pad * 0.45,
          right: pad * 0.5,
          fontSize: 10 * scale,
          color: theme.accent,
          opacity: 0.8,
        }}>
          {handle}
        </div>
      )}

      {/* Title */}
      <div style={{
        position: 'absolute',
        left: pad,
        right: pad,
        top: titleTop,
        fontSize: titleSize,
        fontWeight: 700,
        color: theme.titleColor,
        lineHeight: 1.2,
        wordBreak: 'break-word',
      }}>
        {slide.title}
      </div>

      {/* Accent separator */}
      {(!isCover && !isCta || isCover) && (
        <div style={{
          position: 'absolute',
          left: pad,
          top: sepTop,
          width: 64 * scale,
          height: 2.5 * scale,
          background: theme.accent,
          borderRadius: 2,
        }} />
      )}

      {/* Body text */}
      {slide.body && !isCta && (
        <div style={{
          position: 'absolute',
          left: pad,
          right: pad,
          top: bodyTop,
          fontSize: 15 * scale,
          color: theme.bodyColor,
          lineHeight: 1.55,
          wordBreak: 'break-word',
        }}>
          {slide.body}
        </div>
      )}

      {/* Slide count for content (bottom right) */}
      {!isCover && !isCta && (
        <div style={{
          position: 'absolute',
          bottom: pad * 0.5,
          right: pad * 0.5,
          fontSize: 10 * scale,
          color: theme.bodyColor,
          opacity: 0.5,
        }}>
          {slide.numberLabel}
        </div>
      )}
    </div>
  )
}
