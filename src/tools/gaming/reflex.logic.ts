export interface ReactionSummary {
  count: number;
  averageMs: number;
  bestMs: number;
  worstMs: number;
  stdDevMs: number;
  tier: 'pro' | 'fast' | 'average' | 'warmup';
}

export function summarizeReactionTimes(samplesMs: number[]): ReactionSummary | null {
  const valid = samplesMs.filter(v => Number.isFinite(v) && v > 0);
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, v) => acc + v, 0);
  const averageMs = Math.round(sum / valid.length);
  const bestMs = Math.round(Math.min(...valid));
  const worstMs = Math.round(Math.max(...valid));
  const variance = valid.reduce((acc, v) => acc + (v - averageMs) ** 2, 0) / valid.length;
  const stdDevMs = Math.round(Math.sqrt(variance));

  let tier: ReactionSummary['tier'] = 'warmup';
  if (averageMs <= 190) tier = 'pro';
  else if (averageMs <= 240) tier = 'fast';
  else if (averageMs <= 310) tier = 'average';

  return {
    count: valid.length,
    averageMs,
    bestMs,
    worstMs,
    stdDevMs,
    tier,
  };
}

export interface TimingBarEvaluation {
  hit: boolean;
  perfect: boolean;
  distanceFromCenter: number; // 0..1
}

export function evaluateTimingBarHit(
  cursorPos: number, // 0..1
  zoneCenter: number, // 0..1
  zoneWidth: number // 0..1
): TimingBarEvaluation {
  const half = Math.max(0.01, zoneWidth / 2);
  const dist = Math.abs(cursorPos - zoneCenter);
  const hit = dist <= half;
  const perfect = dist <= half * 0.32;
  return { hit, perfect, distanceFromCenter: Math.round(dist * 1000) / 1000 };
}

export function computeAimAccuracy(hits: number, misses: number): number {
  const total = hits + misses;
  if (total <= 0) return 100;
  return Math.round((hits / total) * 1000) / 10;
}

export function computePollingRateHz(timestampsMs: number[]): number {
  if (timestampsMs.length < 3) return 0;
  const deltas: number[] = [];
  for (let i = 1; i < timestampsMs.length; i++) {
    const dt = timestampsMs[i] - timestampsMs[i - 1];
    if (dt >= 0.1 && dt <= 60) {
      deltas.push(dt);
    }
  }
  if (deltas.length < 2) return 0;
  deltas.sort((a, b) => a - b);
  // Use lower-quartile / median trimmed delta to avoid frame-drop skew
  const medianDt = deltas[Math.floor(deltas.length * 0.4)];
  if (medianDt <= 0) return 0;
  return Math.min(8000, Math.round(1000 / medianDt));
}

export function isAccidentalDoubleClick(intervalMs: number, thresholdMs = 80): boolean {
  return Number.isFinite(intervalMs) && intervalMs > 0 && intervalMs < thresholdMs;
}
