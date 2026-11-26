import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Crosshair,
  Play,
  RotateCcw,
  Target,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import { computeAimAccuracy } from './reflex.logic';
import { playArcadeSound } from './gamingAudio';

const BEST_STORAGE_KEY = 'omnidesk_aim_best_v1';

type AimMode = 'gridshot' | 'flick' | 'tracking';
type TargetSize = 'small' | 'medium' | 'large';
type AimPhase = 'TITLE_MENU' | 'PLAYING' | 'GAME_OVER';

interface AimTarget {
  id: number;
  x: number; // % 10..90
  y: number; // % 14..86
  vx: number; // % / sec (tracking mode)
  vy: number;
  spawnedAt: number;
}

type AimBests = Record<AimMode, number>;

const SIZE_RADIUS_PX: Record<TargetSize, number> = {
  small: 18,
  medium: 26,
  large: 34,
};

function loadBests(): AimBests {
  try {
    const raw = localStorage.getItem(BEST_STORAGE_KEY);
    if (!raw) return { gridshot: 0, flick: 0, tracking: 0 };
    const parsed = JSON.parse(raw) as Partial<AimBests>;
    return {
      gridshot: Math.max(0, Number(parsed.gridshot) || 0),
      flick: Math.max(0, Number(parsed.flick) || 0),
      tracking: Math.max(0, Number(parsed.tracking) || 0),
    };
  } catch {
    return { gridshot: 0, flick: 0, tracking: 0 };
  }
}

export const AimTrainerTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<AimMode>('gridshot');
  const [durationSec, setDurationSec] = useState<number>(30);
  const [targetSize, setTargetSize] = useState<TargetSize>('medium');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [phase, setPhase] = useState<AimPhase>('TITLE_MENU');
  const [timeLeftMs, setTimeLeftMs] = useState<number>(30_000);
  const [targets, setTargets] = useState<AimTarget[]>([]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [score, setScore] = useState(0);
  const [reactionSumMs, setReactionSumMs] = useState(0);
  const [bests, setBests] = useState<AimBests>(loadBests);

  const nextIdRef = useRef(1);
  const endTimeRef = useRef(0);
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;
  const scoreRef = useRef(0);
  scoreRef.current = score;

  const saveBestIfNeeded = useCallback((m: AimMode, finalScore: number) => {
    setBests(prev => {
      if (finalScore <= prev[m]) return prev;
      const next = { ...prev, [m]: finalScore };
      try {
        localStorage.setItem(BEST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota
      }
      return next;
    });
  }, []);

  const spawnTarget = useCallback((existing: AimTarget[], isTracking: boolean): AimTarget => {
    let bestX = 50;
    let bestY = 50;
    for (let attempt = 0; attempt < 20; attempt++) {
      const cx = 10 + Math.random() * 80;
      const cy = 14 + Math.random() * 72;
      const farEnough = existing.every(t => Math.hypot(t.x - cx, t.y - cy) > 16);
      bestX = cx;
      bestY = cy;
      if (farEnough) break;
    }
    const angle = Math.random() * Math.PI * 2;
    const speed = isTracking ? 28 + Math.random() * 14 : 0;
    return {
      id: nextIdRef.current++,
      x: bestX,
      y: bestY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      spawnedAt: performance.now(),
    };
  }, []);

  const startRound = useCallback(
    (selectedMode: AimMode = mode) => {
      const count = selectedMode === 'gridshot' ? 3 : 1;
      const initial: AimTarget[] = [];
      for (let i = 0; i < count; i++) {
        initial.push(spawnTarget(initial, selectedMode === 'tracking'));
      }
      setTargets(initial);
      setHits(0);
      setMisses(0);
      setScore(0);
      setReactionSumMs(0);
      setTimeLeftMs(durationSec * 1000);
      endTimeRef.current = performance.now() + durationSec * 1000;
      setPhase('PLAYING');
    },
    [mode, durationSec, spawnTarget]
  );

  // Timer + Tracking motion loop
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      const remaining = Math.max(0, endTimeRef.current - now);
      setTimeLeftMs(remaining);

      if (mode === 'tracking') {
        setTargets(prev =>
          prev.map(tg => {
            let nx = tg.x + tg.vx * dt;
            let ny = tg.y + tg.vy * dt;
            let nvx = tg.vx;
            let nvy = tg.vy;
            if (nx < 8 || nx > 92) {
              nvx = -nvx;
              nx = Math.max(8, Math.min(92, nx));
            }
            if (ny < 12 || ny > 88) {
              nvy = -nvy;
              ny = Math.max(12, Math.min(88, ny));
            }
            return { ...tg, x: nx, y: ny, vx: nvx, vy: nvy };
          })
        );
      }

      if (remaining <= 0) {
        playArcadeSound('gameover', soundRef.current);
        saveBestIfNeeded(mode, scoreRef.current);
        setPhase('GAME_OVER');
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phase, mode, saveBestIfNeeded]);

  const handleHitTarget = (target: AimTarget, e: React.PointerEvent) => {
    e.stopPropagation();
    if (phase !== 'PLAYING') return;
    const elapsed = Math.max(40, Math.round(performance.now() - target.spawnedAt));
    playArcadeSound('hit', soundRef.current);
    setHits(h => h + 1);
    setReactionSumMs(s => s + elapsed);
    const speedBonus = Math.max(20, Math.round(250 - elapsed * 0.25));
    setScore(s => s + 100 + speedBonus);

    setTargets(prev => {
      const remaining = prev.filter(item => item.id !== target.id);
      return [...remaining, spawnTarget(remaining, mode === 'tracking')];
    });
  };

  const handleMissClick = () => {
    if (phase !== 'PLAYING') return;
    playArcadeSound('miss', soundRef.current);
    setMisses(m => m + 1);
    setScore(s => Math.max(0, s - 35));
  };

  const accuracy = computeAimAccuracy(hits, misses);
  const avgTtk = hits > 0 ? Math.round(reactionSumMs / hits) : 0;
  const elapsedSec = Math.max(0.5, durationSec - timeLeftMs / 1000);
  const targetsPerSec = hits > 0 ? (hits / elapsedSec).toFixed(2) : '0.00';
  const radiusPx = mode === 'flick' ? Math.max(14, SIZE_RADIUS_PX[targetSize] - 6) : SIZE_RADIUS_PX[targetSize];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t('tool_aim_trainer_title', 'Aim Trainer Studio')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('aim_subtitle', 'Practice FPS flicking, gridshot cadence, and moving-target tracking offline with accuracy and time-to-hit stats.')}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
            {(
              [
                { id: 'gridshot' as AimMode, label: t('aim_mode_gridshot', 'Gridshot (3)') },
                { id: 'flick' as AimMode, label: t('aim_mode_flick', 'Micro-Flick') },
                { id: 'tracking' as AimMode, label: t('aim_mode_tracking', 'Moving Target') },
              ] as const
            ).map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMode(m.id);
                  setPhase('TITLE_MENU');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  mode === m.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <select
            value={durationSec}
            disabled={phase === 'PLAYING'}
            onChange={e => setDurationSec(Number(e.target.value) || 30)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-200 disabled:opacity-50"
          >
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </select>

          <select
            value={targetSize}
            disabled={phase === 'PLAYING'}
            onChange={e => setTargetSize(e.target.value as TargetSize)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 disabled:opacity-50"
          >
            <option value="small">{t('aim_size_small', 'Small')}</option>
            <option value="medium">{t('aim_size_medium', 'Medium')}</option>
            <option value="large">{t('aim_size_large', 'Large')}</option>
          </select>

          <button
            type="button"
            onClick={() => setSoundEnabled(prev => !prev)}
            aria-label={soundEnabled ? t('game_mute', 'Mute sound') : t('game_unmute', 'Enable sound')}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Live HUD Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">{t('aim_time_left', 'Time')}</span>
          <span className="text-xl font-mono font-bold text-white tabular-nums">
            {(timeLeftMs / 1000).toFixed(1)}s
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">{t('game_score', 'Score')}</span>
          <span className="text-xl font-mono font-bold text-indigo-400 tabular-nums">
            {score.toLocaleString()}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">{t('aim_accuracy', 'Accuracy')}</span>
          <span className="text-xl font-mono font-bold text-emerald-400 tabular-nums">
            {accuracy}%
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 block">{t('aim_avg_hit', 'Avg Hit / TPS')}</span>
          <span className="text-base font-mono font-bold text-slate-100 tabular-nums">
            {avgTtk > 0 ? `${avgTtk}ms` : '—'} · {targetsPerSec}/s
          </span>
        </div>
        <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>{t('game_best', 'Best')}</span>
          </span>
          <span className="text-xl font-mono font-bold text-amber-400 tabular-nums">
            {Math.max(bests[mode], score).toLocaleString()}
          </span>
        </div>
      </div>

      {/* Arena Canvas */}
      <div
        onPointerDown={handleMissClick}
        className="relative w-full h-[430px] rounded-2xl border border-slate-800 od-fixed-dark-stage overflow-hidden select-none cursor-crosshair"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 45%, rgba(30,41,59,0.75) 0%, rgba(9,13,22,0.98) 80%), linear-gradient(to right, rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.06) 1px, transparent 1px)',
          backgroundSize: '100% 100%, 36px 36px, 36px 36px',
        }}
      >
        {phase === 'PLAYING' &&
          targets.map(tg => (
            <button
              key={tg.id}
              type="button"
              onPointerDown={e => handleHitTarget(tg, e)}
              aria-label="Target"
              style={{
                left: `${tg.x}%`,
                top: `${tg.y}%`,
                width: radiusPx * 2,
                height: radiusPx * 2,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 border-2 border-white/80 shadow-lg shadow-cyan-500/30 flex items-center justify-center active:scale-90 transition-transform cursor-crosshair"
            >
              <span className="w-2 h-2 rounded-full bg-white" />
            </button>
          ))}

        {phase !== 'PLAYING' && (
          <div
            onPointerDown={e => e.stopPropagation()}
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-4 cursor-default"
          >
            {phase === 'TITLE_MENU' ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-white">
                  {t('tool_aim_trainer_title', 'Aim Trainer Studio')}
                </h3>
                <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
                  {t('aim_start_hint', 'Click glowing targets as quickly and accurately as possible. Missed clicks deduct points.')}
                </p>
                <button
                  type="button"
                  onClick={() => startRound()}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>{t('game_start', 'Start Game')}</span>
                </button>
              </>
            ) : (
              <>
                <Crosshair className="w-10 h-10 text-emerald-400" />
                <h3 className="text-2xl font-bold text-white">{t('aim_round_complete', 'Round Complete')}</h3>
                <div className="text-sm font-mono tabular-nums text-slate-200">
                  {t('game_final_score', 'Score: {score}', { score: score.toLocaleString() })} ·{' '}
                  {t('aim_accuracy', 'Accuracy')}: {accuracy}% · {hits} {t('aim_hits_word', 'hits')}
                </div>
                <button
                  type="button"
                  onClick={() => startRound()}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t('game_play_again', 'Play Again')}</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
