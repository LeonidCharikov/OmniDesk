import { describe, it, expect } from 'vitest';
import {
  normalizeHex,
  parseHexWithAlpha,
  parseRgbString,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  rgbToHsv,
  hsvToRgb,
  rgbToCmyk,
  rgbToOklch,
  generateTintsAndShades,
  generateHarmonyHexes,
  TAILWIND_COLOR_CHART,
  TAILWIND_SHADES,
  generateWebSafeChart,
} from '../utils/colorMath';

describe('colorMath utilities', () => {
  it('normalizes 3-digit and 6-digit hex strings', () => {
    expect(normalizeHex('fa5039')).toBe('#FA5039');
    expect(normalizeHex('#abc')).toBe('#AABBCC');
    expect(normalizeHex('#123456')).toBe('#123456');
    expect(normalizeHex('invalid')).toBeNull();
  });

  it('parses hex strings with optional alpha channel', () => {
    expect(parseHexWithAlpha('#FA5039')).toEqual({ hex: '#FA5039', alpha: 1 });
    const withAlpha = parseHexWithAlpha('#FA503980');
    expect(withAlpha?.hex).toBe('#FA5039');
    expect(withAlpha?.alpha).toBe(0.5);
    expect(parseHexWithAlpha('#zzzzzz')).toBeNull();
  });

  it('parses rgb() and comma/space separated RGB inputs', () => {
    expect(parseRgbString('250, 80, 57')).toEqual({ r: 250, g: 80, b: 57, a: 1 });
    expect(parseRgbString('rgb(16, 185, 129)')).toEqual({ r: 16, g: 185, b: 129, a: 1 });
    expect(parseRgbString('rgba(255, 0, 128, 0.5)')).toEqual({ r: 255, g: 0, b: 128, a: 0.5 });
    expect(parseRgbString('not-a-color')).toBeNull();
  });

  it('converts accurately between RGB, Hex, HSL, HSV, CMYK, and OKLCH', () => {
    expect(rgbToHex(250, 80, 57)).toBe('#FA5039');
    expect(hexToRgb('#FA5039')).toEqual({ r: 250, g: 80, b: 57 });

    const hsl = rgbToHsl(250, 80, 57);
    const backFromHsl = hslToRgb(hsl.h, hsl.s, hsl.l);
    expect(Math.abs(backFromHsl.r - 250)).toBeLessThanOrEqual(2);
    expect(Math.abs(backFromHsl.g - 80)).toBeLessThanOrEqual(2);
    expect(Math.abs(backFromHsl.b - 57)).toBeLessThanOrEqual(2);

    const hsv = rgbToHsv(250, 80, 57);
    const backFromHsv = hsvToRgb(hsv.h, hsv.s, hsv.v);
    expect(Math.abs(backFromHsv.r - 250)).toBeLessThanOrEqual(3);
    expect(Math.abs(backFromHsv.g - 80)).toBeLessThanOrEqual(3);
    expect(Math.abs(backFromHsv.b - 57)).toBeLessThanOrEqual(3);

    const cmyk = rgbToCmyk(0, 0, 0);
    expect(cmyk).toEqual({ c: 0, m: 0, y: 0, k: 100 });

    const oklch = rgbToOklch(255, 255, 255);
    expect(oklch.l).toBeCloseTo(1, 2);
    expect(oklch.c).toBeCloseTo(0, 2);
  });

  it('generates 11-stop tints and shades and valid color harmonies', () => {
    const stops = generateTintsAndShades('#FA5039', 11);
    expect(stops).toHaveLength(11);
    const firstL = rgbToHsl(hexToRgb(stops[0]).r, hexToRgb(stops[0]).g, hexToRgb(stops[0]).b).l;
    const lastL = rgbToHsl(hexToRgb(stops[10]).r, hexToRgb(stops[10]).g, hexToRgb(stops[10]).b).l;
    expect(firstL).toBeGreaterThan(lastL);

    const comp = generateHarmonyHexes({ h: 0, s: 100, v: 100 }, 'complementary');
    expect(comp).toEqual(['#FF0000', '#00FFFF']);

    const triadic = generateHarmonyHexes({ h: 0, s: 100, v: 100 }, 'triadic');
    expect(triadic).toHaveLength(3);

    const square = generateHarmonyHexes({ h: 0, s: 100, v: 100 }, 'square');
    expect(square).toHaveLength(4);
  });

  it('exposes complete Tailwind (22x11) and Web-Safe (216) color charts', () => {
    expect(TAILWIND_SHADES).toHaveLength(11);
    expect(TAILWIND_COLOR_CHART).toHaveLength(22);
    for (const family of TAILWIND_COLOR_CHART) {
      expect(family.hexes).toHaveLength(11);
    }
    expect(generateWebSafeChart()).toHaveLength(216);
  });
});
