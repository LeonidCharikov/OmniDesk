import { describe, it, expect, beforeEach } from 'vitest';
import { TOOLS_REGISTRY } from '../tools/registry';
import { DEFAULT_CONFIG } from '../services/storage';
import {
  DEFAULT_SHORTCUTS,
  findShortcutConflict,
  matchesShortcutCombo,
  normalizeComboString,
  normalizeKeyEventToCombo,
} from '../services/shortcutsService';
import {
  PIPE_TARGET_OPTIONS,
  clearPendingToolPipe,
  consumePendingToolPipe,
  getMatchingToolIdsForFile,
  setPendingToolPipe,
} from '../services/toolPipeService';
import {
  buildFullWorkspaceBackup,
  isFullWorkspaceBackup,
  restoreFullWorkspaceBackup,
} from '../services/workspaceBackupService';
import {
  WORKSPACE_PRESETS,
  applyWorkspacePreset,
} from '../services/workspacePresetsService';
import { toastService } from '../services/toastService';

const VALID_TOOL_IDS = new Set(TOOLS_REGISTRY.map(t => t.id));
const VALID_WIDGET_IDS = new Set(['clock', 'timer', 'crypto', 'calc', 'tasks', 'notes', 'system']);

describe('shortcutsService', () => {
  it('normalizes keyboard events and combo strings consistently', () => {
    expect(normalizeKeyEventToCombo(new KeyboardEvent('keydown', { key: 'Control', ctrlKey: true }))).toBeNull();
    expect(normalizeKeyEventToCombo(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))).toBe('Ctrl+K');
    expect(normalizeKeyEventToCombo(new KeyboardEvent('keydown', { key: '?', shiftKey: true }))).toBe('Shift+?');
    expect(normalizeComboString('cmd+shift+p')).toBe('Ctrl+Shift+P');
    expect(normalizeComboString('option+ArrowLeft')).toBe('Alt+ArrowLeft');
  });

  it('matches shortcut combos accurately including Shift+?', () => {
    const searchEv = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
    expect(matchesShortcutCombo(searchEv, DEFAULT_SHORTCUTS.openSearch)).toBe(true);
    expect(matchesShortcutCombo(searchEv, 'Ctrl+B')).toBe(false);

    const helpEv = new KeyboardEvent('keydown', { key: '?', shiftKey: true });
    expect(matchesShortcutCombo(helpEv, 'Shift+?')).toBe(true);
  });

  it('detects conflicts between built-in and custom tool shortcuts', () => {
    const custom = [{ id: 'c1', toolId: 'calendar', combo: 'Ctrl+Alt+C' }];
    expect(findShortcutConflict('ctrl+k', DEFAULT_SHORTCUTS, custom)).toEqual({
      type: 'builtin',
      id: 'openSearch',
    });
    expect(findShortcutConflict('ctrl+alt+c', DEFAULT_SHORTCUTS, custom)).toEqual({
      type: 'custom',
      id: 'c1',
    });
    expect(findShortcutConflict('ctrl+alt+c', DEFAULT_SHORTCUTS, custom, 'c1')).toBeNull();
    expect(findShortcutConflict('ctrl+alt+j', DEFAULT_SHORTCUTS, custom)).toBeNull();
  });
});

describe('toolPipeService & Smart Drop routing', () => {
  beforeEach(() => {
    clearPendingToolPipe();
  });

  it('consumes pending pipe payload once and clears it immediately from RAM', () => {
    setPendingToolPipe('json-formatter', { kind: 'text', text: '{"hello":true}', sourceToolId: 'notes' });

    expect(consumePendingToolPipe('text-diff')).toBeNull();
    expect(consumePendingToolPipe('json-formatter')).toEqual({
      kind: 'text',
      text: '{"hello":true}',
      sourceToolId: 'notes',
    });
    expect(consumePendingToolPipe('json-formatter')).toBeNull();
  });

  it('only references valid TOOLS_REGISTRY IDs in PIPE_TARGET_OPTIONS and file matching', () => {
    for (const option of PIPE_TARGET_OPTIONS) {
      expect(VALID_TOOL_IDS.has(option.toolId)).toBe(true);
    }

    const sampleFiles: Array<[string, string]> = [
      ['invoice.pdf', 'application/pdf'],
      ['report.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      ['photo.png', 'image/png'],
      ['data.json', 'application/json'],
      ['table.csv', 'text/csv'],
      ['config.yaml', ''],
      ['feed.xml', 'application/xml'],
      ['notes.md', 'text/markdown'],
      ['clip.mp3', 'audio/mpeg'],
      ['readme.txt', 'text/plain'],
      ['archive.bin', 'application/octet-stream'],
    ];

    for (const [name, mime] of sampleFiles) {
      const matchedIds = getMatchingToolIdsForFile(name, mime);
      expect(matchedIds.length).toBeGreaterThan(0);
      for (const id of matchedIds) {
        expect(VALID_TOOL_IDS.has(id)).toBe(true);
      }
    }
  });
});

describe('workspaceBackupService & workspacePresetsService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('builds and restores full workspace backups while filtering non-OmniDesk storage keys', () => {
    localStorage.setItem('omnidesk-notes', JSON.stringify([{ id: 1, title: 'Note A', body: 'Hello' }]));
    localStorage.setItem('omnidesk_calendar_events', JSON.stringify([{ id: 'e1', title: 'Standup', date: '2026-01-01' }]));
    localStorage.setItem('unrelated_third_party_key', 'should_not_export');

    const backup = buildFullWorkspaceBackup(DEFAULT_CONFIG);
    expect(isFullWorkspaceBackup(backup)).toBe(true);
    expect(backup.storageData['omnidesk-notes']).toBeTruthy();
    expect(backup.storageData['omnidesk_calendar_events']).toBeTruthy();
    expect(backup.storageData['unrelated_third_party_key']).toBeUndefined();

    localStorage.clear();
    const restored = restoreFullWorkspaceBackup(backup);
    expect(restored.valid).toBe(true);
    expect(restored.restoredKeys).toBe(2);
    expect(localStorage.getItem('omnidesk-notes')).toContain('Note A');
    expect(localStorage.getItem('omnidesk_calendar_events')).toContain('Standup');
  });

  it('defines valid preset favorites and widget IDs and applies presets cleanly', () => {
    for (const preset of WORKSPACE_PRESETS) {
      expect(preset.favorites.length).toBeGreaterThan(0);
      for (const toolId of preset.favorites) {
        expect(VALID_TOOL_IDS.has(toolId)).toBe(true);
      }
      for (const widgetId of preset.enabledWidgets) {
        expect(VALID_WIDGET_IDS.has(widgetId)).toBe(true);
      }

      const applied = applyWorkspacePreset(DEFAULT_CONFIG, preset.id);
      expect(applied.favorites).toEqual(preset.favorites);
      expect(applied.widgets.enabledWidgets).toEqual(preset.enabledWidgets);
    }
  });
});

describe('toastService', () => {
  it('publishes and dismisses toast notifications', () => {
    let latest: Array<{ id: string; title: string }> = [];
    const unsubscribe = toastService.subscribe(items => {
      latest = items;
    });

    const id = toastService.show({ type: 'success', title: 'Saved!', durationMs: 0 });
    expect(latest.some(t => t.id === id && t.title === 'Saved!')).toBe(true);

    toastService.dismiss(id);
    expect(latest.some(t => t.id === id)).toBe(false);
    unsubscribe();
  });
});
