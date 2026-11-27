// Pure logic for Typing Speed & Accuracy Test

export type TypingMode = 'time' | 'words' | 'code';

export const COMMON_WORDS: readonly string[] = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it', 'for', 'not', 'on', 'with',
  'as', 'you', 'do', 'at', 'this', 'but', 'by', 'from', 'they', 'we', 'say', 'or', 'an', 'will',
  'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
  'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'know', 'take', 'into',
  'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look',
  'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our',
  'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day',
  'most', 'us', 'system', 'signal', 'frame', 'speed', 'focus', 'craft', 'build', 'light', 'clear',
  'rapid', 'input', 'pixel', 'layer', 'spark', 'model', 'logic', 'pulse', 'drift', 'graph', 'shift',
  'clock', 'quick', 'brown', 'jumps', 'river', 'stone', 'cloud', 'storm', 'field', 'scale', 'trace',
  'track', 'sharp', 'clean', 'solid', 'prime', 'round', 'level', 'score', 'sound', 'board', 'press',
  'click', 'point', 'space', 'enter', 'check', 'match', 'index', 'array', 'value', 'state', 'event',
  'power', 'local', 'cache', 'delta', 'range', 'limit', 'depth', 'angle', 'force', 'orbit', 'laser',
  'radar', 'prism', 'chord', 'tempo', 'rhythm', 'bench', 'proof', 'quest', 'guild', 'vault', 'blade',
];

export const CODE_SNIPPETS: readonly string[] = [
  'const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));',
  'export async function fetchLocal<T>(key: string, fallback: T): Promise<T> { return fallback; }',
  'const active = items.filter((item) => item.enabled && item.score >= 80).map((i) => i.id);',
  'function binarySearch(arr: number[], target: number): number { let l = 0, r = arr.length - 1; return l; }',
  'SELECT user_id, COUNT(*) AS total FROM sessions WHERE latency_ms < 50 GROUP BY user_id;',
  'git commit -m "feat(gaming): add offline hardware diagnostics and arcade suite"',
  'for (let i = 0; i < matrix.length; i++) { total += matrix[i][i]; }',
  'const debounce = (fn: () => void, ms = 120) => { let id: number; return () => clearTimeout(id); };',
];

export interface GenerateTypingOptions {
  mode: TypingMode;
  wordCount: number;
  includePunctuation: boolean;
  includeNumbers: boolean;
}

export function generateTypingPrompt(
  options: GenerateTypingOptions,
  rng: () => number = Math.random
): string {
  if (options.mode === 'code') {
    const picked: string[] = [];
    const pool = [...CODE_SNIPPETS];
    const targetLines = Math.max(2, Math.min(4, Math.ceil(options.wordCount / 15)));
    for (let i = 0; i < targetLines && pool.length > 0; i++) {
      const idx = Math.floor(rng() * pool.length) % pool.length;
      picked.push(pool.splice(idx, 1)[0]);
    }
    return picked.join(' ');
  }

  const count = Math.max(10, Math.min(200, options.wordCount));
  const words: string[] = [];
  const punctMarks = [',', '.', ';', '!', '?'];

  for (let i = 0; i < count; i++) {
    if (options.includeNumbers && i > 0 && rng() < 0.1) {
      words.push(String(Math.floor(rng() * 990) + 10));
      continue;
    }

    let word = COMMON_WORDS[Math.floor(rng() * COMMON_WORDS.length) % COMMON_WORDS.length];
    const prevEndedSentence = i === 0 || /[.!?]$/.test(words[i - 1] ?? '');
    if (options.includePunctuation && prevEndedSentence) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    if (options.includePunctuation && i > 0 && i < count - 1 && rng() < 0.18) {
      const mark = punctMarks[Math.floor(rng() * punctMarks.length) % punctMarks.length];
      word += mark;
    }
    words.push(word);
  }

  if (options.includePunctuation && words.length > 0 && !/[.!?]$/.test(words[words.length - 1])) {
    words[words.length - 1] += '.';
  }

  return words.join(' ');
}

export interface TypingStats {
  netWpm: number;
  rawWpm: number;
  accuracy: number;
  correctChars: number;
  errorChars: number;
  totalTyped: number;
  progressPct: number;
  weakKeys: Array<{ char: string; misses: number }>;
}

export function evaluateTypingProgress(
  targetText: string,
  typedText: string,
  elapsedSec: number
): TypingStats {
  const totalTyped = typedText.length;
  let correctChars = 0;
  let errorChars = 0;
  const missMap = new Map<string, number>();

  for (let i = 0; i < totalTyped; i++) {
    const expected = targetText[i];
    const actual = typedText[i];
    if (expected !== undefined && actual === expected) {
      correctChars++;
    } else {
      errorChars++;
      if (expected && expected !== ' ') {
        const key = expected.toUpperCase();
        missMap.set(key, (missMap.get(key) ?? 0) + 1);
      }
    }
  }

  const minutes = Math.max(elapsedSec / 60, 1 / 60);
  const rawWpm = totalTyped > 0 ? Math.round((totalTyped / 5) / minutes) : 0;
  const netWpm = totalTyped > 0 ? Math.max(0, Math.round((correctChars / 5) / minutes)) : 0;
  const accuracy = totalTyped > 0 ? Math.round((correctChars / totalTyped) * 1000) / 10 : 100;
  const progressPct =
    targetText.length > 0 ? Math.min(100, Math.round((totalTyped / targetText.length) * 100)) : 0;

  const weakKeys = [...missMap.entries()]
    .map(([char, misses]) => ({ char, misses }))
    .sort((a, b) => b.misses - a.misses)
    .slice(0, 6);

  return {
    netWpm,
    rawWpm,
    accuracy,
    correctChars,
    errorChars,
    totalTyped,
    progressPct,
    weakKeys,
  };
}

export function computeTypingConsistency(wpmTimeline: number[]): number {
  const valid = wpmTimeline.filter(v => Number.isFinite(v) && v > 0);
  if (valid.length < 2) return 100;
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  if (mean <= 0) return 0;
  const variance = valid.reduce((sum, v) => sum + (v - mean) ** 2, 0) / valid.length;
  const cv = Math.sqrt(variance) / mean;
  return Math.max(0, Math.min(100, Math.round((1 - cv) * 100)));
}
