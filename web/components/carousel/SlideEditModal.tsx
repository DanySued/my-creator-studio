'use client'

import { useState, useEffect } from 'react'
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

  if (!slide) return null

  const handleSave = () => {
    onSave({ ...slide, title: title.trim(), body: body.trim() })
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave()
  }

  const typeLabel = slide.type === 'cover' ? 'Cover' : slide.type === 'cta' ? 'CTA' : `Slide ${slide.numberLabel}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700/60 rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-white font-semibold text-sm">
            Edit <span className="text-zinc-400">{typeLabel}</span>
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">Title</label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={2}
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-purple-500/70 transition-colors placeholder:text-zinc-600"
              placeholder="Slide title..."
            />
          </div>

          {slide.type !== 'cta' && (
            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                {slide.type === 'cover' ? 'Subtitle' : 'Body'}
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-purple-500/70 transition-colors placeholder:text-zinc-600"
                placeholder={slide.type === 'cover' ? 'Short subtitle...' : 'Slide body text...'}
              />
            </div>
          )}
        </div>

        <p className="text-[10px] text-zinc-600 mt-3">⌘↵ to save · Esc to cancel</p>

        <div className="flex gap-2 mt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:text-white hover:border-zinc-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 text-sm text-white bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
