import React from 'react';

export type ToolCategory = 'all' | 'favorites' | 'files' | 'math' | 'science' | 'finance' | 'utilities' | 'architecture';

export interface ToolDefinition {
  id: string;
  title: string;
  shortDesc: string;
  category: 'files' | 'math' | 'science' | 'finance' | 'utilities';
  icon: string;
  requiresOnline?: boolean;
  component: React.ComponentType;
  tags: string[];
}

export type ThemeId = 'midnight' | 'oled' | 'graphite' | 'emerald' | 'purple' | 'light';

export interface WidgetCustomization {
  enabledWidgets: string[];
  selectedCity: string;
  selectedCityName: string;
  selectedFiat: string;
  selectedCrypto: string;
  quickNote: string;
}

export interface UserConfig {
  version?: number;
  exportedAt?: string;
  favorites: string[];
  recentToolIds: string[];
  simulatedOffline: boolean;
  theme: 'dark' | 'light';
  themeId: ThemeId;
  widgets: WidgetCustomization;
  enabledWidgets?: string[];
  language?: string;
}
