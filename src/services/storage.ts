import { UserConfig } from '../types/tool';

const CONFIG_KEY = 'omnidesk_user_config_v1';

export const DEFAULT_CONFIG: UserConfig = {
  favorites: ['docx-to-pdf', 'unit-converter', 'loan-calc'],
  recentToolIds: ['docx-to-pdf'],
  simulatedOffline: false,
  theme: 'dark',
};

export function loadUserConfig(): UserConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveUserConfig(config: UserConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Failed to save user config:', e);
  }
}
