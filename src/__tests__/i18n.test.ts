import { describe, it, expect } from 'vitest';
import en from '../locales/en.json';
import cs from '../locales/cs.json';
import de from '../locales/de.json';
import es from '../locales/es.json';
import ru from '../locales/ru.json';

describe('i18n locale parity', () => {
  const locales = { en, cs, de, es, ru } as const;
  const enKeys = Object.keys(en).sort();

  it('ensures all 5 locale files share the exact same key set', () => {
    for (const [lang, dict] of Object.entries(locales)) {
      const keys = Object.keys(dict).sort();
      expect(keys, `${lang}.json key set differs from en.json`).toEqual(enKeys);
    }
  });

  it('ensures no translation value is empty across any locale', () => {
    for (const [lang, dict] of Object.entries(locales)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(typeof value, `${lang}:${key} should be string`).toBe('string');
        expect((value as string).trim().length, `${lang}:${key} should not be empty`).toBeGreaterThan(0);
      }
    }
  });
});
