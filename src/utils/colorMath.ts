export interface RgbColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a?: number; // 0-1
}

export interface HslColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface HsvColor {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

export interface OklchColor {
  l: number; // 0-1
  c: number; // ~0-0.4
  h: number; // 0-360
}

export interface CmykColor {
  c: number; // 0-100
  m: number; // 0-100
  y: number; // 0-100
  k: number; // 0-100
}

export type HarmonyMode =
  | 'analogous'
  | 'complementary'
  | 'triadic'
  | 'split-complementary'
  | 'tetradic'
  | 'square'
  | 'monochromatic';

export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return (
      '#' +
      raw
        .split('')
        .map(ch => ch + ch)
        .join('')
        .toUpperCase()
    );
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return `#${raw.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{8}$/.test(raw)) {
    return `#${raw.slice(0, 6).toUpperCase()}`;
  }
  return null;
}

export function parseHexWithAlpha(input: string): { hex: string; alpha: number } | null {
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    const expanded = raw
      .split('')
      .map(ch => ch + ch)
      .join('')
      .toUpperCase();
    return { hex: `#${expanded}`, alpha: 1 };
  }
  if (/^[0-9a-fA-F]{4}$/.test(raw)) {
    const expanded = raw
      .split('')
      .map(ch => ch + ch)
      .join('')
      .toUpperCase();
    const alpha = parseInt(expanded.slice(6, 8), 16) / 255;
    return { hex: `#${expanded.slice(0, 6)}`, alpha: Math.round(alpha * 100) / 100 };
  }
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    return { hex: `#${raw.toUpperCase()}`, alpha: 1 };
  }
  if (/^[0-9a-fA-F]{8}$/.test(raw)) {
    const alpha = parseInt(raw.slice(6, 8), 16) / 255;
    return { hex: `#${raw.slice(0, 6).toUpperCase()}`, alpha: Math.round(alpha * 100) / 100 };
  }
  return null;
}

export function parseRgbString(input: string): RgbColor | null {
  const match = input
    .trim()
    .match(/^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
  if (match) {
    const r = clamp(parseInt(match[1], 10), 0, 255);
    const g = clamp(parseInt(match[2], 10), 0, 255);
    const b = clamp(parseInt(match[3], 10), 0, 255);
    let a = 1;
    if (match[4]) {
      a = match[4].endsWith('%')
        ? clamp(parseFloat(match[4]) / 100, 0, 1)
        : clamp(parseFloat(match[4]), 0, 1);
    }
    return { r, g, b, a };
  }

  const csvMatch = input.trim().match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  if (csvMatch) {
    return {
      r: clamp(parseInt(csvMatch[1], 10), 0, 255),
      g: clamp(parseInt(csvMatch[2], 10), 0, 255),
      b: clamp(parseInt(csvMatch[3], 10), 0, 255),
      a: 1,
    };
  }

  return null;
}

export function hexToRgb(hex: string): RgbColor {
  const norm = normalizeHex(hex) || '#000000';
  const num = parseInt(norm.slice(1), 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number, alpha?: number): string {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0').toUpperCase();
  const base = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (typeof alpha === 'number' && alpha < 1) {
    return `${base}${toHex(clamp(alpha, 0, 1) * 255)}`;
  }
  return base;
}

export function rgbToHsl(r: number, g: number, b: number): HslColor {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360) % 360,
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(h: number, s: number, l: number): RgbColor {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) { r = c; g = x; }
  else if (hue < 120) { r = x; g = c; }
  else if (hue < 180) { g = c; b = x; }
  else if (hue < 240) { g = x; b = c; }
  else if (hue < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToHsv(r: number, g: number, b: number): HsvColor {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      case bn:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }

  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;

  return {
    h: Math.round(h) % 360,
    s: Math.round(s),
    v: Math.round(v),
  };
}

export function hsvToRgb(h: number, s: number, v: number): RgbColor {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const val = clamp(v, 0, 100) / 100;

  const c = val * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = val - c;

  let r = 0;
  let g = 0;
  let b = 0;

  if (hue < 60) { r = c; g = x; }
  else if (hue < 120) { r = x; g = c; }
  else if (hue < 180) { g = c; b = x; }
  else if (hue < 240) { g = x; b = c; }
  else if (hue < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const rgb = hsvToRgb(h, s, v);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export function rgbToCmyk(r: number, g: number, b: number): CmykColor {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - rn - k) / (1 - k)) * 100),
    m: Math.round(((1 - gn - k) / (1 - k)) * 100),
    y: Math.round(((1 - bn - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
}

function srgbToLinear(channel255: number): number {
  const c = clamp(channel255, 0, 255) / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function rgbToOklch(r: number, g: number, b: number): OklchColor {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const a = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const bVal = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;

  const C = Math.sqrt(a * a + bVal * bVal);
  let H = (Math.atan2(bVal, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return {
    l: Math.round(L * 100) / 100,
    c: Math.round(C * 100) / 100,
    h: C < 0.0005 ? 0 : Math.round(H),
  };
}

export function getContrastingTextColor(hex: string): '#0F172A' | '#FFFFFF' {
  const { r, g, b } = hexToRgb(hex);
  const luminance = 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
  return luminance > 0.36 ? '#0F172A' : '#FFFFFF';
}

export function generateTintsAndShades(hex: string, steps = 11): string[] {
  const { h, s } = rgbToHsl(...(() => {
    const rgb = hexToRgb(hex);
    return [rgb.r, rgb.g, rgb.b] as const;
  })());
  const result: string[] = [];
  for (let i = 0; i < steps; i++) {
    // 95% down to 8% lightness
    const l = Math.round(95 - (i / (steps - 1)) * 87);
    const rgb = hslToRgb(h, s, l);
    result.push(rgbToHex(rgb.r, rgb.g, rgb.b));
  }
  return result;
}

export function generateHarmonyHsv(base: HsvColor, mode: HarmonyMode): HsvColor[] {
  const wrap = (deg: number) => ((deg % 360) + 360) % 360;
  switch (mode) {
    case 'complementary':
      return [base, { ...base, h: wrap(base.h + 180) }];
    case 'analogous':
      return [
        { ...base, h: wrap(base.h - 30) },
        base,
        { ...base, h: wrap(base.h + 30) },
      ];
    case 'triadic':
      return [
        base,
        { ...base, h: wrap(base.h + 120) },
        { ...base, h: wrap(base.h + 240) },
      ];
    case 'split-complementary':
      return [
        base,
        { ...base, h: wrap(base.h + 150) },
        { ...base, h: wrap(base.h + 210) },
      ];
    case 'tetradic':
      return [
        base,
        { ...base, h: wrap(base.h + 60) },
        { ...base, h: wrap(base.h + 180) },
        { ...base, h: wrap(base.h + 240) },
      ];
    case 'square':
      return [
        base,
        { ...base, h: wrap(base.h + 90) },
        { ...base, h: wrap(base.h + 180) },
        { ...base, h: wrap(base.h + 270) },
      ];
    case 'monochromatic':
      return [
        { h: base.h, s: clamp(base.s * 0.35, 5, 100), v: clamp(base.v + 25, 25, 100) },
        { h: base.h, s: clamp(base.s * 0.65, 10, 100), v: clamp(base.v + 12, 20, 100) },
        base,
        { h: base.h, s: clamp(base.s + 10, 10, 100), v: clamp(base.v * 0.7, 10, 95) },
        { h: base.h, s: clamp(base.s + 15, 10, 100), v: clamp(base.v * 0.42, 8, 85) },
      ];
  }
}

export function generateHarmonyHexes(base: HsvColor, mode: HarmonyMode): string[] {
  return generateHarmonyHsv(base, mode).map(c => hsvToHex(c.h, c.s, c.v));
}

export const TAILWIND_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

export interface TailwindFamily {
  name: string;
  hexes: readonly string[];
}

export const TAILWIND_COLOR_CHART: readonly TailwindFamily[] = [
  { name: 'slate', hexes: ['#F8FAFC', '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A', '#020617'] },
  { name: 'gray', hexes: ['#F9FAFB', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#6B7280', '#4B5563', '#374151', '#1F2937', '#111827', '#030712'] },
  { name: 'zinc', hexes: ['#FAFAFA', '#F4F4F5', '#E4E4E7', '#D4D4D8', '#A1A1AA', '#71717A', '#52525B', '#3F3F46', '#27272A', '#18181B', '#09090B'] },
  { name: 'neutral', hexes: ['#FAFAFA', '#F5F5F5', '#E5E5E5', '#D4D4D4', '#A3A3A3', '#737373', '#525252', '#404040', '#262626', '#171717', '#0A0A0A'] },
  { name: 'stone', hexes: ['#FAFAF9', '#F5F5F4', '#E7E5E4', '#D6D3D1', '#A8A29E', '#78716C', '#57534E', '#44403C', '#292524', '#1C1917', '#0C0A09'] },
  { name: 'red', hexes: ['#FEF2F2', '#FEE2E2', '#FECACA', '#FCA5A5', '#F87171', '#EF4444', '#DC2626', '#B91C1C', '#991B1B', '#7F1D1D', '#450A0A'] },
  { name: 'orange', hexes: ['#FFF7ED', '#FFEDD5', '#FED7AA', '#FDBA74', '#FB923C', '#F97316', '#EA580C', '#C2410C', '#9A3412', '#7C2D12', '#431407'] },
  { name: 'amber', hexes: ['#FFFBEB', '#FEF3C7', '#FDE68A', '#FCD34D', '#FBBF24', '#F59E0B', '#D97706', '#B45309', '#92400E', '#78350F', '#451A03'] },
  { name: 'yellow', hexes: ['#FEFCE8', '#FEF9C3', '#FEF08A', '#FDE047', '#FACC15', '#EAB308', '#CA8A04', '#A16207', '#854D0E', '#713F12', '#422006'] },
  { name: 'lime', hexes: ['#F7FEE7', '#ECFCCB', '#D9F99D', '#BEF264', '#A3E635', '#84CC16', '#65A30D', '#4D7C0F', '#3F6212', '#365314', '#1A2E05'] },
  { name: 'green', hexes: ['#F0FDF4', '#DCFCE7', '#BBF7D0', '#86EFAC', '#4ADE80', '#22C55E', '#16A34A', '#15803D', '#166534', '#14532D', '#052E16'] },
  { name: 'emerald', hexes: ['#ECFDF5', '#D1FAE5', '#A7F3D0', '#6EE7B7', '#34D399', '#10B981', '#059669', '#047857', '#065F46', '#064E3B', '#022C22'] },
  { name: 'teal', hexes: ['#F0FDFA', '#CCFBF1', '#99F6E4', '#5EEAD4', '#2DD4BF', '#14B8A6', '#0D9488', '#0F766E', '#115E59', '#134E4A', '#042F2E'] },
  { name: 'cyan', hexes: ['#ECFEFF', '#CFFAFE', '#A5F3FC', '#67E8F9', '#22D3EE', '#06B6D4', '#0891B2', '#0E7490', '#155E75', '#164E63', '#083344'] },
  { name: 'sky', hexes: ['#F0F9FF', '#E0F2FE', '#BAE6FD', '#7DD3FC', '#38BDF8', '#0EA5E9', '#0284C7', '#0369A1', '#075985', '#0C4A6E', '#082F49'] },
  { name: 'blue', hexes: ['#EFF6FF', '#DBEAFE', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF', '#1E3A8A', '#172554'] },
  { name: 'indigo', hexes: ['#EEF2FF', '#E0E7FF', '#C7D2FE', '#A5B4FC', '#818CF8', '#6366F1', '#4F46E5', '#4338CA', '#3730A3', '#312E81', '#1E1B4B'] },
  { name: 'violet', hexes: ['#F5F3FF', '#EDE9FE', '#DDD6FE', '#C4B5FD', '#A78BFA', '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6', '#4C1D95', '#2E1065'] },
  { name: 'purple', hexes: ['#FAF5FF', '#F3E8FF', '#E9D5FF', '#D8B4FE', '#C084FC', '#A855F7', '#9333EA', '#7E22CE', '#6B21A8', '#581C87', '#3B0764'] },
  { name: 'fuchsia', hexes: ['#FDF4FF', '#FAE8FF', '#F5D0FE', '#F0ABFC', '#E879F9', '#D946EF', '#C026D3', '#A21CAF', '#86198F', '#701A75', '#4A044E'] },
  { name: 'pink', hexes: ['#FDF2F8', '#FCE7F3', '#FBCFE8', '#F9A8D4', '#F472B6', '#EC4899', '#DB2777', '#BE185D', '#9D174D', '#831843', '#500724'] },
  { name: 'rose', hexes: ['#FFF1F2', '#FFE4E6', '#FECDD3', '#FDA4AF', '#FB7185', '#F43F5E', '#E11D48', '#BE123C', '#9F1239', '#881337', '#4C0519'] },
];

export interface NamedSwatch {
  name: string;
  hex: string;
}

export const FLAT_UI_CHART: readonly NamedSwatch[] = [
  { name: 'Turquoise', hex: '#1ABC9C' },
  { name: 'Green Sea', hex: '#16A085' },
  { name: 'Emerald', hex: '#2ECC71' },
  { name: 'Nephritis', hex: '#27AE60' },
  { name: 'Peter River', hex: '#3498DB' },
  { name: 'Belize Hole', hex: '#2980B9' },
  { name: 'Amethyst', hex: '#9B59B6' },
  { name: 'Wisteria', hex: '#8E44AD' },
  { name: 'Wet Asphalt', hex: '#34495E' },
  { name: 'Midnight Blue', hex: '#2C3E50' },
  { name: 'Sun Flower', hex: '#F1C40F' },
  { name: 'Orange', hex: '#F39C12' },
  { name: 'Carrot', hex: '#E67E22' },
  { name: 'Pumpkin', hex: '#D35400' },
  { name: 'Alizarin', hex: '#E74C3C' },
  { name: 'Pomegranate', hex: '#C0392B' },
  { name: 'Clouds', hex: '#ECF0F1' },
  { name: 'Silver', hex: '#BDC3C7' },
  { name: 'Concrete', hex: '#95A5A6' },
  { name: 'Asbestos', hex: '#7F8C8D' },
];

export const MATERIAL_CHART: readonly NamedSwatch[] = [
  { name: 'Red 500', hex: '#F44336' },
  { name: 'Pink 500', hex: '#E91E63' },
  { name: 'Purple 500', hex: '#9C27B0' },
  { name: 'Deep Purple 500', hex: '#673AB7' },
  { name: 'Indigo 500', hex: '#3F51B5' },
  { name: 'Blue 500', hex: '#2196F3' },
  { name: 'Light Blue 500', hex: '#03A9F4' },
  { name: 'Cyan 500', hex: '#00BCD4' },
  { name: 'Teal 500', hex: '#009688' },
  { name: 'Green 500', hex: '#4CAF50' },
  { name: 'Light Green 500', hex: '#8BC34A' },
  { name: 'Lime 500', hex: '#CDDC39' },
  { name: 'Yellow 500', hex: '#FFEB3B' },
  { name: 'Amber 500', hex: '#FFC107' },
  { name: 'Orange 500', hex: '#FF9800' },
  { name: 'Deep Orange 500', hex: '#FF5722' },
  { name: 'Brown 500', hex: '#795548' },
  { name: 'Grey 500', hex: '#9E9E9E' },
  { name: 'Blue Grey 500', hex: '#607D8B' },
  { name: 'Black', hex: '#000000' },
];

export function generateWebSafeChart(): NamedSwatch[] {
  const steps = [0x00, 0x33, 0x66, 0x99, 0xCC, 0xFF];
  const list: NamedSwatch[] = [];
  for (const r of steps) {
    for (const g of steps) {
      for (const b of steps) {
        const hex = rgbToHex(r, g, b);
        list.push({ name: hex, hex });
      }
    }
  }
  return list;
}
