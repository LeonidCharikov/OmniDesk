import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_LOCAL_MIRROR_LIMIT_BYTES,
  loadToolData,
  saveToolData,
} from '../services/idbStorage';
import { checkForDesktopUpdate, isDesktopUpdaterConfigured } from '../services/updaterService';

describe('idbStorage service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('migrates and loads pre-existing localStorage data gracefully when IndexedDB is unavailable', async () => {
    localStorage.setItem('omnidesk_test_tool', 'hello-world');
    const loaded = await loadToolData('omnidesk_test_tool');
    expect(loaded).toBe('hello-world');
  });

  it('mirrors small payloads to localStorage and sheds oversized payloads', async () => {
    const smallPayload = JSON.stringify({ title: 'Small note' });
    await saveToolData('omnidesk_small_key', smallPayload, 1024);
    expect(localStorage.getItem('omnidesk_small_key')).toBe(smallPayload);

    const largePayload = 'x'.repeat(DEFAULT_LOCAL_MIRROR_LIMIT_BYTES + 2048);
    await saveToolData('omnidesk_small_key', largePayload, DEFAULT_LOCAL_MIRROR_LIMIT_BYTES);
    expect(localStorage.getItem('omnidesk_small_key')).toBeNull();
  });
});

describe('updaterService web safety guards', () => {
  it('returns web-unsupported when running outside Tauri', async () => {
    expect(await isDesktopUpdaterConfigured()).toBe(false);
    const status = await checkForDesktopUpdate();
    expect(status.status).toBe('web-unsupported');
    expect(status.currentVersion).toBe('web');
  });
});
