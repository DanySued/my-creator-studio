import { ChevronLeft, ChevronRight } from 'lucide-react';
import { RefObject } from 'react';

interface SlidePreviewProps {
  currentSlide: number;
  totalSlides: number;
  theme: string;
  content: string;
  title: string;
  onPrevious: () => void;
  onNext: () => void;
  containerRef?: RefObject<HTMLDivElement | null>;
}

const themeGradients = {
  aurora: 'from-purple-500 via-pink-500 to-indigo-500',
  sunset: 'from-orange-500 via-pink-500 to-red-500',
  ocean: 'from-blue-500 via-teal-500 to-cyan-500',
  gold: 'from-yellow-500 via-amber-500 to-orange-500',
  midnight: 'from-indigo-900 via-purple-900 to-blue-900',
};

export function SlidePreview({
  currentSlide,
  totalSlides,
  theme,
  content,
  title,
  onPrevious,
  onNext,
  containerRef,
}: SlidePreviewProps) {
  const gradient = themeGradients[theme as keyof typeof themeGradients] || themeGradients.midnight;

  return (
    <div className="flex items-center justify-center gap-4 h-full">
      {/* Previous Button */}
      <button
        onClick={onPrevious}
        disabled={currentSlide === 0}
        aria-label="Previous slide"
        className="w-11 h-11 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 hover:scale-110 flex-shrink-0"
      >
        <ChevronLeft className="w-5 h-5 text-white" />
      </button>

      {/* Slide Preview — 1:1 Aspect Ratio */}
      <div className="relative aspect-square w-full max-w-2xl">
        <div
          ref={containerRef}
          role="region"
          aria-label={`Slide ${currentSlide + 1} of ${totalSlides}`}
          className={`w-full h-full rounded-2xl bg-gradient-to-br ${gradient} p-10 flex flex-col justify-between shadow-2xl relative overflow-hidden`}
        >
          {/* Decorative circles */}
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -bottom-24 -left-12 w-72 h-72 rounded-full bg-black/10 pointer-events-none" />
          <div className="absolute top-1/2 -right-10 -translate-y-1/2 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-1/4 -left-6 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />

          {/* Header row */}
          <div className="relative flex items-center justify-between">
            <span className="text-white/50 text-xs font-mono tracking-widest uppercase">
              Slide {String(currentSlide + 1).padStart(2, '0')}
            </span>
            <span className="text-white/30 text-xs font-mono">
              {currentSlide + 1} / {totalSlides}
            </span>
          </div>

          {/* Content */}
          <div className="relative flex-1 flex flex-col justify-center overflow-hidden min-h-0 py-4">
            <div className="w-8 h-0.5 bg-white/40 mb-6 rounded-full" />
            <h2 className="text-4xl font-bold text-white mb-5 leading-tight line-clamp-3">
              {title || 'Untitled Slide'}
            </h2>
            <p className="text-base text-white/75 leading-relaxed line-clamp-5 overflow-hidden">
              {content || 'Your generated content will appear here...'}
            </p>
          </div>

          {/* Branding */}
          <div className="relative flex items-center gap-2" aria-hidden="true">
            <div className="w-5 h-5 rounded-md bg-white/15 flex items-center justify-center">
              <span className="text-white text-[9px] font-bold">C</span>
            </div>
            <span className="text-white/35 text-xs font-medium">Carousel AI</span>
          </div>
        </div>
      </div>

      {/* Next Button */}
      <button
        onClick={onNext}
        disabled={currentSlide === totalSlides - 1}
        aria-label="Next slide"
        className="w-11 h-11 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 hover:scale-110 flex-shrink-0"
      >
        <ChevronRight className="w-5 h-5 text-white" />
      </button>
    </div>
  );
}
