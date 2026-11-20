import { ThemeId } from '../types/tool';

export interface ThemeMeta {
  id: ThemeId;
  nameKey: string;
  defaultName: string;
  previewBg: string;
  previewBorder: string;
  previewAccent: string;
  isLight?: boolean;
}

export const THEMES: ThemeMeta[] = [
  {
    id: 'midnight',
    nameKey: 'theme_midnight',
    defaultName: 'Midnight Navy',
    previewBg: '#030712',
    previewBorder: '#1e293b',
    previewAccent: '#6366f1',
  },
  {
    id: 'oled',
    nameKey: 'theme_oled',
    defaultName: 'OLED Black',
    previewBg: '#000000',
    previewBorder: '#27272a',
    previewAccent: '#3b82f6',
  },
  {
    id: 'graphite',
    nameKey: 'theme_graphite',
    defaultName: 'Charcoal Graphite',
    previewBg: '#121417',
    previewBorder: '#2e343f',
    previewAccent: '#38bdf8',
  },
  {
    id: 'nord',
    nameKey: 'theme_nord',
    defaultName: 'Nordic Frost',
    previewBg: '#242933',
    previewBorder: '#3b4252',
    previewAccent: '#88c0d0',
  },
  {
    id: 'ocean',
    nameKey: 'theme_ocean',
    defaultName: 'Deep Ocean',
    previewBg: '#04121c',
    previewBorder: '#123347',
    previewAccent: '#06b6d4',
  },
  {
    id: 'emerald',
    nameKey: 'theme_emerald',
    defaultName: 'Cyber Emerald',
    previewBg: '#040d0a',
    previewBorder: '#13392a',
    previewAccent: '#10b981',
  },
  {
    id: 'purple',
    nameKey: 'theme_purple',
    defaultName: 'Royal Twilight',
    previewBg: '#0b0614',
    previewBorder: '#2d1b54',
    previewAccent: '#a855f7',
  },
  {
    id: 'sunset',
    nameKey: 'theme_sunset',
    defaultName: 'Amber Ember',
    previewBg: '#140d0a',
    previewBorder: '#3b2419',
    previewAccent: '#f59e0b',
  },
  {
    id: 'rose',
    nameKey: 'theme_rose',
    defaultName: 'Crimson Velvet',
    previewBg: '#12080d',
    previewBorder: '#432232',
    previewAccent: '#f43f5e',
  },
  {
    id: 'light',
    nameKey: 'theme_light',
    defaultName: 'Clean Light',
    previewBg: '#f8fafc',
    previewBorder: '#cbd5e1',
    previewAccent: '#4f46e5',
    isLight: true,
  },
  {
    id: 'sand',
    nameKey: 'theme_sand',
    defaultName: 'Warm Paper',
    previewBg: '#f6f1e7',
    previewBorder: '#ddd3c0',
    previewAccent: '#b45309',
    isLight: true,
  },
  {
    id: 'mint',
    nameKey: 'theme_mint',
    defaultName: 'Soft Sage',
    previewBg: '#eff5f1',
    previewBorder: '#c5dbc9',
    previewAccent: '#059669',
    isLight: true,
  },
];

const THEME_ID_SET = new Set<string>(THEMES.map(t => t.id));

export function isValidThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && THEME_ID_SET.has(value);
}

export function isLightTheme(themeId: ThemeId): boolean {
  return Boolean(THEMES.find(t => t.id === themeId)?.isLight);
}

export function applyTheme(themeId: ThemeId): void {
  const safeThemeId: ThemeId = isValidThemeId(themeId) ? themeId : 'midnight';
  const root = document.documentElement;
  const body = document.body;

  root.setAttribute('data-theme', safeThemeId);
  body.setAttribute('data-theme', safeThemeId);

  // Remove existing theme classes
  THEMES.forEach(t => {
    root.classList.remove(`theme-${t.id}`);
    body.classList.remove(`theme-${t.id}`);
  });

  root.classList.add(`theme-${safeThemeId}`);
  body.classList.add(`theme-${safeThemeId}`);

  if (isLightTheme(safeThemeId)) {
    root.classList.remove('dark');
    body.classList.remove('dark');
    root.classList.add('light');
    body.classList.add('light');
  } else {
    root.classList.add('dark');
    body.classList.add('dark');
    root.classList.remove('light');
    body.classList.remove('light');
  }
}
