export interface CarouselTheme {
  id: string
  name: string
  bgFrom: string
  bgTo: string
  accent: string
  titleColor: string
  bodyColor: string
  stripeColor: string
  slideStyle: 'classic' | 'bold-number' | 'editorial'
}

export const CAROUSEL_THEMES: CarouselTheme[] = [
  {
    id: 'thread',
    name: 'Thread',
    bgFrom: '#f9f6f1',
    bgTo: '#ede8e0',
    accent: '#1a1a1a',
    titleColor: '#0d0d0d',
    bodyColor: '#5a5a5a',
    stripeColor: '#c8b89a',
    slideStyle: 'editorial',
  },
  {
    id: 'noir',
    name: 'Noir',
    bgFrom: '#0c0c0c',
    bgTo: '#1c1c1c',
    accent: '#d4a853',
    titleColor: '#ffffff',
    bodyColor: 'rgba(255,255,255,0.72)',
    stripeColor: '#d4a853',
    slideStyle: 'bold-number',
  },
  {
    id: 'bloom',
    name: 'Bloom',
    bgFrom: '#f0e8ff',
    bgTo: '#dcc8ff',
    accent: '#7c3aed',
    titleColor: '#1e0a3c',
    bodyColor: '#4a2c8a',
    stripeColor: '#7c3aed',
    slideStyle: 'classic',
  },
  {
    id: 'navy',
    name: 'Navy',
    bgFrom: '#08142e',
    bgTo: '#14305a',
    accent: '#c9a84c',
    titleColor: '#ffffff',
    bodyColor: 'rgba(255,255,255,0.78)',
    stripeColor: '#c9a84c',
    slideStyle: 'bold-number',
  },
  {
    id: 'plasma',
    name: 'Plasma',
    bgFrom: '#040404',
    bgTo: '#0c0c14',
    accent: '#00e5ff',
    titleColor: '#ffffff',
    bodyColor: 'rgba(180,240,255,0.85)',
    stripeColor: '#00e5ff',
    slideStyle: 'bold-number',
  },
  {
    id: 'clay',
    name: 'Clay',
    bgFrom: '#f7ede2',
    bgTo: '#e8d5c0',
    accent: '#c45e3d',
    titleColor: '#2d1810',
    bodyColor: '#6b4535',
    stripeColor: '#c45e3d',
    slideStyle: 'editorial',
  },
]

export const getTheme = (id: string): CarouselTheme =>
  CAROUSEL_THEMES.find((t) => t.id === id) ?? CAROUSEL_THEMES[0]
