import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_LOCAL_MIRROR_LIMIT_BYTES,
  loadToolData,
  saveToolData,
} from '../services/idbStorage';
import { checkForDesktopUpdate, compareSemver, isDesktopUpdaterConfigured } from '../services/updaterService';

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

describe('updaterService web safety guards & semver', () => {
  it('returns web-unsupported when running outside Tauri', async () => {
    expect(await isDesktopUpdaterConfigured()).toBe(false);
    const status = await checkForDesktopUpdate();
    expect(status.status).toBe('web-unsupported');
    expect(status.currentVersion).toBe('web');
  });

  it('compares semantic versions accurately', () => {
    expect(compareSemver('v0.1.17', '0.1.16')).toBe(1);
    expect(compareSemver('0.2.0', '0.1.99')).toBe(1);
    expect(compareSemver('v0.1.16', '0.1.16')).toBe(0);
    expect(compareSemver('0.1.15', '0.1.16')).toBe(-1);
  });
});
