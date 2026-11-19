import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_CONFIG,
  loadUserConfig,
  saveUserConfig,
  validateConfigJson,
} from '../services/storage';

describe('storage service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns DEFAULT_CONFIG when localStorage is empty or corrupted', () => {
    expect(loadUserConfig()).toEqual(DEFAULT_CONFIG);

    localStorage.setItem('omnidesk_user_config_v2', '{corrupted-json');
    expect(loadUserConfig()).toEqual(DEFAULT_CONFIG);
  });

  it('persists and reloads normalized configuration', () => {
    const custom = {
      ...DEFAULT_CONFIG,
      language: 'de',
      simulatedOffline: true,
      recentToolIds: ['pdf-editor', 'json-formatter'],
      widgets: {
        ...DEFAULT_CONFIG.widgets,
        timerDurationMinutes: 45,
      },
    };
    saveUserConfig(custom);

    const loaded = loadUserConfig();
    expect(loaded.language).toBe('de');
    expect(loaded.simulatedOffline).toBe(true);
    expect(loaded.recentToolIds).toEqual(['pdf-editor', 'json-formatter']);
    expect(loaded.widgets.timerDurationMinutes).toBe(45);
  });

  it('validates imported config JSON and clamps invalid values safely', () => {
    const invalidSyntax = validateConfigJson('not-valid');
    expect(invalidSyntax.valid).toBe(false);

    const nonObject = validateConfigJson('null');
    expect(nonObject.valid).toBe(false);

    const validImport = validateConfigJson(
      JSON.stringify({
        language: 'es',
        themeId: 'emerald',
        widgets: {
          timerDurationMinutes: 9999,
          selectedCities: ['Europe/Prague', 'America/New_York', 'Asia/Tokyo', 'Extra/City'],
        },
      }),
    );

    expect(validImport.valid).toBe(true);
    expect(validImport.config?.language).toBe('es');
    expect(validImport.config?.themeId).toBe('emerald');
    expect(validImport.config?.widgets.timerDurationMinutes).toBe(180);
    expect(validImport.config?.widgets.selectedCities).toHaveLength(3);
  });

  it('supports all 10 themes and strips legacy security fields safely', () => {
    const sandImport = validateConfigJson(JSON.stringify({ themeId: 'sand' }));
    expect(sandImport.valid).toBe(true);
    expect(sandImport.config?.themeId).toBe('sand');
    expect(sandImport.config?.theme).toBe('light');

    const nordImport = validateConfigJson(JSON.stringify({ themeId: 'nord' }));
    expect(nordImport.valid).toBe(true);
    expect(nordImport.config?.themeId).toBe('nord');
    expect(nordImport.config?.theme).toBe('dark');

    localStorage.setItem(
      'omnidesk_user_config_v2',
      JSON.stringify({
        version: 2,
        themeId: 'ocean',
        security: { lockEnabled: true, pinHash: 'legacy', pinSalt: 'legacy' },
      }),
    );
    const loaded = loadUserConfig() as unknown as Record<string, unknown>;
    expect(loaded.themeId).toBe('ocean');
    expect(loaded.security).toBeUndefined();
  });
});
