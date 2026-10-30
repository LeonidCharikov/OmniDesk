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
  document.documentElement.setAttribute('data-theme', themeId);
  if (themeId === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
}
