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
    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-orange-500" />
        <h3 className="text-sm font-semibold text-white">Keyword Engine</h3>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        Keywords drive the stock footage search. Add multiple for variety.
      </p>

      {/* Tags input */}
      <div className="flex flex-wrap gap-1.5 p-2 bg-gray-800/50 border border-gray-700 rounded-lg min-h-[42px] focus-within:border-orange-500/50 mb-3">
        {keywords.map((kw) => (
          <span
            key={kw}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs bg-orange-500/15 text-orange-400 border border-orange-500/20"
          >
            {kw}
            <button
              onClick={() => removeKeyword(kw)}
              className="hover:text-orange-200"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => addKeyword(input)}
          placeholder={keywords.length ? '' : 'Type keyword + Enter…'}
          className="flex-1 min-w-[120px] bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
        />
      </div>

      {/* Quick suggestions */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Suggestions:</p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.filter((s) => !keywords.includes(s))
            .slice(0, 6)
            .map((s) => (
              <button
                key={s}
                onClick={() => addKeyword(s)}
                className="px-2 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400 border border-gray-700 hover:border-orange-500/40 hover:text-orange-400 transition-all"
              >
                + {s}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
