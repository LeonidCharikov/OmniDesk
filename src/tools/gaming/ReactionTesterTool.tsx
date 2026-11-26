import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  Crosshair,
  RotateCcw,
  Trophy,
  Volume2,
  Zap,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  evaluateTimingBarHit,
  summarizeReactionTimes,
} from './reflex.logic';
import { playArcadeSound } from './gamingAudio';

const BEST_STORAGE_KEY = 'omnidesk_reaction_best_v1';
const TOTAL_ROUNDS = 5;

type ReactionMode = 'visual' | 'audio' | 'timing';
type ReflexPhase = 'IDLE' | 'WAITING' | 'READY' | 'TOO_EARLY' | 'RESULT' | 'COMPLETE';

interface ReactionBests {
  visualBestMs: number | null;
  audioBestMs: number | null;
  timingBestStreak: number;
}

function loadBests(): ReactionBests {
  try {
    const raw = localStorage.getItem(BEST_STORAGE_KEY);
    if (!raw) return { visualBestMs: null, audioBestMs: null, timingBestStreak: 0 };
    const parsed = JSON.parse(raw) as Partial<ReactionBests>;
    return {
      visualBestMs:
        typeof parsed.visualBestMs === 'number' && parsed.visualBestMs > 0
          ? parsed.visualBestMs
          : null,
      audioBestMs:
        typeof parsed.audioBestMs === 'number' && parsed.audioBestMs > 0
          ? parsed.audioBestMs
          : null,
      timingBestStreak: Math.max(0, Number(parsed.timingBestStreak) || 0),
    };
  } catch {
    return { visualBestMs: null, audioBestMs: null, timingBestStreak: 0 };
  }
}

export const ReactionTesterTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<ReactionMode>('visual');
  const [phase, setPhase] = useState<ReflexPhase>('IDLE');
  const [rounds, setRounds] = useState<number[]>([]);
  const [lastMs, setLastMs] = useState<number | null>(null);
  const [bests, setBests] = useState<ReactionBests>(loadBests);

  // Timing bar state
  const [timingRunning, setTimingRunning] = useState(false);
  const [timingStreak, setTimingStreak] = useState(0);
  const [timingPerfects, setTimingPerfects] = useState(0);
  const [timingZoneCenter, setTimingZoneCenter] = useState(0.5);
  const [timingZoneWidth, setTimingZoneWidth] = useState(0.22);
  const [timingCursor, setTimingCursor] = useState(0.1);
  const [timingFeedback, setTimingFeedback] = useState<'none' | 'perfect' | 'hit' | 'miss'>('none');

  const timerRef = useRef<number | null>(null);
  const cueTimeRef = useRef<number>(0);
  const timingCursorRef = useRef<number>(0.1);
  const timingDirRef = useRef<number>(1);
  const timingSpeedRef = useRef<number>(0.75);

  const persistBests = useCallback((next: ReactionBests) => {
    setBests(next);
    try {
      localStorage.setItem(BEST_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota
    }
  }, []);

  const clearWaitTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearWaitTimer, [clearWaitTimer]);

  const startRound = useCallback(
    (targetMode: ReactionMode = mode) => {
      clearWaitTimer();
      setPhase('WAITING');
      const delayMs = 1500 + Math.floor(Math.random() * 2800);
      timerRef.current = window.setTimeout(() => {
        cueTimeRef.current = performance.now();
        setPhase('READY');
        if (targetMode === 'audio') {
          playArcadeSound('cue', true);
        }
      }, delayMs);
    },
    [clearWaitTimer, mode]
  );

  const resetSeries = useCallback(() => {
    clearWaitTimer();
    setRounds([]);
    setLastMs(null);
    setPhase('IDLE');
  }, [clearWaitTimer]);

  const handleArenaPress = useCallback(() => {
    if (mode === 'timing') return;

    if (phase === 'IDLE' || phase === 'TOO_EARLY') {
      startRound();
      return;
    }

    if (phase === 'COMPLETE') {
      setRounds([]);
      setLastMs(null);
      startRound();
      return;
    }

    if (phase === 'RESULT') {
      startRound();
      return;
    }

    if (phase === 'WAITING') {
      clearWaitTimer();
      playArcadeSound('miss', true);
      setPhase('TOO_EARLY');
      return;
    }

    if (phase === 'READY') {
      const reactionMs = Math.max(1, Math.round(performance.now() - cueTimeRef.current));
      setLastMs(reactionMs);
      playArcadeSound('hit', true);
      const nextRounds = [...rounds, reactionMs];
      setRounds(nextRounds);

      const bestKey = mode === 'audio' ? 'audioBestMs' : 'visualBestMs';
      const prevBest = bests[bestKey];
      if (prevBest === null || reactionMs < prevBest) {
        persistBests({ ...bests, [bestKey]: reactionMs });
      }

      if (nextRounds.length >= TOTAL_ROUNDS) {
        setPhase('COMPLETE');
      } else {
        setPhase('RESULT');
      }
    }
  }, [mode, phase, startRound, clearWaitTimer, rounds, bests, persistBests]);

  // Timing Bar animation loop
  useEffect(() => {
    if (mode !== 'timing' || !timingRunning) return;
    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      let pos = timingCursorRef.current + timingDirRef.current * timingSpeedRef.current * dt;
      if (pos >= 1) {
        pos = 1;
        timingDirRef.current = -1;
      } else if (pos <= 0) {
        pos = 0;
        timingDirRef.current = 1;
      }
      timingCursorRef.current = pos;
      setTimingCursor(pos);
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [mode, timingRunning]);

  const startTimingRun = useCallback(() => {
    setTimingStreak(0);
    setTimingPerfects(0);
    setTimingZoneCenter(0.5);
    setTimingZoneWidth(0.24);
    timingCursorRef.current = 0.05;
    timingDirRef.current = 1;
    timingSpeedRef.current = 0.72;
    setTimingCursor(0.05);
    setTimingFeedback('none');
    setTimingRunning(true);
  }, []);

  const triggerTimingHit = useCallback(() => {
    if (!timingRunning) {
      startTimingRun();
      return;
    }
    const res = evaluateTimingBarHit(timingCursorRef.current, timingZoneCenter, timingZoneWidth);
    if (res.hit) {
      const nextStreak = timingStreak + 1;
      setTimingStreak(nextStreak);
      if (res.perfect) {
        setTimingPerfects(p => p + 1);
        setTimingFeedback('perfect');
        playArcadeSound('bonus', true);
      } else {
        setTimingFeedback('hit');
        playArcadeSound('hit', true);
      }
      if (nextStreak > bests.timingBestStreak) {
        persistBests({ ...bests, timingBestStreak: nextStreak });
      }
      // Escalate difficulty & randomize next target window
      const nextWidth = Math.max(0.07, 0.24 - nextStreak * 0.011);
      const margin = nextWidth / 2 + 0.08;
      const nextCenter = margin + Math.random() * (1 - margin * 2);
      setTimingZoneWidth(nextWidth);
      setTimingZoneCenter(nextCenter);
      timingSpeedRef.current = Math.min(2.35, 0.72 + nextStreak * 0.085);
    } else {
      playArcadeSound('miss', true);
      setTimingFeedback('miss');
      setTimingRunning(false);
    }
  }, [timingRunning, startTimingRun, timingZoneCenter, timingZoneWidth, timingStreak, bests, persistBests]);

  // Spacebar support for all modes
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (mode === 'timing') triggerTimingHit();
        else handleArenaPress();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, handleArenaPress, triggerTimingHit]);

  const summary = summarizeReactionTimes(rounds);

  const stageColorClass =
    phase === 'WAITING'
      ? 'bg-rose-600 text-white'
      : phase === 'READY'
        ? 'bg-emerald-500 text-white'
        : phase === 'TOO_EARLY'
          ? 'bg-amber-600 text-white'
          : 'od-fixed-dark-stage text-white';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t('tool_reaction_tester_title', 'Reaction Time & Timing Lab')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('rx_subtitle', 'Test visual and audio reflexes with sub-millisecond timing, or challenge your precision on the escalating Timing Bar.')}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
          {(
            [
              { id: 'visual' as ReactionMode, label: t('rx_mode_visual', 'Visual Reflex'), icon: <Zap className="w-3.5 h-3.5" /> },
              { id: 'audio' as ReactionMode, label: t('rx_mode_audio', 'Audio Reflex'), icon: <Volume2 className="w-3.5 h-3.5" /> },
              { id: 'timing' as ReactionMode, label: t('rx_mode_timing', 'Timing Bar'), icon: <Crosshair className="w-3.5 h-3.5" /> },
            ] as const
          ).map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                clearWaitTimer();
                setTimingRunning(false);
                setMode(item.id);
                setPhase('IDLE');
                setRounds([]);
                setLastMs(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                mode === item.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode 1 & 2: Visual / Audio Reflex */}
      {mode !== 'timing' ? (
        <div className="space-y-5">
          <button
            type="button"
            onPointerDown={handleArenaPress}
            className={`w-full min-h-[300px] rounded-2xl border border-slate-800 p-8 flex flex-col items-center justify-center text-center select-none cursor-pointer transition-colors duration-100 ${stageColorClass}`}
          >
            {phase === 'IDLE' && (
              <div className="space-y-3">
                {mode === 'audio' ? (
                  <Volume2 className="w-12 h-12 mx-auto text-indigo-400" />
                ) : (
                  <Zap className="w-12 h-12 mx-auto text-indigo-400" />
                )}
                <h3 className="text-2xl font-bold">
                  {mode === 'audio'
                    ? t('rx_audio_idle_title', 'Click or Press Space to Start Audio Test')
                    : t('rx_visual_idle_title', 'Click or Press Space to Start')}
                </h3>
                <p className="text-sm opacity-80 max-w-md mx-auto">
                  {mode === 'audio'
                    ? t('rx_audio_idle_desc', 'Wait for the beep tone, then click or press Space as fast as possible (5 rounds).')
                    : t('rx_visual_idle_desc', 'When the panel turns green, click or press Space as quickly as possible (5 rounds).')}
                </p>
              </div>
            )}

            {phase === 'WAITING' && (
              <div className="space-y-2">
                <h3 className="text-3xl font-bold tracking-tight">
                  {mode === 'audio'
                    ? t('rx_wait_audio', 'Listen closely...')
                    : t('rx_wait_green', 'Wait for Green...')}
                </h3>
                <p className="text-sm opacity-85">
                  {t('rx_round_counter', 'Round {current} of {total}', {
                    current: rounds.length + 1,
                    total: TOTAL_ROUNDS,
                  })}
                </p>
              </div>
            )}

            {phase === 'READY' && (
              <div className="space-y-2">
                <h3 className="text-4xl font-extrabold tracking-tight">
                  {t('rx_click_now', 'CLICK NOW!')}
                </h3>
                <p className="text-sm opacity-90">{t('rx_or_space', 'Click or press Space')}</p>
              </div>
            )}

            {phase === 'TOO_EARLY' && (
              <div className="space-y-2">
                <AlertTriangle className="w-10 h-10 mx-auto" />
                <h3 className="text-2xl font-bold">{t('rx_too_early', 'Too Early!')}</h3>
                <p className="text-sm opacity-90">
                  {t('rx_too_early_desc', 'You clicked before the signal. Click to retry this round.')}
                </p>
              </div>
            )}

            {phase === 'RESULT' && lastMs !== null && (
              <div className="space-y-2">
                <div className="text-5xl font-mono font-extrabold tabular-nums text-emerald-400">
                  {lastMs} ms
                </div>
                <p className="text-sm text-slate-300">
                  {t('rx_click_continue', 'Click or press Space for Round {next} of {total}', {
                    next: rounds.length + 1,
                    total: TOTAL_ROUNDS,
                  })}
                </p>
              </div>
            )}

            {phase === 'COMPLETE' && summary && (
              <div className="space-y-3">
                <div className="text-xs font-mono uppercase tracking-wider text-indigo-300">
                  {t('rx_series_complete', '5-Round Average')}
                </div>
                <div className="text-5xl font-mono font-extrabold tabular-nums text-emerald-400">
                  {summary.averageMs} ms
                </div>
                <p className="text-xs text-slate-300 font-mono tabular-nums">
                  {t('rx_summary_line', 'Best: {best} ms · Worst: {worst} ms · Jitter: ±{sd} ms', {
                    best: summary.bestMs,
                    worst: summary.worstMs,
                    sd: summary.stdDevMs,
                  })}
                </p>
                <div className="pt-2 text-xs text-indigo-300">
                  {t('rx_click_play_again', 'Click or press Space to run a new 5-round set')}
                </div>
              </div>
            )}
          </button>

          {/* Metrics & Round Breakdown */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('rx_stat_avg', 'Session Average')}</span>
              <span className="text-xl font-mono font-bold text-indigo-400 tabular-nums mt-0.5 block">
                {summary ? `${summary.averageMs} ms` : '—'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>{t('rx_stat_all_time', 'All-Time Best')}</span>
              </span>
              <span className="text-xl font-mono font-bold text-amber-400 tabular-nums mt-0.5 block">
                {(mode === 'audio' ? bests.audioBestMs : bests.visualBestMs) !== null
                  ? `${mode === 'audio' ? bests.audioBestMs : bests.visualBestMs} ms`
                  : '—'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('rx_stat_jitter', 'Consistency (±σ)')}</span>
              <span className="text-xl font-mono font-bold text-white tabular-nums mt-0.5 block">
                {summary ? `±${summary.stdDevMs} ms` : '—'}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">{t('rx_stat_rounds', 'Rounds')}</span>
                <span className="text-xl font-mono font-bold text-emerald-400 tabular-nums mt-0.5 block">
                  {rounds.length} / {TOTAL_ROUNDS}
                </span>
              </div>
              <button
                type="button"
                onClick={resetSeries}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                title={t('game_restart', 'Restart')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {rounds.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-2.5">
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('rx_round_history', 'Round History')}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: TOTAL_ROUNDS }).map((_, idx) => {
                  const val = rounds[idx];
                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-center"
                    >
                      <div className="text-[10px] text-slate-500 font-mono">#{idx + 1}</div>
                      <div className="text-sm font-mono font-bold tabular-nums text-white mt-0.5">
                        {val !== undefined ? `${val} ms` : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Mode 3: Timing Bar (Click in the Moment) */
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-base font-semibold text-white">
                {t('rx_timing_title', 'Precision Timing Bar')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('rx_timing_desc', 'Click the button or press Space right when the moving marker passes inside the green target zone.')}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <div>
                <span className="text-slate-400">{t('rx_streak', 'Streak')}: </span>
                <span className="text-emerald-400 font-bold text-base">{timingStreak}</span>
              </div>
              <div>
                <span className="text-slate-400">{t('rx_perfects', 'Perfect')}: </span>
                <span className="text-amber-400 font-bold text-base">{timingPerfects}</span>
              </div>
              <div>
                <span className="text-slate-400">{t('game_best', 'Best')}: </span>
                <span className="text-indigo-400 font-bold text-base">{bests.timingBestStreak}</span>
              </div>
            </div>
          </div>

          {/* Timing Track */}
          <div className="relative h-16 rounded-xl od-fixed-dark-stage border border-slate-800 overflow-hidden select-none">
            {/* Target Zone */}
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/35 border-x-2 border-emerald-400"
              style={{
                left: `${(timingZoneCenter - timingZoneWidth / 2) * 100}%`,
                width: `${timingZoneWidth * 100}%`,
              }}
            />
            {/* Perfect Core */}
            <div
              className="absolute top-0 bottom-0 bg-amber-400/55"
              style={{
                left: `${(timingZoneCenter - timingZoneWidth * 0.16) * 100}%`,
                width: `${timingZoneWidth * 0.32 * 100}%`,
              }}
            />
            {/* Moving Marker */}
            <div
              className="absolute top-1 bottom-1 w-2 -ml-1 rounded-full bg-white shadow-lg"
              style={{ left: `${timingCursor * 100}%` }}
            />
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onPointerDown={triggerTimingHit}
              className={`px-8 py-3.5 rounded-xl text-sm font-bold text-white transition-colors min-w-[220px] ${
                timingRunning
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {timingRunning
                ? t('rx_timing_hit_btn', 'HIT NOW (Space)')
                : timingFeedback === 'miss'
                  ? t('game_play_again', 'Play Again')
                  : t('rx_timing_start_btn', 'Start Timing Run')}
            </button>

            <div className="h-5 text-xs font-semibold">
              {timingFeedback === 'perfect' && (
                <span className="text-amber-400">{t('rx_fb_perfect', 'PERFECT CENTER HIT!')}</span>
              )}
              {timingFeedback === 'hit' && (
                <span className="text-emerald-400">{t('rx_fb_hit', 'Nice hit! Speed increasing...')}</span>
              )}
              {timingFeedback === 'miss' && (
                <span className="text-rose-400">
                  {t('rx_fb_miss', 'Missed the zone — Final streak: {streak}', { streak: timingStreak })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
