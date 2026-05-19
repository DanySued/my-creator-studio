'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Slide } from './SlideCard'

interface SlideEditModalProps {
  slide: Slide | null
  onSave: (slide: Slide) => void
  onClose: () => void
}

export function SlideEditModal({ slide, onSave, onClose }: SlideEditModalProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    if (slide) {
      setTitle(slide.title)
      setBody(slide.body)
    }
  }, [slide])

  const handleSave = () => {
    if (!slide) return
    onSave({ ...slide, title: title.trim(), body: body.trim() })
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave()
  }

  const typeLabel = slide
    ? slide.type === 'cover' ? 'Cover' : slide.type === 'cta' ? 'CTA' : `Slide ${slide.numberLabel}`
    : ''

  return (
    <AnimatePresence>
      {slide && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
          >
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="flex items-center justify-between mb-5"
            >
              <h3 className="text-foreground font-semibold text-sm">
                Edit <span className="text-muted-foreground">{typeLabel}</span>
              </h3>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors text-lg leading-none"
              >
                ×
              </button>
            </motion.div>

            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.08 }}
              >
                <label className="block text-xs text-muted-foreground mb-1.5">Title</label>
                <textarea
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  rows={2}
                  autoFocus
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-foreground text-sm resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors placeholder:text-muted-foreground/50"
                  placeholder="Slide title..."
                />
              </motion.div>

              {slide.type !== 'cta' && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: 0.12 }}
                >
                  <label className="block text-xs text-muted-foreground mb-1.5">
                    {slide.type === 'cover' ? 'Subtitle' : 'Body'}
                  </label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-foreground text-sm resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-colors placeholder:text-muted-foreground/50"
                    placeholder={slide.type === 'cover' ? 'Short subtitle...' : 'Slide body text...'}
                  />
                </motion.div>
              )}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.18 }}
              className="text-[10px] text-muted-foreground/50 mt-3"
            >
              ⌘↵ to save · Esc to cancel
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.15 }}
              className="flex gap-2 mt-4"
            >
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:text-foreground hover:border-border/80 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleSave}
                className="flex-1 px-4 py-2 text-sm text-primary-foreground bg-primary hover:brightness-110 rounded-lg transition-all font-medium"
              >
                Save
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
