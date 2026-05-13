import { motion } from 'motion/react';

interface Slide {
  id: number;
  title: string;
  content: string;
}

interface SlideStripProps {
  slides: Slide[];
  currentSlide: number;
  onSlideSelect: (index: number) => void;
  theme: string;
}

const themeGradients = {
  aurora: 'from-purple-500 via-pink-500 to-indigo-500',
  sunset: 'from-orange-500 via-pink-500 to-red-500',
  ocean: 'from-blue-500 via-teal-500 to-cyan-500',
  gold: 'from-yellow-500 via-amber-500 to-orange-500',
  midnight: 'from-indigo-900 via-purple-900 to-blue-900',
};

export function SlideStrip({ slides, currentSlide, onSlideSelect, theme }: SlideStripProps) {
  const gradient = themeGradients[theme as keyof typeof themeGradients] || themeGradients.midnight;

  return (
    <div className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-purple-500" />
        <span className="text-sm font-medium text-gray-300">Generated Slides</span>
        <span className="text-xs text-gray-500">({slides.length})</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {slides.map((slide, index) => (
          <motion.button
            key={slide.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSlideSelect(index)}
            aria-label={`Select slide ${index + 1}: ${slide.title}`}
            aria-pressed={currentSlide === index}
            className={`
              relative flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden
              transition-all duration-200 group
              ${currentSlide === index
                ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-surface-base scale-105'
                : 'hover:scale-105 opacity-70 hover:opacity-100'
              }
            `}
          >
            {/* Thumbnail Background */}
            <div className={`w-full h-full bg-gradient-to-br ${gradient} p-3 flex flex-col justify-between`}>
              {/* Slide Number */}
              <div className="text-white/60 text-xs font-mono">
                {index + 1}
              </div>

              {/* Preview Content */}
              <div>
                <h4 className="text-white text-xs font-semibold line-clamp-2 mb-1">
                  {slide.title}
                </h4>
                <p className="text-white/70 text-[10px] line-clamp-2">
                  {slide.content}
                </p>
              </div>
            </div>

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-purple-500/0 group-hover:bg-purple-500/10 transition-colors" />

            {/* Active Indicator */}
            {currentSlide === index && (
              <motion.div
                layoutId="activeSlide"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-purple-500 rounded-full"
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
