// Pure logic for Monitor & Dead-Pixel / Ghosting Test

export interface PixelTestColor {
  id: string;
  name: string;
  hex: string;
  darkText: boolean;
}

export const PIXEL_TEST_COLORS: readonly PixelTestColor[] = [
  { id: 'red', name: 'Pure Red (Subpixel R)', hex: '#ff0000', darkText: false },
  { id: 'green', name: 'Pure Green (Subpixel G)', hex: '#00ff00', darkText: true },
  { id: 'blue', name: 'Pure Blue (Subpixel B)', hex: '#0000ff', darkText: false },
  { id: 'white', name: 'Pure White (Dead Pixels)', hex: '#ffffff', darkText: true },
  { id: 'black', name: 'Pure Black (Stuck / Bleed)', hex: '#000000', darkText: false },
  { id: 'cyan', name: 'Cyan (G + B)', hex: '#00ffff', darkText: true },
  { id: 'magenta', name: 'Magenta (R + B)', hex: '#ff00ff', darkText: false },
  { id: 'yellow', name: 'Yellow (R + G)', hex: '#ffff00', darkText: true },
  { id: 'gray50', name: '50% Uniformity Gray', hex: '#808080', darkText: false },
] as const;

export interface RefreshMetrics {
  hz: number;
  avgFrameMs: number;
  minFrameMs: number;
  maxFrameMs: number;
  jitterMs: number;
  droppedFrames: number;
  sampleCount: number;
}

export function computeRefreshMetrics(frameDeltasMs: number[]): RefreshMetrics {
  const valid = frameDeltasMs.filter(d => Number.isFinite(d) && d >= 1 && d <= 200);
  if (valid.length < 3) {
    return {
      hz: 0,
      avgFrameMs: 0,
      minFrameMs: 0,
      maxFrameMs: 0,
      jitterMs: 0,
      droppedFrames: 0,
      sampleCount: valid.length,
    };
  }

  const sorted = [...valid].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const avg = valid.reduce((sum, v) => sum + v, 0) / valid.length;
  const variance = valid.reduce((sum, v) => sum + (v - avg) ** 2, 0) / valid.length;
  const jitter = Math.sqrt(variance);
  const droppedFrames = valid.filter(d => d > median * 1.55).length;
  const hz = median > 0 ? Math.round((1000 / median) * 10) / 10 : 0;

  return {
    hz,
    avgFrameMs: Math.round(avg * 100) / 100,
    minFrameMs: Math.round(sorted[0] * 100) / 100,
    maxFrameMs: Math.round(sorted[sorted.length - 1] * 100) / 100,
    jitterMs: Math.round(jitter * 100) / 100,
    droppedFrames,
    sampleCount: valid.length,
  };
}

export function snapStandardRefreshRate(measuredHz: number): number {
  const standards = [24, 30, 50, 60, 75, 90, 100, 120, 144, 165, 180, 240, 280, 360, 480];
  if (!Number.isFinite(measuredHz) || measuredHz <= 0) return 0;
  let closest = standards[0];
  let bestDiff = Math.abs(measuredHz - closest);
  for (const s of standards) {
    const diff = Math.abs(measuredHz - s);
    if (diff < bestDiff) {
      bestDiff = diff;
      closest = s;
    }
  }
  return bestDiff <= closest * 0.08 ? closest : Math.round(measuredHz);
}

export interface GhostingBackgroundPreset {
  id: 'dark' | 'mid' | 'cyan' | 'overdrive';
  bgHex: string;
  barHex: string;
  label: string;
}

export const GHOSTING_BACKGROUNDS: readonly GhostingBackgroundPreset[] = [
  { id: 'dark', bgHex: '#0b101b', barHex: '#1e293b', label: 'Dark (VA Smear)' },
  { id: 'mid', bgHex: '#4b5563', barHex: '#6b7280', label: 'Mid Gray (GtG)' },
  { id: 'cyan', bgHex: '#0c4a6e', barHex: '#0369a1', label: 'UFO Cyan' },
  { id: 'overdrive', bgHex: '#94a3b8', barHex: '#cbd5e1', label: 'Light (Overshoot)' },
] as const;
