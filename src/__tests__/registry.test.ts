import { describe, it, expect } from 'vitest';
import { TOOLS_REGISTRY } from '../tools/registry';

const VALID_CATEGORIES = new Set([
  'files',
  'programming',
  'planning',
  'math',
  'chemistry',
  'science',
  'finance',
  'design',
  'health',
  'utilities',
  'desktop',
]);

describe('TOOLS_REGISTRY', () => {
  it('contains all 138 tools with unique IDs and valid categories', () => {
    expect(TOOLS_REGISTRY.length).toBe(138);
    expect(TOOLS_REGISTRY.some(t => t.id === 'online-translator')).toBe(false);

    const ids = new Set<string>();
    const counts = new Map<string, number>();
    for (const tool of TOOLS_REGISTRY) {
      expect(tool.id).toBeTruthy();
      expect(ids.has(tool.id)).toBe(false);
      ids.add(tool.id);

      expect(VALID_CATEGORIES.has(tool.category)).toBe(true);
      counts.set(tool.category, (counts.get(tool.category) || 0) + 1);
      expect(tool.title.trim().length).toBeGreaterThan(0);
      expect(tool.shortDesc.trim().length).toBeGreaterThan(0);
      expect(tool.icon.trim().length).toBeGreaterThan(0);
      expect(Array.isArray(tool.tags)).toBe(true);
      expect(tool.tags.length).toBeGreaterThan(0);
      expect(tool.component).toBeTruthy();
    }

    for (const cat of VALID_CATEGORIES) {
      if (cat === 'desktop') {
        expect(counts.get(cat)).toBe(4);
      } else {
        expect(counts.get(cat) || 0).toBeGreaterThanOrEqual(5);
      }
    }

    const desktopTools = TOOLS_REGISTRY.filter(t => t.category === 'desktop');
    expect(desktopTools.every(t => t.desktopOnly === true)).toBe(true);
  });
});
