import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashMasterKey,
  verifyMasterKey,
  encryptJsonPayload,
  decryptJsonPayload,
  calculateEntropy,
  getStorageAudit,
  purgeSensitiveData,
} from '../services/securityService';

describe('securityService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('hashes and verifies master PIN / passphrase with PBKDF2-SHA256', async () => {
    const { hashHex, saltHex } = await hashMasterKey('correct-horse-battery');
    expect(hashHex).toHaveLength(64);
    expect(saltHex).toHaveLength(32);

    expect(await verifyMasterKey('correct-horse-battery', hashHex, saltHex)).toBe(true);
    expect(await verifyMasterKey('wrong-passphrase', hashHex, saltHex)).toBe(false);
  });

  it('encrypts and decrypts JSON payloads using AES-256-GCM', async () => {
    const payload = { version: 2, favorites: ['text-editor'], language: 'en' };
    const encrypted = await encryptJsonPayload(payload, 'super-secret-passphrase');

    const envelope = JSON.parse(encrypted);
    expect(envelope.omnidesk_encrypted).toBe(true);
    expect(envelope.algo).toBe('AES-256-GCM');

    const decrypted = await decryptJsonPayload(encrypted, 'super-secret-passphrase');
    expect(decrypted).toEqual(payload);

    await expect(decryptJsonPayload(encrypted, 'incorrect-passphrase')).rejects.toThrow();
  });

  it('rejects non-OmniDesk payloads on decrypt', async () => {
    await expect(decryptJsonPayload('{"hello":"world"}', 'pass')).rejects.toThrow();
    await expect(decryptJsonPayload('not-json', 'pass')).rejects.toThrow();
  });

  it('calculates password entropy and strength score', () => {
    const weak = calculateEntropy('1234');
    expect(weak.level).toBe('weak');
    expect(weak.score).toBeLessThanOrEqual(1);

    const strong = calculateEntropy('V3ry$tr0ng!OmniDesk#Key2026');
    expect(strong.level).toBe('excellent');
    expect(strong.score).toBe(4);
    expect(strong.bits).toBeGreaterThanOrEqual(80);
  });

  it('audits localStorage and purges sensitive notes and tasks', () => {
    localStorage.setItem(
      'omnidesk_user_config_v2',
      JSON.stringify({
        version: 2,
        widgets: { quickNote: 'Secret note', dailyTasks: [{ id: '1', text: 'Task', done: false }] },
      }),
    );
    localStorage.setItem('omnidesk_notes_v1', 'Private note');
    localStorage.setItem('omnidesk_scratchpad_data', 'Draft');

    const auditBefore = getStorageAudit();
    expect(auditBefore.length).toBe(3);

    purgeSensitiveData();

    const updatedConfig = JSON.parse(localStorage.getItem('omnidesk_user_config_v2') || '{}');
    expect(updatedConfig.widgets.quickNote).toBe('');
    expect(updatedConfig.widgets.dailyTasks).toEqual([]);
    expect(localStorage.getItem('omnidesk_notes_v1')).toBeNull();
    expect(localStorage.getItem('omnidesk_scratchpad_data')).toBeNull();
  });
});
