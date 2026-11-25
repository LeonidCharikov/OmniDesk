import { describe, it, expect } from 'vitest';
import {
  normalizeWidgetSlotList,
  removeWidgetSlotAt,
  resizeWidgetSlotList,
  selectPrimaryWidgetSlot,
  updateWidgetSlotAt,
} from '../utils/widgetCustomization';

describe('widgetCustomization pure helpers', () => {
  const cities = ['Europe/Prague', 'Europe/London', 'America/New_York', 'Asia/Tokyo'];
  const fiats = ['CZK', 'EUR', 'USD', 'GBP'];

  it('normalizes, deduplicates, and caps slot lists with fallback', () => {
    expect(normalizeWidgetSlotList(undefined, 'Europe/Prague')).toEqual(['Europe/Prague']);
    expect(normalizeWidgetSlotList([], 'CZK')).toEqual(['CZK']);
    expect(
      normalizeWidgetSlotList(['Europe/Prague', 'Europe/Prague', 'Europe/London'], 'Europe/Prague')
    ).toEqual(['Europe/Prague', 'Europe/London']);
    expect(normalizeWidgetSlotList(cities, 'Europe/Prague')).toEqual([
      'Europe/Prague',
      'Europe/London',
      'America/New_York',
    ]);
  });

  it('resizes slot lists up and down cleanly without duplicating items', () => {
    const grown2 = resizeWidgetSlotList(['Europe/Prague'], 2, cities, 'Europe/Prague');
    expect(grown2).toEqual(['Europe/Prague', 'Europe/London']);

    const grown3 = resizeWidgetSlotList(grown2, 3, cities, 'Europe/Prague');
    expect(grown3).toEqual(['Europe/Prague', 'Europe/London', 'America/New_York']);

    const shrunk1 = resizeWidgetSlotList(grown3, 1, cities, 'Europe/Prague');
    expect(shrunk1).toEqual(['Europe/Prague']);

    const shrunk2 = resizeWidgetSlotList(['CZK', 'EUR', 'USD'], 2, fiats, 'CZK');
    expect(shrunk2).toEqual(['CZK', 'EUR']);
  });

  it('updates a slot in place without growing the list and swaps on duplicate choice', () => {
    expect(updateWidgetSlotAt(['CZK'], 0, 'EUR', 'CZK')).toEqual(['EUR']);
    expect(updateWidgetSlotAt(['CZK', 'EUR'], 1, 'USD', 'CZK')).toEqual(['CZK', 'USD']);
    expect(updateWidgetSlotAt(['CZK', 'EUR'], 0, 'EUR', 'CZK')).toEqual(['EUR', 'CZK']);
  });

  it('removes any slot while always keeping at least one item', () => {
    expect(removeWidgetSlotAt(['Europe/Prague'], 0, 'Europe/Prague')).toEqual(['Europe/Prague']);
    expect(removeWidgetSlotAt(['Europe/Prague', 'Europe/London'], 0, 'Europe/Prague')).toEqual([
      'Europe/London',
    ]);
    expect(
      removeWidgetSlotAt(['CZK', 'EUR', 'USD'], 1, 'CZK')
    ).toEqual(['CZK', 'USD']);
  });

  it('changes primary selection from sidebar dropdown without silently increasing slot count', () => {
    expect(selectPrimaryWidgetSlot(['CZK'], 'EUR', 'CZK')).toEqual(['EUR']);
    expect(selectPrimaryWidgetSlot(['CZK', 'EUR'], 'EUR', 'CZK')).toEqual(['EUR', 'CZK']);
    expect(selectPrimaryWidgetSlot(['CZK', 'EUR'], 'USD', 'CZK')).toEqual(['USD', 'EUR']);
  });
});
