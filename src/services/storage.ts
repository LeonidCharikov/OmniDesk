import { UserConfig, WidgetCustomization, ThemeId, DailyTask } from '../types/tool';

const CONFIG_KEY = 'omnidesk_user_config_v2';
const LEGACY_KEY = 'omnidesk_user_config_v1';

export const DEFAULT_TASKS: DailyTask[] = [
  { id: '1', text: 'Zkontrolovat denní úkoly', done: false },
  { id: '2', text: 'Kalkulace a převod měn', done: true },
  { id: '3', text: 'Pomodoro blok soustředění', done: false },
];

export const DEFAULT_WIDGETS: WidgetCustomization = {
  enabledWidgets: ['clock', 'timer', 'crypto', 'notes', 'tasks', 'calc'],
  selectedCity: 'Europe/Prague',
  selectedCityName: 'Praha',
  selectedFiat: 'CZK',
  selectedCrypto: 'BTC',
  quickNote: 'OmniDesk rychlá poznámka...',
  dailyTasks: DEFAULT_TASKS,
};

export const DEFAULT_CONFIG: UserConfig = {
  version: 2,
  favorites: ['text-editor', 'docx-to-pdf', 'unit-converter', 'currency-crypto', 'pomodoro-timer'],
  recentToolIds: ['text-editor'],
  simulatedOffline: false,
  theme: 'dark',
  themeId: 'midnight',
  defaultCurrency: 'CZK',
  widgets: DEFAULT_WIDGETS,
  enabledWidgets: ['clock', 'timer', 'crypto', 'notes', 'tasks', 'calc'],
  language: 'cs',
};

export function loadUserConfig(): UserConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY) || localStorage.getItem(LEGACY_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);

    // Migration and normalization
    const widgets: WidgetCustomization = {
      ...DEFAULT_WIDGETS,
      ...(parsed.widgets || {}),
      dailyTasks: Array.isArray(parsed.widgets?.dailyTasks)
        ? parsed.widgets.dailyTasks
        : DEFAULT_TASKS,
      enabledWidgets: Array.isArray(parsed.widgets?.enabledWidgets)
        ? parsed.widgets.enabledWidgets
        : Array.isArray(parsed.enabledWidgets)
        ? parsed.enabledWidgets
        : DEFAULT_WIDGETS.enabledWidgets,
    };

    const themeId: ThemeId = parsed.themeId || (parsed.theme === 'light' ? 'light' : 'midnight');

    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      defaultCurrency: parsed.defaultCurrency || 'CZK',
      themeId,
      widgets,
      enabledWidgets: widgets.enabledWidgets,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveUserConfig(config: UserConfig): void {
  try {
    const payload: UserConfig = {
      ...config,
      version: 2,
      enabledWidgets: config.widgets?.enabledWidgets || config.enabledWidgets,
    };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(payload, null, 2));
  } catch (e) {
    console.error('Failed to save user config:', e);
  }
}

export function validateConfigJson(jsonString: string): { valid: boolean; config?: UserConfig; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== 'object' || parsed === null) {
      return { valid: false, error: 'Konfigurace musí být platný JSON objekt.' };
    }

    const config: UserConfig = {
      version: 2,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : DEFAULT_CONFIG.favorites,
      recentToolIds: Array.isArray(parsed.recentToolIds) ? parsed.recentToolIds : DEFAULT_CONFIG.recentToolIds,
      simulatedOffline: Boolean(parsed.simulatedOffline),
      theme: parsed.theme === 'light' ? 'light' : 'dark',
      themeId: ['midnight', 'oled', 'graphite', 'emerald', 'purple', 'light'].includes(parsed.themeId)
        ? parsed.themeId
        : 'midnight',
      defaultCurrency: parsed.defaultCurrency || 'CZK',
      widgets: {
        enabledWidgets: Array.isArray(parsed.widgets?.enabledWidgets)
          ? parsed.widgets.enabledWidgets
          : Array.isArray(parsed.enabledWidgets)
          ? parsed.enabledWidgets
          : DEFAULT_WIDGETS.enabledWidgets,
        selectedCity: parsed.widgets?.selectedCity || DEFAULT_WIDGETS.selectedCity,
        selectedCityName: parsed.widgets?.selectedCityName || DEFAULT_WIDGETS.selectedCityName,
        selectedFiat: parsed.widgets?.selectedFiat || DEFAULT_WIDGETS.selectedFiat,
        selectedCrypto: parsed.widgets?.selectedCrypto || DEFAULT_WIDGETS.selectedCrypto,
        quickNote: typeof parsed.widgets?.quickNote === 'string' ? parsed.widgets.quickNote : DEFAULT_WIDGETS.quickNote,
        dailyTasks: Array.isArray(parsed.widgets?.dailyTasks) ? parsed.widgets.dailyTasks : DEFAULT_TASKS,
      },
      language: ['cs', 'en', 'ru', 'de', 'es'].includes(parsed.language) ? parsed.language : 'cs',
    };

    config.enabledWidgets = config.widgets.enabledWidgets;
    return { valid: true, config };
  } catch (e) {
    return { valid: false, error: (e as Error).message || 'Chyba parsování JSON syntaxe.' };
  }
}
