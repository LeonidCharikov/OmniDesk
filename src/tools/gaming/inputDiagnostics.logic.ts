// Pure logic for Keyboard, Mouse & Gamepad NKRO / Ghosting & Input Latency Tester

export interface KeyCapSpec {
  code: string;
  label: string;
  w?: number; // unit width multiplier (1 = standard key)
}

export const ANSI_KEYBOARD_ROWS: readonly (readonly KeyCapSpec[])[] = [
  [
    { code: 'Escape', label: 'Esc', w: 1.1 },
    { code: 'F1', label: 'F1' },
    { code: 'F2', label: 'F2' },
    { code: 'F3', label: 'F3' },
    { code: 'F4', label: 'F4' },
    { code: 'F5', label: 'F5' },
    { code: 'F6', label: 'F6' },
    { code: 'F7', label: 'F7' },
    { code: 'F8', label: 'F8' },
    { code: 'F9', label: 'F9' },
    { code: 'F10', label: 'F10' },
    { code: 'F11', label: 'F11' },
    { code: 'F12', label: 'F12' },
    { code: 'Delete', label: 'Del', w: 1.2 },
  ],
  [
    { code: 'Backquote', label: '`' },
    { code: 'Digit1', label: '1' },
    { code: 'Digit2', label: '2' },
    { code: 'Digit3', label: '3' },
    { code: 'Digit4', label: '4' },
    { code: 'Digit5', label: '5' },
    { code: 'Digit6', label: '6' },
    { code: 'Digit7', label: '7' },
    { code: 'Digit8', label: '8' },
    { code: 'Digit9', label: '9' },
    { code: 'Digit0', label: '0' },
    { code: 'Minus', label: '-' },
    { code: 'Equal', label: '=' },
    { code: 'Backspace', label: 'Bksp', w: 2 },
  ],
  [
    { code: 'Tab', label: 'Tab', w: 1.5 },
    { code: 'KeyQ', label: 'Q' },
    { code: 'KeyW', label: 'W' },
    { code: 'KeyE', label: 'E' },
    { code: 'KeyR', label: 'R' },
    { code: 'KeyT', label: 'T' },
    { code: 'KeyY', label: 'Y' },
    { code: 'KeyU', label: 'U' },
    { code: 'KeyI', label: 'I' },
    { code: 'KeyO', label: 'O' },
    { code: 'KeyP', label: 'P' },
    { code: 'BracketLeft', label: '[' },
    { code: 'BracketRight', label: ']' },
    { code: 'Backslash', label: '\\', w: 1.5 },
  ],
  [
    { code: 'CapsLock', label: 'Caps', w: 1.75 },
    { code: 'KeyA', label: 'A' },
    { code: 'KeyS', label: 'S' },
    { code: 'KeyD', label: 'D' },
    { code: 'KeyF', label: 'F' },
    { code: 'KeyG', label: 'G' },
    { code: 'KeyH', label: 'H' },
    { code: 'KeyJ', label: 'J' },
    { code: 'KeyK', label: 'K' },
    { code: 'KeyL', label: 'L' },
    { code: 'Semicolon', label: ';' },
    { code: 'Quote', label: "'" },
    { code: 'Enter', label: 'Enter', w: 2.25 },
  ],
  [
    { code: 'ShiftLeft', label: 'Shift', w: 2.25 },
    { code: 'KeyZ', label: 'Z' },
    { code: 'KeyX', label: 'X' },
    { code: 'KeyC', label: 'C' },
    { code: 'KeyV', label: 'V' },
    { code: 'KeyB', label: 'B' },
    { code: 'KeyN', label: 'N' },
    { code: 'KeyM', label: 'M' },
    { code: 'Comma', label: ',' },
    { code: 'Period', label: '.' },
    { code: 'Slash', label: '/' },
    { code: 'ShiftRight', label: 'Shift', w: 2.75 },
  ],
  [
    { code: 'ControlLeft', label: 'Ctrl', w: 1.25 },
    { code: 'MetaLeft', label: 'Win', w: 1.25 },
    { code: 'AltLeft', label: 'Alt', w: 1.25 },
    { code: 'Space', label: 'Space', w: 6.25 },
    { code: 'AltRight', label: 'Alt', w: 1.25 },
    { code: 'ControlRight', label: 'Ctrl', w: 1.25 },
    { code: 'ArrowLeft', label: '←' },
    { code: 'ArrowUp', label: '↑' },
    { code: 'ArrowDown', label: '↓' },
    { code: 'ArrowRight', label: '→' },
  ],
] as const;

export interface GhostingChallenge {
  id: string;
  name: string;
  keys: readonly string[];
  display: string;
}

export const GHOSTING_CHALLENGES: readonly GhostingChallenge[] = [
  {
    id: 'fps_strafe',
    name: 'FPS Strafe + Sprint + Jump',
    keys: ['KeyW', 'KeyD', 'ShiftLeft', 'Space'],
    display: 'W + D + L-Shift + Space',
  },
  {
    id: 'wasd_all',
    name: '4-Key WASD Cluster',
    keys: ['KeyW', 'KeyA', 'KeyS', 'KeyD'],
    display: 'W + A + S + D',
  },
  {
    id: 'dual_shift',
    name: 'Dual-Shift Rollover Check',
    keys: ['ShiftLeft', 'ShiftRight', 'KeyF', 'KeyJ'],
    display: 'L-Shift + R-Shift + F + J',
  },
  {
    id: 'six_kro',
    name: '6-Key Rollover (6KRO)',
    keys: ['KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL'],
    display: 'A + S + D + J + K + L',
  },
] as const;

export function isChallengeSatisfied(pressedCodes: ReadonlySet<string>, challenge: GhostingChallenge): boolean {
  return challenge.keys.every(code => pressedCodes.has(code));
}

export function isKeyChatter(deltaMs: number, thresholdMs = 25): boolean {
  return Number.isFinite(deltaMs) && deltaMs > 0 && deltaMs < thresholdMs;
}

export interface StickMetrics {
  rawX: number;
  rawY: number;
  magnitude: number;
  angleDeg: number;
  isDrifting: boolean;
  deadzonePct: number;
}

export function computeStickMetrics(x: number, y: number, deadzone = 0.08): StickMetrics {
  const cx = Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0;
  const cy = Number.isFinite(y) ? Math.max(-1, Math.min(1, y)) : 0;
  const magnitude = Math.min(1, Math.hypot(cx, cy));
  const angleRad = Math.atan2(cy, cx);
  const angleDeg = Math.round(((angleRad * 180) / Math.PI + 360) % 360);
  return {
    rawX: Math.round(cx * 1000) / 1000,
    rawY: Math.round(cy * 1000) / 1000,
    magnitude: Math.round(magnitude * 1000) / 1000,
    angleDeg,
    isDrifting: magnitude > deadzone && magnitude < 0.45,
    deadzonePct: Math.round(deadzone * 100),
  };
}

export interface LatencySummary {
  count: number;
  minMs: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
}

export function summarizeLatencySamples(samplesMs: number[]): LatencySummary | null {
  const valid = samplesMs.filter(v => Number.isFinite(v) && v >= 0 && v < 5000);
  if (valid.length === 0) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  const sum = valid.reduce((a, b) => a + b, 0);
  const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
  return {
    count: valid.length,
    minMs: Math.round(sorted[0] * 100) / 100,
    avgMs: Math.round((sum / valid.length) * 100) / 100,
    p95Ms: Math.round(sorted[p95Idx] * 100) / 100,
    maxMs: Math.round(sorted[sorted.length - 1] * 100) / 100,
  };
}
