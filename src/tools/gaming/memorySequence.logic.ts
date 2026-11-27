// Pure logic for Memory Sequence Trainer (Simon Color, Spatial Grid Matrix, Digit Span)

export type MemoryMode = 'simon' | 'grid' | 'digits';

export interface SimonPadSpec {
  id: number;
  label: string;
  keyHint: string;
  freqHz: number;
  idleClass: string;
  activeClass: string;
}

export const SIMON_PADS: readonly SimonPadSpec[] = [
  {
    id: 0,
    label: 'Emerald',
    keyHint: '1 / Q',
    freqHz: 261.63, // C4
    idleClass: 'bg-emerald-600/30 border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/45',
    activeClass: 'bg-emerald-400 border-emerald-200 text-slate-950 scale-[0.98] shadow-[0_0_28px_rgba(52,211,153,0.75)]',
  },
  {
    id: 1,
    label: 'Rose',
    keyHint: '2 / W',
    freqHz: 329.63, // E4
    idleClass: 'bg-rose-600/30 border-rose-500/40 text-rose-200 hover:bg-rose-600/45',
    activeClass: 'bg-rose-400 border-rose-200 text-slate-950 scale-[0.98] shadow-[0_0_28px_rgba(251,113,133,0.75)]',
  },
  {
    id: 2,
    label: 'Amber',
    keyHint: '3 / A',
    freqHz: 392.0, // G4
    idleClass: 'bg-amber-600/30 border-amber-500/40 text-amber-200 hover:bg-amber-600/45',
    activeClass: 'bg-amber-400 border-amber-200 text-slate-950 scale-[0.98] shadow-[0_0_28px_rgba(251,191,36,0.75)]',
  },
  {
    id: 3,
    label: 'Sky',
    keyHint: '4 / S',
    freqHz: 523.25, // C5
    idleClass: 'bg-sky-600/30 border-sky-500/40 text-sky-200 hover:bg-sky-600/45',
    activeClass: 'bg-sky-400 border-sky-200 text-slate-950 scale-[0.98] shadow-[0_0_28px_rgba(56,189,248,0.75)]',
  },
] as const;

export function appendSimonStep(
  sequence: number[],
  padCount = 4,
  rng: () => number = Math.random
): number[] {
  const nextPad = Math.floor(rng() * padCount) % padCount;
  return [...sequence, nextPad];
}

export function getSimonPlaybackIntervalMs(level: number): number {
  return Math.max(260, 620 - Math.max(0, level - 1) * 28);
}

export interface GridLevelConfig {
  gridSize: number;
  tileCount: number;
  previewMs: number;
}

export function getGridConfigForLevel(level: number): GridLevelConfig {
  const lv = Math.max(1, level);
  if (lv <= 2) {
    return { gridSize: 3, tileCount: lv + 2, previewMs: 1300 };
  }
  if (lv <= 6) {
    return { gridSize: 4, tileCount: lv + 2, previewMs: 1550 };
  }
  return {
    gridSize: 5,
    tileCount: Math.min(16, lv + 2),
    previewMs: 1800,
  };
}

export function generateGridPattern(
  gridSize: number,
  tileCount: number,
  rng: () => number = Math.random
): number[] {
  const total = gridSize * gridSize;
  const clamped = Math.min(total, Math.max(1, tileCount));
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, clamped).sort((a, b) => a - b);
}

export function generateDigitSequence(length: number, rng: () => number = Math.random): string {
  const len = Math.max(1, Math.min(30, length));
  let out = '';
  for (let i = 0; i < len; i++) {
    out += String(Math.floor(rng() * 10) % 10);
  }
  return out;
}

export function getDigitDisplayMs(length: number): number {
  return Math.min(6000, 900 + length * 380);
}
