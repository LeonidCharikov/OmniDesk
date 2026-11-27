// Lightweight synthesized Web Audio API sound effects for offline minigames

let sharedCtx: AudioContext | null = null;
let idleSuspendTimer: ReturnType<typeof setTimeout> | null = null;
const IDLE_SUSPEND_MS = 5_000;

function scheduleIdleSuspend(): void {
  if (typeof window === 'undefined') return;
  if (idleSuspendTimer !== null) {
    clearTimeout(idleSuspendTimer);
  }
  idleSuspendTimer = setTimeout(() => {
    idleSuspendTimer = null;
    if (sharedCtx && sharedCtx.state === 'running') {
      void sharedCtx.suspend().catch(() => {});
    }
  }, IDLE_SUSPEND_MS);
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedCtx || sharedCtx.state === 'closed') {
    sharedCtx = new Ctx();
  }
  if (sharedCtx.state === 'suspended') {
    void sharedCtx.resume().catch(() => {});
  }
  scheduleIdleSuspend();
  return sharedCtx;
}

export type ArcadeSoundKind =
  | 'eat'
  | 'bonus'
  | 'rotate'
  | 'drop'
  | 'clear'
  | 'tetris'
  | 'hit'
  | 'miss'
  | 'cue'
  | 'gameover';

export function playArcadeSound(kind: ArcadeSoundKind, enabled = true): void {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const playTone = (
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.08,
    offset = 0
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now + offset);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + offset + duration);
    }
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.linearRampToValueAtTime(gainPeak, now + offset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + duration + 0.01);
  };

  switch (kind) {
    case 'eat':
      playTone(520, 780, 0.09, 'triangle', 0.09);
      break;
    case 'bonus':
      playTone(660, 880, 0.09, 'triangle', 0.09, 0);
      playTone(880, 1180, 0.12, 'triangle', 0.09, 0.08);
      break;
    case 'rotate':
      playTone(360, 460, 0.045, 'square', 0.035);
      break;
    case 'drop':
      playTone(180, 95, 0.07, 'triangle', 0.08);
      break;
    case 'clear':
      playTone(440, 660, 0.1, 'triangle', 0.09, 0);
      playTone(660, 880, 0.12, 'triangle', 0.08, 0.07);
      break;
    case 'tetris':
      playTone(523, 523, 0.08, 'triangle', 0.09, 0);
      playTone(659, 659, 0.08, 'triangle', 0.09, 0.07);
      playTone(784, 784, 0.08, 'triangle', 0.09, 0.14);
      playTone(1046, 1046, 0.18, 'triangle', 0.1, 0.21);
      break;
    case 'hit':
      playTone(740, 980, 0.06, 'sine', 0.08);
      break;
    case 'miss':
      playTone(210, 130, 0.09, 'sawtooth', 0.05);
      break;
    case 'cue':
      playTone(880, 880, 0.12, 'sine', 0.12);
      break;
    case 'gameover':
      playTone(340, 260, 0.14, 'sawtooth', 0.06, 0);
      playTone(250, 150, 0.22, 'sawtooth', 0.06, 0.13);
      break;
  }
}

export function playNoteTone(
  freq: number,
  durationSec = 0.22,
  type: OscillatorType = 'triangle',
  enabled = true,
  gainPeak = 0.09
): void {
  if (!enabled || !Number.isFinite(freq) || freq <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + Math.max(0.03, durationSec));
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + Math.max(0.03, durationSec) + 0.015);
}

