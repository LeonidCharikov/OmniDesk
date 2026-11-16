import { UserConfig } from '../types/tool';

export interface WorkspacePreset {
  id: 'developer' | 'student_science' | 'finance_planner';
  nameKey: string;
  defaultName: string;
  descKey: string;
  defaultDesc: string;
  favorites: string[];
  enabledWidgets: string[];
}

export const WORKSPACE_PRESETS: WorkspacePreset[] = [
  {
    id: 'developer',
    nameKey: 'preset_developer_name',
    defaultName: 'Developer Workstation',
    descKey: 'preset_developer_desc',
    defaultDesc: 'Pins JSON, Diff, Regex, Hash, Cron & API tools with quick notes, tasks, calculator, and system gauge widgets.',
    favorites: ['json-formatter', 'text-diff', 'hash-checksum-suite', 'regex-encoder', 'api-tester', 'encoding-suite'],
    enabledWidgets: ['clock', 'notes', 'tasks', 'calc', 'system'],
  } as WorkspacePreset,
  {
    id: 'student_science',
    nameKey: 'preset_student_name',
    defaultName: 'Student & Science Lab',
    descKey: 'preset_student_desc',
    defaultDesc: 'Pins PDF Studio, Chemistry, 2D Grapher, LaTeX, Flashcards & Pomodoro with timer, notes, and calculator widgets.',
    favorites: ['pdf-editor', 'scientific-calc', 'function-grapher', 'chemistry-tool', 'latex-visualizer', 'flashcards-study'],
    enabledWidgets: ['timer', 'notes', 'tasks', 'calc', 'clock'],
  },
  {
    id: 'finance_planner',
    nameKey: 'preset_finance_name',
    defaultName: 'Finance & Daily Planner',
    descKey: 'preset_finance_desc',
    defaultDesc: 'Pins Calendar, Currency & Crypto, Loan Calculator, Expense Tracker & Shopping List with clock and ticker widgets.',
    favorites: ['calendar', 'currency-crypto', 'loan-calc', 'budget-tracker', 'shopping-list', 'notes'],
    enabledWidgets: ['clock', 'crypto', 'tasks', 'notes', 'calc'],
  },
];

export function applyWorkspacePreset(config: UserConfig, presetId: WorkspacePreset['id']): UserConfig {
  const preset = WORKSPACE_PRESETS.find(p => p.id === presetId);
  if (!preset) return config;

  return {
    ...config,
    favorites: [...preset.favorites],
    enabledWidgets: [...preset.enabledWidgets],
    widgets: {
      ...config.widgets,
      enabledWidgets: [...preset.enabledWidgets],
    },
  };
}
