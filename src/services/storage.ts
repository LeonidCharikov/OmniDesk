import {
  UserConfig,
  WidgetCustomization,
  ThemeId,
  DailyTask,
  McpBridgeConfig,
  ShortcutBindings,
  CustomToolShortcut,
  DesktopBehaviorConfig,
} from '../types/tool';
import { DEFAULT_SHORTCUTS, normalizeComboString } from './shortcutsService';
import { isLightTheme, isValidThemeId } from './themes';
import { normalizeWidgetSlotList } from '../utils/widgetCustomization';

const CONFIG_KEY = 'omnidesk_user_config_v2';
const LEGACY_KEY = 'omnidesk_user_config_v1';

export const DEFAULT_TASKS: DailyTask[] = [
  { id: '1', text: 'Check daily tasks', done: false },
  { id: '2', text: 'Calculations & currency conversion', done: true },
  { id: '3', text: 'Pomodoro focus block', done: false },
];

export const DEFAULT_WIDGETS: WidgetCustomization = {
  enabledWidgets: ['clock', 'timer', 'crypto', 'notes', 'tasks', 'calc'],
  selectedCity: 'Europe/Prague',
  selectedCityName: 'Prague',
  selectedFiat: 'CZK',
  selectedCrypto: 'BTC',
  selectedCities: ['Europe/Prague'],
  selectedFiats: ['CZK'],
  selectedCryptos: ['BTC'],
  timerDurationMinutes: 25,
  quickNote: 'OmniDesk quick note...',
  dailyTasks: DEFAULT_TASKS,
};

export const DEFAULT_MCP: McpBridgeConfig = {
  enabled: false,
  transport: 'websocket',
  wsUrl: 'ws://127.0.0.1:3847/bridge',
  accessMode: 'readonly',
};

export const DEFAULT_DESKTOP: DesktopBehaviorConfig = {
  closeToTray: false,
};

export const DEFAULT_CONFIG: UserConfig = {
  version: 2,
  favorites: ['text-editor', 'multi-converter', 'unit-converter', 'currency-crypto', 'pomodoro-timer'],
  recentToolIds: ['text-editor'],
  simulatedOffline: false,
  theme: 'dark',
  themeId: 'midnight',
  defaultCurrency: 'CZK',
  widgets: DEFAULT_WIDGETS,
  enabledWidgets: ['clock', 'timer', 'crypto', 'notes', 'tasks', 'calc'],
  language: 'en',
  mcp: DEFAULT_MCP,
  shortcuts: { ...DEFAULT_SHORTCUTS },
  customToolShortcuts: [],
  desktop: { ...DEFAULT_DESKTOP },
};

function normalizeShortcuts(raw: unknown): ShortcutBindings {
  const input = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    openSearch:
      typeof input.openSearch === 'string' && normalizeComboString(input.openSearch)
        ? normalizeComboString(input.openSearch)
        : DEFAULT_SHORTCUTS.openSearch,
    openSettings:
      typeof input.openSettings === 'string' && normalizeComboString(input.openSettings)
        ? normalizeComboString(input.openSettings)
        : DEFAULT_SHORTCUTS.openSettings,
    toggleSidebar:
      typeof input.toggleSidebar === 'string' && normalizeComboString(input.toggleSidebar)
        ? normalizeComboString(input.toggleSidebar)
        : DEFAULT_SHORTCUTS.toggleSidebar,
    goBack:
      typeof input.goBack === 'string' && normalizeComboString(input.goBack)
        ? normalizeComboString(input.goBack)
        : DEFAULT_SHORTCUTS.goBack,
    openShortcutsHelp:
      typeof input.openShortcutsHelp === 'string' && normalizeComboString(input.openShortcutsHelp)
        ? normalizeComboString(input.openShortcutsHelp)
        : DEFAULT_SHORTCUTS.openShortcutsHelp,
  };
}

function normalizeCustomToolShortcuts(raw: unknown): CustomToolShortcut[] {
  if (!Array.isArray(raw)) return [];
  const valid: CustomToolShortcut[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const candidate = item as Partial<CustomToolShortcut>;
    const combo = typeof candidate.combo === 'string' ? normalizeComboString(candidate.combo) : '';
    if (typeof candidate.toolId === 'string' && candidate.toolId.trim() && combo) {
      valid.push({
        id:
          typeof candidate.id === 'string' && candidate.id.trim()
            ? candidate.id
            : `custom-${candidate.toolId}-${valid.length + 1}`,
        toolId: candidate.toolId.trim(),
        combo,
      });
    }
  }
  return valid;
}

export function loadUserConfig(): UserConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY) || localStorage.getItem(LEGACY_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);

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
      selectedCities: normalizeWidgetSlotList(
        parsed.widgets?.selectedCities,
        parsed.widgets?.selectedCity || DEFAULT_WIDGETS.selectedCity
      ),
      selectedFiats: normalizeWidgetSlotList(
        parsed.widgets?.selectedFiats,
        parsed.widgets?.selectedFiat || DEFAULT_WIDGETS.selectedFiat
      ),
      selectedCryptos: normalizeWidgetSlotList(
        parsed.widgets?.selectedCryptos,
        parsed.widgets?.selectedCrypto || DEFAULT_WIDGETS.selectedCrypto
      ),
      timerDurationMinutes:
        typeof parsed.widgets?.timerDurationMinutes === 'number'
          ? Math.min(180, Math.max(1, parsed.widgets.timerDurationMinutes))
          : DEFAULT_WIDGETS.timerDurationMinutes,
    };

    const themeId: ThemeId = isValidThemeId(parsed.themeId)
      ? parsed.themeId
      : parsed.theme === 'light'
      ? 'light'
      : 'midnight';

    const mcp: McpBridgeConfig = {
      enabled: Boolean(parsed.mcp?.enabled),
      transport: parsed.mcp?.transport === 'stdio' ? 'stdio' : 'websocket',
      wsUrl:
        typeof parsed.mcp?.wsUrl === 'string' && parsed.mcp.wsUrl.trim()
          ? parsed.mcp.wsUrl.trim()
          : DEFAULT_MCP.wsUrl,
      accessMode: parsed.mcp?.accessMode === 'readwrite' ? 'readwrite' : 'readonly',
      authToken:
        typeof parsed.mcp?.authToken === 'string' && parsed.mcp.authToken.trim()
          ? parsed.mcp.authToken.trim()
          : undefined,
    };

    const shortcuts = normalizeShortcuts(parsed.shortcuts);
    const customToolShortcuts = normalizeCustomToolShortcuts(parsed.customToolShortcuts);
    const desktop: DesktopBehaviorConfig = {
      closeToTray: Boolean(parsed.desktop?.closeToTray),
    };

    const { security: _legacySecurity, ...restParsed } = parsed as Record<string, unknown>;
    void _legacySecurity;

    return {
      ...DEFAULT_CONFIG,
      ...restParsed,
      defaultCurrency: parsed.defaultCurrency || 'CZK',
      theme: isLightTheme(themeId) ? 'light' : 'dark',
      themeId,
      widgets,
      enabledWidgets: widgets.enabledWidgets,
      mcp,
      shortcuts,
      customToolShortcuts,
      desktop,
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
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('omnidesk-config-updated', { detail: payload }));
    }
  } catch (e) {
    console.error('Failed to save user config:', e);
  }
}

export function validateConfigJson(
  jsonString: string
): { valid: boolean; config?: UserConfig; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed !== 'object' || parsed === null) {
      return { valid: false, error: 'Configuration must be a valid JSON object.' };
    }

    const themeId: ThemeId = isValidThemeId(parsed.themeId)
      ? parsed.themeId
      : parsed.theme === 'light'
      ? 'light'
      : 'midnight';

    const config: UserConfig = {
      version: 2,
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : DEFAULT_CONFIG.favorites,
      recentToolIds: Array.isArray(parsed.recentToolIds)
        ? parsed.recentToolIds
        : DEFAULT_CONFIG.recentToolIds,
      simulatedOffline: Boolean(parsed.simulatedOffline),
      theme: isLightTheme(themeId) ? 'light' : 'dark',
      themeId,
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
        selectedCities: normalizeWidgetSlotList(
          parsed.widgets?.selectedCities,
          parsed.widgets?.selectedCity || DEFAULT_WIDGETS.selectedCity
        ),
        selectedFiats: normalizeWidgetSlotList(
          parsed.widgets?.selectedFiats,
          parsed.widgets?.selectedFiat || DEFAULT_WIDGETS.selectedFiat
        ),
        selectedCryptos: normalizeWidgetSlotList(
          parsed.widgets?.selectedCryptos,
          parsed.widgets?.selectedCrypto || DEFAULT_WIDGETS.selectedCrypto
        ),
        timerDurationMinutes:
          typeof parsed.widgets?.timerDurationMinutes === 'number'
            ? Math.min(180, Math.max(1, parsed.widgets.timerDurationMinutes))
            : DEFAULT_WIDGETS.timerDurationMinutes,
        quickNote:
          typeof parsed.widgets?.quickNote === 'string'
            ? parsed.widgets.quickNote
            : DEFAULT_WIDGETS.quickNote,
        dailyTasks: Array.isArray(parsed.widgets?.dailyTasks)
          ? parsed.widgets.dailyTasks
          : DEFAULT_TASKS,
      },
      language: ['cs', 'en', 'ru', 'de', 'es'].includes(parsed.language) ? parsed.language : 'en',
      mcp: {
        enabled: Boolean(parsed.mcp?.enabled),
        transport: parsed.mcp?.transport === 'stdio' ? 'stdio' : 'websocket',
        wsUrl:
          typeof parsed.mcp?.wsUrl === 'string' && parsed.mcp.wsUrl.trim()
            ? parsed.mcp.wsUrl.trim()
            : DEFAULT_MCP.wsUrl,
        accessMode: parsed.mcp?.accessMode === 'readwrite' ? 'readwrite' : 'readonly',
        authToken:
          typeof parsed.mcp?.authToken === 'string' && parsed.mcp.authToken.trim()
            ? parsed.mcp.authToken.trim()
            : undefined,
      },
      shortcuts: normalizeShortcuts(parsed.shortcuts),
      customToolShortcuts: normalizeCustomToolShortcuts(parsed.customToolShortcuts),
      desktop: {
        closeToTray: Boolean(parsed.desktop?.closeToTray),
      },
    };

    config.enabledWidgets = config.widgets.enabledWidgets;
    return { valid: true, config };
  } catch (e) {
    return { valid: false, error: (e as Error).message || 'JSON syntax parsing error.' };
  }
}
