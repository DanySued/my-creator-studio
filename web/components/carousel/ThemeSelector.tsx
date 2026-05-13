import { Check } from 'lucide-react';

interface ThemeSelectorProps {
  selectedTheme: string;
  onThemeChange: (theme: string) => void;
}

const themes = [
  { id: 'aurora', name: 'Aurora', gradient: 'from-purple-500 via-pink-500 to-indigo-500' },
  { id: 'sunset', name: 'Sunset', gradient: 'from-orange-500 via-pink-500 to-red-500' },
  { id: 'ocean', name: 'Ocean', gradient: 'from-blue-500 via-teal-500 to-cyan-500' },
  { id: 'gold', name: 'Gold', gradient: 'from-yellow-500 via-amber-500 to-orange-500' },
  { id: 'midnight', name: 'Midnight', gradient: 'from-indigo-900 via-purple-900 to-blue-900' },
];

export function ThemeSelector({ selectedTheme, onThemeChange }: ThemeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-300">Theme</label>
      <div className="flex gap-2">
        {themes.map((theme) => {
          const isSelected = selectedTheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => onThemeChange(theme.id)}
              title={theme.name}
              aria-label={`Select ${theme.name} theme`}
              aria-pressed={isSelected}
              className={`
                relative flex-1 h-14 rounded-xl bg-gradient-to-br ${theme.gradient}
                transition-all duration-200 overflow-hidden
                ${isSelected
                  ? 'ring-2 ring-white/50 ring-offset-2 ring-offset-surface-panel scale-105 shadow-lg'
                  : 'opacity-60 hover:opacity-90 hover:scale-105'
                }
              `}
            >
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                  <Check className="w-4 h-4 text-white drop-shadow" />
                </div>
              )}
              <div className="absolute bottom-1 left-0 right-0 text-center text-white text-[9px] font-semibold drop-shadow opacity-90">
                {theme.name}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
