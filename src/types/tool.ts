import React from 'react';

export type ToolCategory =
  | 'all'
  | 'basic'
  | 'favorites'
  | 'files'
  | 'programming'
  | 'planning'
  | 'math'
  | 'science'
  | 'finance'
  | 'utilities'
  | 'architecture';

export interface ToolDefinition {
  id: string;
  title: string;
  shortDesc: string;
  category: 'files' | 'programming' | 'planning' | 'math' | 'science' | 'finance' | 'utilities';
  icon: string;
  requiresOnline?: boolean;
  isBasic?: boolean;
  component: React.ComponentType | React.LazyExoticComponent<React.ComponentType>;
  tags: string[];
}

export type ThemeId =
  | 'midnight'
  | 'oled'
  | 'graphite'
  | 'emerald'
  | 'purple'
  | 'nord'
  | 'sunset'
  | 'ocean'
  | 'rose'
  | 'light'
  | 'sand'
  | 'mint';

export interface DailyTask {
  id: string;
  text: string;
  done: boolean;
}

export interface WidgetCustomization {
  enabledWidgets: string[];
  selectedCity: string;
  selectedCityName: string;
  selectedFiat: string;
  selectedCrypto: string;
  selectedCities?: string[];
  selectedFiats?: string[];
  selectedCryptos?: string[];
  timerDurationMinutes?: number;
  quickNote: string;
  dailyTasks?: DailyTask[];
}

export type McpTransportMode = 'websocket' | 'stdio';
export type McpAccessMode = 'readonly' | 'readwrite';

export interface McpBridgeConfig {
  enabled: boolean;
  transport: McpTransportMode;
  wsUrl: string;
  accessMode: McpAccessMode;
  authToken?: string;
}

export type BuiltinShortcutActionId =
  | 'openSearch'
  | 'openSettings'
  | 'toggleSidebar'
  | 'goBack'
  | 'openShortcutsHelp';

export type ShortcutBindings = Record<BuiltinShortcutActionId, string>;

export interface CustomToolShortcut {
  id: string;
  toolId: string;
  combo: string;
}

export interface DesktopBehaviorConfig {
  closeToTray: boolean;
}

export interface UserConfig {
  version?: number;
  exportedAt?: string;
  favorites: string[];
  recentToolIds: string[];
  simulatedOffline: boolean;
  theme: 'dark' | 'light';
  themeId: ThemeId;
  defaultCurrency?: string; // e.g. 'CZK', 'EUR', 'USD'
  widgets: WidgetCustomization;
  enabledWidgets?: string[];
  language?: string;
  mcp?: McpBridgeConfig;
  shortcuts?: ShortcutBindings;
  customToolShortcuts?: CustomToolShortcut[];
  desktop?: DesktopBehaviorConfig;
}
