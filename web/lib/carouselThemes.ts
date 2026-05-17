export interface CarouselTheme {
  id: string
  name: string
  bgFrom: string
  bgTo: string
  accent: string
  titleColor: string
  bodyColor: string
}

export const CAROUSEL_THEMES: CarouselTheme[] = [
  {
    id: 'midnight',
    name: 'Midnight',
    bgFrom: '#0f0c29',
    bgTo: '#302b63',
    accent: '#a78bfa',
    titleColor: '#ffffff',
    bodyColor: 'rgba(255,255,255,0.8)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    bgFrom: '#1a237e',
    bgTo: '#00838f',
    accent: '#80deea',
    titleColor: '#ffffff',
    bodyColor: 'rgba(255,255,255,0.85)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    bgFrom: '#bf360c',
    bgTo: '#f57f17',
    accent: '#ffcc02',
    titleColor: '#ffffff',
    bodyColor: 'rgba(255,255,255,0.85)',
  },
  {
    id: 'minimal',
    name: 'Minimal',
    bgFrom: '#fafafa',
    bgTo: '#e8e8e8',
    accent: '#1a1a1a',
    titleColor: '#1a1a1a',
    bodyColor: '#555555',
  },
  {
    id: 'neon',
    name: 'Neon',
    bgFrom: '#0a0a0a',
    bgTo: '#1a1a1a',
    accent: '#39ff14',
    titleColor: '#ffffff',
    bodyColor: 'rgba(255,255,255,0.75)',
  },
  {
    id: 'forest',
    name: 'Forest',
    bgFrom: '#1b5e20',
    bgTo: '#2e7d32',
    accent: '#a5d6a7',
    titleColor: '#ffffff',
    bodyColor: 'rgba(255,255,255,0.85)',
  },
  {
    id: 'coral',
    name: 'Coral',
    bgFrom: '#b71c1c',
    bgTo: '#e64a19',
    accent: '#ffccbc',
    titleColor: '#ffffff',
    bodyColor: 'rgba(255,255,255,0.85)',
  },
  {
    id: 'charcoal',
    name: 'Charcoal',
    bgFrom: '#212121',
    bgTo: '#424242',
    accent: '#bdbdbd',
    titleColor: '#ffffff',
    bodyColor: 'rgba(255,255,255,0.75)',
  },
]

export const getTheme = (id: string): CarouselTheme =>
  CAROUSEL_THEMES.find((t) => t.id === id) ?? CAROUSEL_THEMES[0]
