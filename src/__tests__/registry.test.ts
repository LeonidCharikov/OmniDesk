import { describe, it, expect } from 'vitest';
import { TOOLS_REGISTRY } from '../tools/registry';

const VALID_CATEGORIES = new Set([
  'files',
  'programming',
  'planning',
  'math',
  'science',
  'finance',
  'utilities',
]);

describe('TOOLS_REGISTRY', () => {
  it('contains all 134 tools with unique IDs and valid categories', () => {
    expect(TOOLS_REGISTRY.length).toBe(134);
    expect(TOOLS_REGISTRY.some(t => t.id === 'online-translator')).toBe(false);

    const ids = new Set<string>();
    for (const tool of TOOLS_REGISTRY) {
      expect(tool.id).toBeTruthy();
      expect(ids.has(tool.id)).toBe(false);
      ids.add(tool.id);

      expect(VALID_CATEGORIES.has(tool.category)).toBe(true);
      expect(tool.title.trim().length).toBeGreaterThan(0);
      expect(tool.shortDesc.trim().length).toBeGreaterThan(0);
      expect(tool.icon.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(tool.tags)).toBe(true);
      expect(tool.tags.length).toBeGreaterThan(0);
      expect(tool.component).toBeTruthy();
    }
  });
});
