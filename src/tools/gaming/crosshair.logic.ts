export type CrosshairGameTag =
  | 'cs2'
  | 'valorant'
  | 'apex'
  | 'rust'
  | 'fortnite'
  | 'minecraft'
  | 'pubg'
  | 'r6';

export type CrosshairHotkey =
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F10'
  | 'F11'
  | 'F12';

export interface CrosshairConfig {
  name: string;
  color: string;
  opacity: number; // 0.1 .. 1
  scale: number; // 0.5 .. 3
  showLines: boolean;
  lineLength: number; // 1 .. 40
  lineThickness: number; // 1 .. 12
  lineGap: number; // 0 .. 30
  tStyle: boolean; // hide top line
  diagonal: boolean; // rotate lines 45deg (X shape)
  showDot: boolean;
  dotSize: number; // 1 .. 12
  dotColor: string;
  showRing: boolean;
  ringRadius: number; // 4 .. 48
  ringThickness: number; // 1 .. 8
  showOutline: boolean;
  outlineThickness: number; // 0.5 .. 4
  outlineColor: string;
  outlineOpacity: number; // 0.1 .. 1
  offsetX: number; // -200 .. 200 px
  offsetY: number; // -200 .. 200 px
}

export interface CrosshairPreset {
  id: string;
  name: string;
  game: CrosshairGameTag;
  author: string;
  config: CrosshairConfig;
}

export interface SavedCrosshairProfile {
  id: string;
  createdAt: number;
  config: CrosshairConfig;
}

export interface DesktopMonitorInfo {
  index: number;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  scale_factor: number;
  is_primary: boolean;
}

export interface CrosshairOverlayStatus {
  active: boolean;
  monitor_index: number;
  hotkey: CrosshairHotkey;
  global_hotkey_supported: boolean;
  config_json: string | null;
}

export const CROSSHAIR_HOTKEYS: CrosshairHotkey[] = [
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
];

export const CROSSHAIR_COLOR_SWATCHES: string[] = [
  '#22ff66',
  '#00f0ff',
  '#ffffff',
  '#ff3b30',
  '#ffea00',
  '#ff00ff',
  '#ff7a00',
  '#7c3aed',
];

export const DEFAULT_CROSSHAIR_CONFIG: CrosshairConfig = {
  name: 'Classic Cyan',
  color: '#00f0ff',
  opacity: 0.95,
  scale: 1,
  showLines: true,
  lineLength: 8,
  lineThickness: 2,
  lineGap: 4,
  tStyle: false,
  diagonal: false,
  showDot: true,
  dotSize: 2,
  dotColor: '#00f0ff',
  showRing: false,
  ringRadius: 14,
  ringThickness: 1.5,
  showOutline: true,
  outlineThickness: 1,
  outlineColor: '#000000',
  outlineOpacity: 0.85,
  offsetX: 0,
  offsetY: 0,
};

export const CROSSHAIR_PRESETS: CrosshairPreset[] = [
  {
    id: 'cs2-pro-cyan',
    name: 'Pro Static Cyan',
    game: 'cs2',
    author: 'Pro Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Pro Static Cyan',
      color: '#00f0ff',
      dotColor: '#00f0ff',
      lineLength: 6,
      lineThickness: 2,
      lineGap: 3,
      showDot: false,
      showOutline: true,
      outlineThickness: 1,
    },
  },
  {
    id: 'cs2-green-classic',
    name: 'Classic Green Cross',
    game: 'cs2',
    author: 'Pro Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Classic Green Cross',
      color: '#22ff66',
      dotColor: '#22ff66',
      lineLength: 9,
      lineThickness: 2,
      lineGap: 4,
      showDot: true,
      dotSize: 2,
      showOutline: true,
      outlineThickness: 1,
    },
  },
  {
    id: 'cs2-tstyle-yellow',
    name: 'Headshot T-Style',
    game: 'cs2',
    author: 'Pro Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Headshot T-Style',
      color: '#ffea00',
      dotColor: '#ffea00',
      lineLength: 7,
      lineThickness: 2,
      lineGap: 3,
      tStyle: true,
      showDot: true,
      dotSize: 2,
      showOutline: true,
    },
  },
  {
    id: 'val-precision-dot',
    name: 'Radiant Micro Dot',
    game: 'valorant',
    author: 'Valorant Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Radiant Micro Dot',
      color: '#ffffff',
      dotColor: '#ffffff',
      showLines: false,
      showDot: true,
      dotSize: 4,
      showOutline: true,
      outlineThickness: 1.5,
    },
  },
  {
    id: 'val-tiny-cross',
    name: 'VCT Tiny White',
    game: 'valorant',
    author: 'Valorant Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'VCT Tiny White',
      color: '#ffffff',
      dotColor: '#ffffff',
      lineLength: 4,
      lineThickness: 2,
      lineGap: 2,
      showDot: false,
      showOutline: true,
      outlineThickness: 1,
    },
  },
  {
    id: 'val-magenta-flick',
    name: 'Neon Magenta Flick',
    game: 'valorant',
    author: 'Valorant Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Neon Magenta Flick',
      color: '#ff00ff',
      dotColor: '#ffffff',
      lineLength: 6,
      lineThickness: 2,
      lineGap: 3,
      showDot: true,
      dotSize: 2,
      showOutline: true,
      outlineThickness: 1,
    },
  },
  {
    id: 'apex-red-optic',
    name: 'Red Reflex Optic',
    game: 'apex',
    author: 'Apex Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Red Reflex Optic',
      color: '#ff3b30',
      dotColor: '#ff3b30',
      lineLength: 7,
      lineThickness: 2,
      lineGap: 5,
      showDot: true,
      dotSize: 3,
      showRing: true,
      ringRadius: 15,
      ringThickness: 1.5,
      showOutline: true,
      outlineThickness: 1,
    },
  },
  {
    id: 'apex-wingman',
    name: 'Wingman Ring Dot',
    game: 'apex',
    author: 'Apex Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Wingman Ring Dot',
      color: '#00f0ff',
      dotColor: '#22ff66',
      showLines: false,
      showDot: true,
      dotSize: 3,
      showRing: true,
      ringRadius: 11,
      ringThickness: 2,
      showOutline: true,
    },
  },
  {
    id: 'rust-ak-spray',
    name: 'AK Spray Center',
    game: 'rust',
    author: 'Rust Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'AK Spray Center',
      color: '#22ff66',
      dotColor: '#ff3b30',
      lineLength: 6,
      lineThickness: 2,
      lineGap: 4,
      showDot: true,
      dotSize: 3,
      showOutline: true,
      outlineThickness: 1.5,
    },
  },
  {
    id: 'rust-bow-amber',
    name: 'Bow Sight Amber',
    game: 'rust',
    author: 'Rust Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Bow Sight Amber',
      color: '#ff7a00',
      dotColor: '#ffea00',
      lineLength: 10,
      lineThickness: 2,
      lineGap: 6,
      tStyle: true,
      showDot: true,
      dotSize: 3,
      showOutline: true,
    },
  },
  {
    id: 'fn-shotgun-ring',
    name: 'Shotgun Spread Ring',
    game: 'fortnite',
    author: 'Fortnite Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Shotgun Spread Ring',
      color: '#ffffff',
      dotColor: '#00f0ff',
      showLines: true,
      lineLength: 5,
      lineThickness: 2,
      lineGap: 14,
      showDot: true,
      dotSize: 3,
      showRing: true,
      ringRadius: 16,
      ringThickness: 1.5,
      showOutline: true,
    },
  },
  {
    id: 'fn-x-marker',
    name: 'Diagonal X Crisp',
    game: 'fortnite',
    author: 'Fortnite Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Diagonal X Crisp',
      color: '#00f0ff',
      dotColor: '#ffffff',
      lineLength: 7,
      lineThickness: 2,
      lineGap: 4,
      diagonal: true,
      showDot: true,
      dotSize: 2,
      showOutline: true,
    },
  },
  {
    id: 'mc-pixel-plus',
    name: 'Pixel Plus Classic',
    game: 'minecraft',
    author: 'Minecraft Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Pixel Plus Classic',
      color: '#ffffff',
      dotColor: '#ffffff',
      lineLength: 7,
      lineThickness: 2,
      lineGap: 0,
      showDot: false,
      showOutline: true,
      outlineThickness: 1,
      outlineOpacity: 0.75,
    },
  },
  {
    id: 'pubg-sniper-range',
    name: 'Long-Range Mil Cross',
    game: 'pubg',
    author: 'PUBG Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Long-Range Mil Cross',
      color: '#22ff66',
      dotColor: '#ff3b30',
      lineLength: 14,
      lineThickness: 1.5,
      lineGap: 5,
      showDot: true,
      dotSize: 2,
      showOutline: true,
      outlineThickness: 1,
    },
  },
  {
    id: 'r6-acog-holo',
    name: 'Tactical Holo Ring',
    game: 'r6',
    author: 'R6 Pack',
    config: {
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Tactical Holo Ring',
      color: '#ff3b30',
      dotColor: '#ff3b30',
      showLines: true,
      lineLength: 4,
      lineThickness: 2,
      lineGap: 11,
      showDot: true,
      dotSize: 2.5,
      showRing: true,
      ringRadius: 11,
      ringThickness: 1.5,
      showOutline: true,
      outlineThickness: 1,
    },
  },
];

function clampNum(val: unknown, min: number, max: number, fallback: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function sanitizeHexColor(val: unknown, fallback: string): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed) || /^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

export function sanitizeCrosshairConfig(input: Partial<CrosshairConfig> | null | undefined): CrosshairConfig {
  const raw = input && typeof input === 'object' ? input : {};
  return {
    name:
      typeof raw.name === 'string' && raw.name.trim().length > 0
        ? raw.name.trim().slice(0, 40)
        : DEFAULT_CROSSHAIR_CONFIG.name,
    color: sanitizeHexColor(raw.color, DEFAULT_CROSSHAIR_CONFIG.color),
    opacity: Math.round(clampNum(raw.opacity, 0.1, 1, DEFAULT_CROSSHAIR_CONFIG.opacity) * 100) / 100,
    scale: Math.round(clampNum(raw.scale, 0.5, 3, DEFAULT_CROSSHAIR_CONFIG.scale) * 20) / 20,
    showLines: raw.showLines === undefined ? DEFAULT_CROSSHAIR_CONFIG.showLines : Boolean(raw.showLines),
    lineLength: Math.round(clampNum(raw.lineLength, 1, 40, DEFAULT_CROSSHAIR_CONFIG.lineLength)),
    lineThickness: Math.round(clampNum(raw.lineThickness, 1, 12, DEFAULT_CROSSHAIR_CONFIG.lineThickness) * 2) / 2,
    lineGap: Math.round(clampNum(raw.lineGap, 0, 30, DEFAULT_CROSSHAIR_CONFIG.lineGap)),
    tStyle: Boolean(raw.tStyle),
    diagonal: Boolean(raw.diagonal),
    showDot: raw.showDot === undefined ? DEFAULT_CROSSHAIR_CONFIG.showDot : Boolean(raw.showDot),
    dotSize: Math.round(clampNum(raw.dotSize, 1, 12, DEFAULT_CROSSHAIR_CONFIG.dotSize) * 2) / 2,
    dotColor: sanitizeHexColor(raw.dotColor, sanitizeHexColor(raw.color, DEFAULT_CROSSHAIR_CONFIG.dotColor)),
    showRing: Boolean(raw.showRing),
    ringRadius: Math.round(clampNum(raw.ringRadius, 4, 48, DEFAULT_CROSSHAIR_CONFIG.ringRadius)),
    ringThickness: Math.round(clampNum(raw.ringThickness, 1, 8, DEFAULT_CROSSHAIR_CONFIG.ringThickness) * 2) / 2,
    showOutline: raw.showOutline === undefined ? DEFAULT_CROSSHAIR_CONFIG.showOutline : Boolean(raw.showOutline),
    outlineThickness: Math.round(clampNum(raw.outlineThickness, 0.5, 4, DEFAULT_CROSSHAIR_CONFIG.outlineThickness) * 2) / 2,
    outlineColor: sanitizeHexColor(raw.outlineColor, DEFAULT_CROSSHAIR_CONFIG.outlineColor),
    outlineOpacity: Math.round(clampNum(raw.outlineOpacity, 0.1, 1, DEFAULT_CROSSHAIR_CONFIG.outlineOpacity) * 100) / 100,
    offsetX: Math.round(clampNum(raw.offsetX, -200, 200, 0)),
    offsetY: Math.round(clampNum(raw.offsetY, -200, 200, 0)),
  };
}

export function encodeCrosshairShareCode(config: CrosshairConfig): string {
  const clean = sanitizeCrosshairConfig(config);
  const compact = [
    1,
    clean.color,
    clean.opacity,
    clean.scale,
    clean.showLines ? 1 : 0,
    clean.lineLength,
    clean.lineThickness,
    clean.lineGap,
    clean.tStyle ? 1 : 0,
    clean.diagonal ? 1 : 0,
    clean.showDot ? 1 : 0,
    clean.dotSize,
    clean.dotColor,
    clean.showRing ? 1 : 0,
    clean.ringRadius,
    clean.ringThickness,
    clean.showOutline ? 1 : 0,
    clean.outlineThickness,
    clean.outlineColor,
    clean.outlineOpacity,
    clean.offsetX,
    clean.offsetY,
    clean.name,
  ];
  const json = JSON.stringify(compact);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `ODX-${btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

export function decodeCrosshairShareCode(code: string): CrosshairConfig | null {
  const trimmed = code.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<CrosshairConfig>;
      return sanitizeCrosshairConfig(parsed);
    } catch {
      return null;
    }
  }

  if (!trimmed.startsWith('ODX-')) return null;
  try {
    const b64 = trimmed.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (b64.length % 4)) % 4;
    const binary = atob(b64 + '='.repeat(padLen));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoded = JSON.parse(new TextDecoder().decode(bytes)) as unknown[];
    if (!Array.isArray(decoded) || decoded[0] !== 1 || decoded.length < 22) {
      return null;
    }
    return sanitizeCrosshairConfig({
      color: String(decoded[1]),
      opacity: Number(decoded[2]),
      scale: Number(decoded[3]),
      showLines: Boolean(decoded[4]),
      lineLength: Number(decoded[5]),
      lineThickness: Number(decoded[6]),
      lineGap: Number(decoded[7]),
      tStyle: Boolean(decoded[8]),
      diagonal: Boolean(decoded[9]),
      showDot: Boolean(decoded[10]),
      dotSize: Number(decoded[11]),
      dotColor: String(decoded[12]),
      showRing: Boolean(decoded[13]),
      ringRadius: Number(decoded[14]),
      ringThickness: Number(decoded[15]),
      showOutline: Boolean(decoded[16]),
      outlineThickness: Number(decoded[17]),
      outlineColor: String(decoded[18]),
      outlineOpacity: Number(decoded[19]),
      offsetX: Number(decoded[20]),
      offsetY: Number(decoded[21]),
      name: typeof decoded[22] === 'string' ? decoded[22] : 'Imported Crosshair',
    });
  } catch {
    return null;
  }
}

export function generateRandomCrosshair(seedFn: () => number = Math.random): CrosshairConfig {
  const pick = <T,>(arr: T[]): T => arr[Math.floor(seedFn() * arr.length) % arr.length];
  const color = pick(CROSSHAIR_COLOR_SWATCHES);
  const dotColor = seedFn() > 0.65 ? pick(CROSSHAIR_COLOR_SWATCHES) : color;
  const showLines = seedFn() > 0.18;
  const showRing = seedFn() > 0.68;
  const showDot = !showLines || seedFn() > 0.35;

  return sanitizeCrosshairConfig({
    name: `Random #${Math.floor(100 + seedFn() * 900)}`,
    color,
    dotColor,
    opacity: 0.85 + Math.round(seedFn() * 15) / 100,
    scale: 1,
    showLines,
    lineLength: Math.floor(4 + seedFn() * 11),
    lineThickness: pick([1.5, 2, 2.5, 3]),
    lineGap: Math.floor(2 + seedFn() * 7),
    tStyle: showLines && seedFn() > 0.72,
    diagonal: showLines && seedFn() > 0.8,
    showDot,
    dotSize: pick([2, 2.5, 3, 4]),
    showRing,
    ringRadius: Math.floor(10 + seedFn() * 12),
    ringThickness: pick([1, 1.5, 2]),
    showOutline: seedFn() > 0.15,
    outlineThickness: pick([1, 1.5]),
    outlineColor: '#000000',
    outlineOpacity: 0.85,
    offsetX: 0,
    offsetY: 0,
  });
}

export function buildCrosshairSvgMarkup(config: CrosshairConfig, size = 160): string {
  const c = sanitizeCrosshairConfig(config);
  const half = size / 2;
  const outlineW = c.showOutline ? c.outlineThickness : 0;
  const parts: string[] = [];

  if (c.showRing) {
    if (outlineW > 0) {
      parts.push(
        `<circle cx="0" cy="0" r="${c.ringRadius}" fill="none" stroke="${c.outlineColor}" stroke-opacity="${c.outlineOpacity}" stroke-width="${c.ringThickness + outlineW * 2}" />`
      );
    }
    parts.push(
      `<circle cx="0" cy="0" r="${c.ringRadius}" fill="none" stroke="${c.color}" stroke-width="${c.ringThickness}" />`
    );
  }

  if (c.showLines) {
    const t = c.lineThickness;
    const len = c.lineLength;
    const gap = c.lineGap;
    const rects: Array<{ x: number; y: number; w: number; h: number }> = [
      { x: -(gap + len), y: -t / 2, w: len, h: t }, // left
      { x: gap, y: -t / 2, w: len, h: t }, // right
      { x: -t / 2, y: gap, w: t, h: len }, // bottom
    ];
    if (!c.tStyle) {
      rects.push({ x: -t / 2, y: -(gap + len), w: t, h: len }); // top
    }
    const rot = c.diagonal ? ' transform="rotate(45)"' : '';
    const lineEls: string[] = [];
    if (outlineW > 0) {
      for (const r of rects) {
        lineEls.push(
          `<rect x="${r.x - outlineW}" y="${r.y - outlineW}" width="${r.w + outlineW * 2}" height="${r.h + outlineW * 2}" fill="${c.outlineColor}" fill-opacity="${c.outlineOpacity}" />`
        );
      }
    }
    for (const r of rects) {
      lineEls.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${c.color}" />`);
    }
    parts.push(`<g${rot}>${lineEls.join('')}</g>`);
  }

  if (c.showDot) {
    const r = c.dotSize / 2;
    if (outlineW > 0) {
      parts.push(
        `<circle cx="0" cy="0" r="${r + outlineW}" fill="${c.outlineColor}" fill-opacity="${c.outlineOpacity}" />`
      );
    }
    parts.push(`<circle cx="0" cy="0" r="${r}" fill="${c.dotColor}" />`);
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><g transform="translate(${half} ${half}) scale(${c.scale})" opacity="${c.opacity}">${parts.join('')}</g></svg>`;
}
