export interface CarouselTemplate {
  id: string;
  name: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  titleColor: string;
  contentColor: string;
  accentColor: string;
  fontFamily: string;
}

export const CAROUSEL_TEMPLATES: CarouselTemplate[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark & sophisticated',
    gradientFrom: '#0f0c29',
    gradientTo: '#302b63',
    titleColor: '#f1f5f9',
    contentColor: '#94a3b8',
    accentColor: '#8b5cf6',
    fontFamily: 'Georgia',
  },
  {
    id: 'sunrise',
    name: 'Sunrise',
    description: 'Warm & energetic',
    gradientFrom: '#f093fb',
    gradientTo: '#f5576c',
    titleColor: '#ffffff',
    contentColor: '#ffe0e6',
    accentColor: '#ffca28',
    fontFamily: 'Arial',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Calm & professional',
    gradientFrom: '#1a6ed8',
    gradientTo: '#00c9a7',
    titleColor: '#ffffff',
    contentColor: '#cff4f0',
    accentColor: '#7efff5',
    fontFamily: 'Arial',
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Natural & grounded',
    gradientFrom: '#134e5e',
    gradientTo: '#71b280',
    titleColor: '#f0fdf4',
    contentColor: '#bbf7d0',
    accentColor: '#4ade80',
    fontFamily: 'Georgia',
  },
  {
    id: 'marble',
    name: 'Marble',
    description: 'Clean & minimal',
    gradientFrom: '#f8fafc',
    gradientTo: '#cbd5e1',
    titleColor: '#0f172a',
    contentColor: '#475569',
    accentColor: '#6366f1',
    fontFamily: 'Georgia',
  },
  {
    id: 'neon',
    name: 'Neon',
    description: 'Bold & vibrant',
    gradientFrom: '#0a0a0a',
    gradientTo: '#1a0533',
    titleColor: '#f0f0f0',
    contentColor: '#c084fc',
    accentColor: '#e879f9',
    fontFamily: 'Arial',
  },
];
