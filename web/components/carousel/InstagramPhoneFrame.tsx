'use client';

import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  slideDataUrls: string[];
  currentSlide: number;
  onSlideChange: (index: number) => void;
  username?: string;
}

export function InstagramPhoneFrame({
  slideDataUrls,
  currentSlide,
  onSlideChange,
  username = 'creator_studio',
}: Props) {
  const total = slideDataUrls.length;
  const url = slideDataUrls[currentSlide] ?? '';

  return (
    <div
      className="relative flex-shrink-0 bg-black rounded-[36px] border-[6px] border-zinc-700 shadow-2xl overflow-hidden select-none"
      style={{ width: 320, height: 620 }}
    >
      {/* Status bar */}
      <div className="flex justify-between items-center px-5 pt-2 pb-1 bg-black text-white text-[10px]">
        <span className="font-semibold">9:41</span>
        <div className="w-20 h-5 bg-black rounded-full border border-zinc-700 mx-auto absolute left-1/2 -translate-x-1/2 top-1" />
        <div className="flex items-center gap-1 text-[10px]">
          <span>●●●</span>
          <span>100%</span>
        </div>
      </div>

      {/* Instagram header */}
      <div className="bg-black text-white px-4 py-2 flex items-center justify-between border-b border-zinc-800">
        <span className="font-bold text-[15px] italic">Instagram</span>
        <div className="flex gap-3 text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="3"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
        </div>
      </div>

      {/* Profile row */}
      <div className="bg-black text-white px-3 py-2 flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex-shrink-0 ring-2 ring-offset-1 ring-offset-black ring-pink-500" />
        <span className="text-xs font-semibold flex-1">{username}</span>
        <span className="text-xs text-blue-400 font-semibold">Follow</span>
        <MoreHorizontal size={14} className="text-zinc-400 ml-1" />
      </div>

      {/* Slide image */}
      <div className="relative bg-zinc-900 overflow-hidden" style={{ width: 308, height: 308 }}>
        {url ? (
          <img src={url} alt={`Slide ${currentSlide + 1}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-zinc-800 animate-pulse" />
        )}

        {/* Prev/next arrows */}
        {total > 1 && currentSlide > 0 && (
          <button
            onClick={() => onSlideChange(currentSlide - 1)}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
          >
            <ChevronLeft size={14} className="text-white" />
          </button>
        )}
        {total > 1 && currentSlide < total - 1 && (
          <button
            onClick={() => onSlideChange(currentSlide + 1)}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
          >
            <ChevronRight size={14} className="text-white" />
          </button>
        )}

        {/* Slide dots */}
        {total > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {Array.from({ length: Math.min(total, 10) }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all ${
                  i === currentSlide ? 'w-2 h-2 bg-blue-400' : 'w-1.5 h-1.5 bg-zinc-500'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="bg-black text-white px-3 py-2 flex items-center gap-3">
        <Heart size={20} className="text-white" />
        <MessageCircle size={20} className="text-white" />
        <Send size={20} className="text-white -rotate-12" />
        <div className="flex-1" />
        <Bookmark size={20} className="text-white" />
      </div>

      {/* Like count + caption */}
      <div className="bg-black text-white px-3 py-1 space-y-0.5">
        <p className="text-xs font-semibold">1,234 likes</p>
        <p className="text-xs leading-tight">
          <span className="font-semibold">{username}</span>{' '}
          <span className="text-zinc-300">Slide {currentSlide + 1} of {total}</span>
        </p>
        <p className="text-[10px] text-zinc-500">View all 12 comments</p>
      </div>
    </div>
  );
}
