export type ThemeId = 'cosmic' | 'cyber' | 'solar' | 'matrix' | 'synthwave' | 'cryo';

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  shortName: string;
  tagline: string;
  accent: string;
  secondary: string;
  bg: string;
  icon: string;
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'cosmic',
    name: 'Cosmic Nebula',
    shortName: 'COSMIC',
    tagline: 'Deep space indigo & arcade gold',
    accent: '#ffd369',
    secondary: '#8d76c7',
    bg: '#12111d',
    icon: '🌌',
  },
  {
    id: 'cyber',
    name: 'Cyber Neon',
    shortName: 'CYBER',
    tagline: 'Electric cyan & laser magenta',
    accent: '#00f0ff',
    secondary: '#ff2a85',
    bg: '#060810',
    icon: '⚡',
  },
  {
    id: 'solar',
    name: 'Solar Flare',
    shortName: 'SOLAR',
    tagline: 'Phosphor amber & volcanic basalt',
    accent: '#ff9e2c',
    secondary: '#ff4757',
    bg: '#0e0b08',
    icon: '☀️',
  },
  {
    id: 'matrix',
    name: 'Emerald Orbit',
    shortName: 'EMERALD',
    tagline: 'Tactical phosphor lime & matrix jade',
    accent: '#00ff88',
    secondary: '#38ef7d',
    bg: '#061008',
    icon: '📟',
  },
  {
    id: 'synthwave',
    name: 'Synthwave Warp',
    shortName: 'SYNTH',
    tagline: 'Jet black, laser pink & sunset yellow',
    accent: '#ff007f',
    secondary: '#ffe600',
    bg: '#07070a',
    icon: '🚀',
  },
  {
    id: 'cryo',
    name: 'Cryo Frost',
    shortName: 'CRYO',
    tagline: 'Glacial diamond cyan & arctic void',
    accent: '#38bdf8',
    secondary: '#93c5fd',
    bg: '#050c18',
    icon: '❄️',
  },
];

export const DEFAULT_THEME_ID: ThemeId = 'cosmic';

export function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME_ID;
  try {
    const saved = localStorage.getItem('ideaquest_theme') as ThemeId;
    if (saved && THEMES.some(t => t.id === saved)) {
      return saved;
    }
  } catch {}
  return DEFAULT_THEME_ID;
}

export function setStoredTheme(themeId: ThemeId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ideaquest_theme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    if (document.body) {
      document.body.setAttribute('data-theme', themeId);
    }
  } catch {}
}
