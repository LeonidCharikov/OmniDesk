import {
  BuiltinShortcutActionId,
  CustomToolShortcut,
  ShortcutBindings,
} from '../types/tool';

export interface BuiltinShortcutActionMeta {
  id: BuiltinShortcutActionId;
  labelKey: string;
  defaultLabel: string;
  defaultCombo: string;
}

export const DEFAULT_SHORTCUTS: ShortcutBindings = {
  openSearch: 'Ctrl+K',
  openSettings: 'Ctrl+,',
  toggleSidebar: 'Ctrl+B',
  goBack: 'Alt+ArrowLeft',
  lockWorkspace: 'Ctrl+Shift+L',
  openShortcutsHelp: 'Shift+?',
};

export const BUILTIN_SHORTCUT_ACTIONS: BuiltinShortcutActionMeta[] = [
  {
    id: 'openSearch',
    labelKey: 'shortcut_action_open_search',
    defaultLabel: 'Open Command Palette',
    defaultCombo: DEFAULT_SHORTCUTS.openSearch,
  },
  {
    id: 'openSettings',
    labelKey: 'shortcut_action_open_settings',
    defaultLabel: 'Open Settings',
    defaultCombo: DEFAULT_SHORTCUTS.openSettings,
  },
  {
    id: 'toggleSidebar',
    labelKey: 'shortcut_action_toggle_sidebar',
    defaultLabel: 'Toggle Sidebar',
    defaultCombo: DEFAULT_SHORTCUTS.toggleSidebar,
  },
  {
    id: 'goBack',
    labelKey: 'shortcut_action_go_back',
    defaultLabel: 'Back to Tool Grid',
    defaultCombo: DEFAULT_SHORTCUTS.goBack,
  },
  {
    id: 'lockWorkspace',
    labelKey: 'shortcut_action_lock_workspace',
    defaultLabel: 'Lock Workspace',
    defaultCombo: DEFAULT_SHORTCUTS.lockWorkspace,
  },
  {
    id: 'openShortcutsHelp',
    labelKey: 'shortcut_action_shortcuts_help',
    defaultLabel: 'Show Keyboard Shortcuts',
    defaultCombo: DEFAULT_SHORTCUTS.openShortcutsHelp,
  },
];

const IGNORED_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Dead']);

function normalizeKeyName(rawKey: string): string {
  if (rawKey === ' ') return 'Space';
  if (rawKey === ',') return ',';
  if (rawKey === '.') return '.';
  if (rawKey === '/') return '/';
  if (rawKey === '?') return '?';
  if (rawKey.length === 1) return rawKey.toUpperCase();
  return rawKey;
}

export function normalizeKeyEventToCombo(e: KeyboardEvent): string | null {
  if (IGNORED_KEYS.has(e.key)) return null;
  const key = normalizeKeyName(e.key);
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  // Avoid redundant Shift+? if key is already '?' unless Shift was explicitly included cleanly
  if (e.shiftKey && key !== '?') {
    parts.push('Shift');
  } else if (e.shiftKey && key === '?') {
    parts.push('Shift');
  }
  parts.push(key);
  return parts.join('+');
}

export function normalizeComboString(combo: string): string {
  const tokens = combo
    .split('+')
    .map(part => part.trim())
    .filter(Boolean);
  if (tokens.length === 0) return '';

  const hasCtrl = tokens.some(t => t.toLowerCase() === 'ctrl' || t.toLowerCase() === 'cmd' || t.toLowerCase() === 'meta');
  const hasAlt = tokens.some(t => t.toLowerCase() === 'alt' || t.toLowerCase() === 'option');
  const hasShift = tokens.some(t => t.toLowerCase() === 'shift');
  const mainKeyRaw = tokens.filter(
    t => !['ctrl', 'cmd', 'meta', 'alt', 'option', 'shift'].includes(t.toLowerCase())
  ).pop();

  if (!mainKeyRaw) return '';
  const mainKey = normalizeKeyName(mainKeyRaw);
  const out: string[] = [];
  if (hasCtrl) out.push('Ctrl');
  if (hasAlt) out.push('Alt');
  if (hasShift || mainKey === '?') out.push('Shift');
  out.push(mainKey);
  return out.join('+');
}

export function matchesShortcutCombo(e: KeyboardEvent, combo: string): boolean {
  const normalizedTarget = normalizeComboString(combo);
  if (!normalizedTarget) return false;

  // Special ergonomic support: pressing '?' alone (which produces e.key === '?' with e.shiftKey === true)
  if (normalizedTarget === 'Shift+?' && e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    return true;
  }

  const eventCombo = normalizeKeyEventToCombo(e);
  if (!eventCombo) return false;
  return eventCombo === normalizedTarget;
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((target as HTMLElement).isContentEditable) return true;
  return Boolean(target.closest('[contenteditable="true"]'));
}

export interface ShortcutConflict {
  type: 'builtin' | 'custom';
  id: string;
}

export function findShortcutConflict(
  candidateCombo: string,
  shortcuts: ShortcutBindings,
  customToolShortcuts: CustomToolShortcut[],
  ignoreId?: string
): ShortcutConflict | null {
  const normalized = normalizeComboString(candidateCombo);
  if (!normalized) return null;

  for (const action of BUILTIN_SHORTCUT_ACTIONS) {
    if (action.id === ignoreId) continue;
    if (normalizeComboString(shortcuts[action.id]) === normalized) {
      return { type: 'builtin', id: action.id };
    }
  }

  for (const custom of customToolShortcuts) {
    if (custom.id === ignoreId) continue;
    if (normalizeComboString(custom.combo) === normalized) {
      return { type: 'custom', id: custom.id };
    }
  }

  return null;
}
