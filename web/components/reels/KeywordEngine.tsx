'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Tag, X } from 'lucide-react';
import { useState, KeyboardEvent } from 'react';

interface KeywordEngineProps {
  keywords: string[];
  onKeywordsChange: (keywords: string[]) => void;
}

const SUGGESTIONS = [
  'sunset aesthetic',
  'city lights night',
  'summer beach waves',
  'dancing energy',
  'golden hour',
  'nature peaceful',
  'urban street style',
  'ocean vibes',
  'party atmosphere',
  'romantic mood',
  'adventure travel',
  'minimalist',
];

export function KeywordEngine({ keywords, onKeywordsChange }: KeywordEngineProps) {
  const [input, setInput] = useState('');

  const addKeyword = (kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed || keywords.includes(trimmed)) return;
    onKeywordsChange([...keywords, trimmed]);
    setInput('');
  };

  const removeKeyword = (kw: string) => {
    onKeywordsChange(keywords.filter((k) => k !== kw));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addKeyword(input);
    } else if (e.key === 'Backspace' && !input && keywords.length) {
      removeKeyword(keywords[keywords.length - 1]);
    }
  };

  return (
    <div className="bg-secondary rounded-xl p-4 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Keyword Engine</h3>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Keywords drive the stock footage search. Add multiple for variety.
      </p>

      <div className="flex flex-wrap gap-1.5 p-2 bg-secondary/50 border border-border rounded-lg min-h-[42px] focus-within:border-primary/50 transition-colors mb-3">
        <AnimatePresence>
          {keywords.map((kw) => (
            <motion.span
              key={kw}
              initial={{ opacity: 0, scale: 0.85, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-primary/15 text-primary border border-primary/20"
            >
              {kw}
              <button
                onClick={() => removeKeyword(kw)}
                className="hover:text-primary/60 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => addKeyword(input)}
          placeholder={keywords.length ? '' : 'Type keyword + Enter…'}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Suggestions:</p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.filter((s) => !keywords.includes(s))
            .slice(0, 6)
            .map((s) => (
              <motion.button
                key={s}
                onClick={() => addKeyword(s)}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="px-2 py-0.5 rounded-full text-xs bg-secondary text-muted-foreground border border-border hover:border-primary/40 hover:text-primary transition-colors"
              >
                + {s}
              </motion.button>
            ))}
        </div>
      </div>
    </div>
  );
}
