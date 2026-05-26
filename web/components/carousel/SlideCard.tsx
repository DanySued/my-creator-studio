'use client'

import { motion } from 'motion/react'
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
  onClick?: () => void
}

// Stripe width at full 1080px canvas resolution
const STRIPE_PX = 54

export function SlideCard({ slide, theme, handle, scale = 0.25, onClick }: SlideCardProps) {
  const W = 1080
  const H = 1350
  const w = W * scale
  const h = H * scale
  const s = STRIPE_PX * scale  // stripe width at current scale
  const p = 60 * scale          // inner padding from content edge

  const isCover = slide.type === 'cover'
  const isContent = slide.type === 'content'
  const isCta = slide.type === 'cta'

  // Stripes: cover gets right only, content gets both, cta gets left only
  const hasLeft = isContent || isCta
  const hasRight = isCover || isContent

  // Content area horizontal bounds (accounting for stripes + inner padding)
  const cLeft = (hasLeft ? s : 0) + p
  const cRight = (hasRight ? s : 0) + p

  const ff = theme.slideStyle === 'editorial'
    ? '"Georgia", "Times New Roman", serif'
    : '"Inter", "Helvetica Neue", Arial, sans-serif'

  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      transition={onClick ? { type: 'spring', stiffness: 400, damping: 25 } : undefined}
      style={{
        width: w,
        height: h,
        background: `linear-gradient(180deg, ${theme.bgFrom} 0%, ${theme.bgTo} 100%)`,
        position: 'relative',
        borderRadius: 8 * scale,
        overflow: 'hidden',
        flexShrink: 0,
        userSelect: 'none',
        fontFamily: ff,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {/* Left continuity stripe */}
      {hasLeft && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: s,
          height: h,
          background: theme.stripeColor,
          zIndex: 1,
        }} />
      )}

      {/* Right continuity stripe */}
      {hasRight && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 0,
          width: s,
          height: h,
          background: theme.stripeColor,
          zIndex: 1,
        }} />
      )}

      {/* Large watermark number for bold-number themes */}
      {theme.slideStyle === 'bold-number' && !isCta && (
        <div style={{
          position: 'absolute',
          right: s + p * 0.3,
          bottom: h * 0.02,
          fontSize: h * 0.30,
          fontWeight: 900,
          color: theme.accent,
          opacity: 0.09,
          lineHeight: 1,
          fontFamily: '"Inter", Arial, sans-serif',
          zIndex: 0,
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          {slide.numberLabel}
        </div>
      )}

      {/* Content layer — sits above stripes and watermark */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
        {isCover && (
          <CoverContent slide={slide} theme={theme} handle={handle}
            scale={scale} cLeft={cLeft} cRight={cRight} h={h} p={p} />
        )}
        {isContent && (
          <ContentSlide slide={slide} theme={theme} handle={handle}
            scale={scale} cLeft={cLeft} cRight={cRight} h={h} p={p} />
        )}
        {isCta && (
          <CtaSlide slide={slide} theme={theme} handle={handle}
            scale={scale} cLeft={cLeft} cRight={cRight} h={h} p={p} />
        )}
      </div>
    </motion.div>
  )
}

// ─── Slide type sub-renderers ─────────────────────────────────────────────────

interface SlotProps {
  slide: Slide
  theme: CarouselTheme
  handle?: string
  scale: number
  cLeft: number
  cRight: number
  h: number
  p: number
}

function CoverContent({ slide, theme, handle, scale, cLeft, cRight, h, p }: SlotProps) {
  return (
    <>
      {/* Number label — top left */}
      <div style={{
        position: 'absolute',
        top: p * 0.7,
        left: cLeft,
        fontSize: 11 * scale,
        color: theme.accent,
        fontWeight: 700,
        letterSpacing: '0.08em',
        opacity: 0.9,
      }}>
        {slide.numberLabel}
      </div>

      {/* Handle — top right */}
      {handle && (
        <div style={{
          position: 'absolute',
          top: p * 0.7,
          right: cRight,
          fontSize: 10 * scale,
          color: theme.accent,
          opacity: 0.75,
        }}>
          {handle}
        </div>
      )}

      {/* Title */}
      <div style={{
        position: 'absolute',
        left: cLeft,
        right: cRight,
        top: h * 0.28,
        fontSize: 40 * scale,
        fontWeight: 700,
        color: theme.titleColor,
        lineHeight: 1.15,
        wordBreak: 'break-word',
      }}>
        {slide.title}
      </div>

      {/* Accent separator */}
      <div style={{
        position: 'absolute',
        left: cLeft,
        top: h * 0.62,
        width: 56 * scale,
        height: 2.5 * scale,
        background: theme.accent,
        borderRadius: 2,
      }} />

      {/* Subtitle / tagline */}
      {slide.body && (
        <div style={{
          position: 'absolute',
          left: cLeft,
          right: cRight,
          top: h * 0.67,
          fontSize: 13 * scale,
          color: theme.bodyColor,
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}>
          {slide.body}
        </div>
      )}
    </>
  )
}

function ContentSlide({ slide, theme, handle, scale, cLeft, cRight, h, p }: SlotProps) {
  return (
    <>
      {/* Number label — top left */}
      <div style={{
        position: 'absolute',
        top: p * 0.7,
        left: cLeft,
        fontSize: 11 * scale,
        color: theme.accent,
        fontWeight: 700,
        letterSpacing: '0.08em',
        opacity: 0.9,
      }}>
        {slide.numberLabel}
      </div>

      {/* Handle — top right */}
      {handle && (
        <div style={{
          position: 'absolute',
          top: p * 0.7,
          right: cRight,
          fontSize: 10 * scale,
          color: theme.accent,
          opacity: 0.75,
        }}>
          {handle}
        </div>
      )}

      {/* Title */}
      <div style={{
        position: 'absolute',
        left: cLeft,
        right: cRight,
        top: h * 0.20,
        fontSize: 24 * scale,
        fontWeight: 700,
        color: theme.titleColor,
        lineHeight: 1.2,
        wordBreak: 'break-word',
      }}>
        {slide.title}
      </div>

      {/* Accent separator */}
      <div style={{
        position: 'absolute',
        left: cLeft,
        top: h * 0.48,
        width: 48 * scale,
        height: 2 * scale,
        background: theme.accent,
        borderRadius: 2,
      }} />

      {/* Body */}
      {slide.body && (
        <div style={{
          position: 'absolute',
          left: cLeft,
          right: cRight,
          top: h * 0.53,
          fontSize: 13 * scale,
          color: theme.bodyColor,
          lineHeight: 1.55,
          wordBreak: 'break-word',
        }}>
          {slide.body}
        </div>
      )}

      {/* Slide counter — bottom right (inside right stripe padding) */}
      <div style={{
        position: 'absolute',
        bottom: p * 0.6,
        right: cRight,
        fontSize: 9 * scale,
        color: theme.bodyColor,
        opacity: 0.45,
      }}>
        {slide.numberLabel}
      </div>
    </>
  )
}

function CtaSlide({ slide, theme, handle, scale, cLeft, cRight, h, p }: SlotProps) {
  const centerX = cLeft + (1080 * scale - cLeft - cRight) / 2
  return (
    <>
      {/* CTA title — vertically centred */}
      <div style={{
        position: 'absolute',
        left: cLeft,
        right: cRight,
        top: h * 0.36,
        fontSize: 26 * scale,
        fontWeight: 700,
        color: theme.titleColor,
        lineHeight: 1.25,
        wordBreak: 'break-word',
        textAlign: 'center',
      }}>
        {slide.title}
      </div>

      {/* Accent separator — centred */}
      <div style={{
        position: 'absolute',
        left: centerX - 20 * scale,
        top: h * 0.62,
        width: 40 * scale,
        height: 2 * scale,
        background: theme.accent,
        borderRadius: 2,
      }} />

      {/* Handle */}
      {handle && (
        <div style={{
          position: 'absolute',
          left: cLeft,
          right: cRight,
          top: h * 0.67,
          fontSize: 12 * scale,
          color: theme.accent,
          fontWeight: 700,
          textAlign: 'center',
          letterSpacing: '0.04em',
        }}>
          {handle}
        </div>
      )}
    </>
  )
}
