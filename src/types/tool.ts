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

export interface UserConfig {
  favorites: string[];
  recentToolIds: string[];
  simulatedOffline: boolean;
  theme: 'dark' | 'light';
}
