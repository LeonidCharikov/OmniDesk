// Pure logic for Aim & Rhythm Timing Bar Studio

export type RhythmMode = 'beatbar' | 'aimrings' | 'skillcheck';
export type RhythmJudgeGrade = 'perfect' | 'great' | 'good' | 'miss';

export interface RhythmJudgment {
  grade: RhythmJudgeGrade;
  points: number;
  offsetMs: number;
  direction: 'exact' | 'early' | 'late';
}

export interface RhythmNote {
  id: number;
  targetTimeMs: number;
  xPct?: number;
  yPct?: number;
  hit?: boolean;
  missed?: boolean;
  grade?: RhythmJudgeGrade;
}

export interface RhythmJudgeCounts {
  perfect: number;
  great: number;
  good: number;
  miss: number;
}

export const RHYTHM_WINDOWS = {
  perfectMs: 38,
  greatMs: 78,
  goodMs: 125,
} as const;

export function judgeRhythmOffset(offsetMs: number): RhythmJudgment {
  const abs = Math.abs(offsetMs);
  const rounded = Math.round(offsetMs);
  const direction: 'exact' | 'early' | 'late' =
    abs <= 12 ? 'exact' : offsetMs < 0 ? 'early' : 'late';

  if (abs <= RHYTHM_WINDOWS.perfectMs) {
    return { grade: 'perfect', points: 300, offsetMs: rounded, direction };
  }
  if (abs <= RHYTHM_WINDOWS.greatMs) {
    return { grade: 'great', points: 200, offsetMs: rounded, direction };
  }
  if (abs <= RHYTHM_WINDOWS.goodMs) {
    return { grade: 'good', points: 100, offsetMs: rounded, direction };
  }
  return { grade: 'miss', points: 0, offsetMs: rounded, direction };
}

export function computeRhythmAccuracy(counts: RhythmJudgeCounts): number {
  const total = counts.perfect + counts.great + counts.good + counts.miss;
  if (total === 0) return 100;
  const weighted = counts.perfect * 1.0 + counts.great * 0.75 + counts.good * 0.4;
  return Math.round((weighted / total) * 1000) / 10;
}

export function computeRhythmLetterGrade(accuracy: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (accuracy >= 95) return 'S';
  if (accuracy >= 88) return 'A';
  if (accuracy >= 75) return 'B';
  if (accuracy >= 60) return 'C';
  return 'D';
}

export function generateBeatChart(
  bpm: number,
  totalNotes = 32,
  leadInMs = 1800,
  rng: () => number = Math.random
): RhythmNote[] {
  const clampedBpm = Math.max(60, Math.min(220, bpm));
  const beatMs = 60000 / clampedBpm;
  const notes: RhythmNote[] = [];
  let cursorMs = leadInMs;

  for (let i = 0; i < totalNotes; i++) {
    // Mix quarter notes with occasional rhythmic half-beat syncopation every 4th phrase
    const isSyncopated = i > 3 && i % 4 === 2 && rng() < 0.45;
    const xPct = 18 + Math.round(rng() * 64);
    const yPct = 22 + Math.round(rng() * 56);
    notes.push({
      id: i + 1,
      targetTimeMs: Math.round(cursorMs),
      xPct,
      yPct,
    });
    cursorMs += isSyncopated ? beatMs * 0.5 : beatMs;
  }

  return notes;
}

export function computeComboMultiplier(combo: number): number {
  if (combo >= 30) return 4;
  if (combo >= 15) return 3;
  if (combo >= 5) return 2;
  return 1;
}
