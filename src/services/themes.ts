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
    defaultName: 'Půlnoční modrá (Midnight Navy)',
    previewBg: '#030712',
    previewBorder: '#1e293b',
    previewAccent: '#6366f1',
  },
  {
    id: 'oled',
    nameKey: 'theme_oled',
    defaultName: 'Čistě černá (OLED Black)',
    previewBg: '#000000',
    previewBorder: '#27272a',
    previewAccent: '#3b82f6',
  },
  {
    id: 'graphite',
    nameKey: 'theme_graphite',
    defaultName: 'Grafitově šedá (Charcoal)',
    previewBg: '#121417',
    previewBorder: '#2e343f',
    previewAccent: '#38bdf8',
  },
  {
    id: 'emerald',
    nameKey: 'theme_emerald',
    defaultName: 'Kybernetická smaragdová (Emerald)',
    previewBg: '#040d0a',
    previewBorder: '#13392a',
    previewAccent: '#10b981',
  },
  {
    id: 'purple',
    nameKey: 'theme_purple',
    defaultName: 'Temně fialová (Royal Twilight)',
    previewBg: '#0b0614',
    previewBorder: '#2d1b54',
    previewAccent: '#a855f7',
  },
  {
    id: 'light',
    nameKey: 'theme_light',
    defaultName: 'Čistý moderní světlý (Clean Light)',
    previewBg: '#f8fafc',
    previewBorder: '#cbd5e1',
    previewAccent: '#4f46e5',
    isLight: true,
  },
];

export function applyTheme(themeId: ThemeId): void {
  const root = document.documentElement;
  const body = document.body;

  root.setAttribute('data-theme', themeId);
  body.setAttribute('data-theme', themeId);

  // Remove existing theme classes
  THEMES.forEach(t => {
    root.classList.remove(`theme-${t.id}`);
    body.classList.remove(`theme-${t.id}`);
  });

  root.classList.add(`theme-${themeId}`);
  body.classList.add(`theme-${themeId}`);

  if (themeId === 'light') {
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
