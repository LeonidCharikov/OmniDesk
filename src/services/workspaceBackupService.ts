import { UserConfig } from '../types/tool';
import { validateConfigJson } from './storage';

export interface FullWorkspaceBackupPayload {
  omnidesk_full_workspace: true;
  version: 2;
  exportedAt: string;
  config: UserConfig;
  storageData: Record<string, string>;
}

const KNOWN_WORKSPACE_KEYS = [
  'omnidesk_user_config_v2',
  'omnidesk_language',
  'omnidesk_calendar_events',
  'omnidesk-kanban-board-v2',
  'omnidesk-notes',
  'omnidesk_expenses_v1',
  'omnidesk_shopping_list_v1',
  'omnidesk_habits_v1',
  'omnidesk_packing_v1',
  'omnidesk_flashcards_v1',
  'omnidesk_countdowns_v1',
  'omnidesk_fiat_rates_v1',
  'omnidesk_crypto_rates_v1',
  'omnidesk_custom_crypto_v1',
  'omnidesk_rates_timestamp_v1',
];

function isAllowedWorkspaceKey(key: string): boolean {
  if (KNOWN_WORKSPACE_KEYS.includes(key)) return true;
  return key.startsWith('omnidesk_') || key.startsWith('omnidesk-');
}

export function buildFullWorkspaceBackup(config: UserConfig): FullWorkspaceBackupPayload {
  const storageData: Record<string, string> = {};

  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !isAllowedWorkspaceKey(key)) continue;
      const val = localStorage.getItem(key);
      if (typeof val === 'string') {
        storageData[key] = val;
      }
    }
  }

  return {
    omnidesk_full_workspace: true,
    version: 2,
    exportedAt: new Date().toISOString(),
    config: {
      ...config,
      version: 2,
      exportedAt: new Date().toISOString(),
    },
    storageData,
  };
}

export function isFullWorkspaceBackup(parsed: unknown): parsed is FullWorkspaceBackupPayload {
  if (typeof parsed !== 'object' || parsed === null) return false;
  const candidate = parsed as Partial<FullWorkspaceBackupPayload>;
  return (
    candidate.omnidesk_full_workspace === true &&
    typeof candidate.config === 'object' &&
    candidate.config !== null &&
    typeof candidate.storageData === 'object' &&
    candidate.storageData !== null
  );
}

export function restoreFullWorkspaceBackup(
  payload: FullWorkspaceBackupPayload
): { valid: boolean; config?: UserConfig; restoredKeys: number; error?: string } {
  const validated = validateConfigJson(JSON.stringify(payload.config));
  if (!validated.valid || !validated.config) {
    return { valid: false, restoredKeys: 0, error: validated.error || 'Invalid workspace backup config.' };
  }

  let restoredKeys = 0;
  if (typeof localStorage !== 'undefined') {
    for (const [key, value] of Object.entries(payload.storageData)) {
      if (!isAllowedWorkspaceKey(key) || typeof value !== 'string') continue;
      if (key === 'omnidesk_user_config_v2') continue;
      localStorage.setItem(key, value);
      restoredKeys += 1;
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('omnidesk-calendar-updated'));
    window.dispatchEvent(new CustomEvent('omnidesk-kanban-updated'));
    window.dispatchEvent(new CustomEvent('omnidesk-notes-updated'));
  }

  return { valid: true, config: validated.config, restoredKeys };
}
