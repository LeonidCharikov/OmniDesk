import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Crosshair,
  Music,
  Play,
  RotateCcw,
  Target,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  computeComboMultiplier,
  computeRhythmAccuracy,
  computeRhythmLetterGrade,
  generateBeatChart,
  judgeRhythmOffset,
  RHYTHM_WINDOWS,
  RhythmJudgeCounts,
  RhythmJudgeGrade,
  RhythmMode,
  RhythmNote,
} from './rhythmTiming.logic';
import { evaluateTimingBarHit } from './reflex.logic';
import { playArcadeSound, playNoteTone } from './gamingAudio';

const BEST_RHYTHM_KEY = 'omnidesk_rhythm_timing_best_v1';
const APPROACH_MS = 1150;
const TOTAL_CHART_NOTES = 28;

type BestScores = Record<RhythmMode, number>;

function loadBests(): BestScores {
  try {
    const raw = localStorage.getItem(BEST_RHYTHM_KEY);
    if (!raw) return { beatbar: 0, aimrings: 0, skillcheck: 0 };
    const parsed = JSON.parse(raw) as Partial<BestScores>;
    return {
      beatbar: Math.max(0, Number(parsed.beatbar) || 0),
      aimrings: Math.max(0, Number(parsed.aimrings) || 0),
      skillcheck: Math.max(0, Number(parsed.skillcheck) || 0),
    };
  } catch {
    return { beatbar: 0, aimrings: 0, skillcheck: 0 };
  }
}

export const RhythmTimingBarTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<RhythmMode>('beatbar');
  const [bpm, setBpm] = useState(110);
  const [audioOffsetMs, setAudioOffsetMs] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bests, setBests] = useState<BestScores>(loadBests);

  // Beatbar & Aim-Rings shared run state
  const [phase, setPhase] = useState<'IDLE' | 'RUNNING' | 'DONE'>('IDLE');
  const [songTimeMs, setSongTimeMs] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [counts, setCounts] = useState<RhythmJudgeCounts>({ perfect: 0, great: 0, good: 0, miss: 0 });
  const [lastJudge, setLastJudge] = useState<{
    grade: RhythmJudgeGrade;
    offsetMs: number;
    direction: 'exact' | 'early' | 'late';
  } | null>(null);
  const [offsetHistory, setOffsetHistory] = useState<number[]>([]);
  const [notes, setNotes] = useState<RhythmNote[]>([]);

  // Mode 3: Skill-Check oscillating bar
  const [skillRunning, setSkillRunning] = useState(false);
  const [skillCursor, setSkillCursor] = useState(0.08);
  const [skillZoneCenter, setSkillZoneCenter] = useState(0.5);
  const [skillZoneWidth, setSkillZoneWidth] = useState(0.22);
  const [skillStreak, setSkillStreak] = useState(0);
  const [skillFeedback, setSkillFeedback] = useState<'none' | 'perfect' | 'hit' | 'miss'>('none');

  const startTsRef = useRef(0);
  const notesRef = useRef<RhythmNote[]>([]);
  const lastBeatPlayedRef = useRef(-1);
  const comboRef = useRef(0);
  const scoreRef = useRef(0);
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;
  const offsetRef = useRef(audioOffsetMs);
  offsetRef.current = audioOffsetMs;

  const skillCursorRef = useRef(0.08);
  const skillDirRef = useRef(1);
  const skillSpeedRef = useRef(0.78);

  const saveBest = useCallback((m: RhythmMode, val: number) => {
    setBests(prev => {
      if (val <= prev[m]) return prev;
      const next = { ...prev, [m]: val };
      try {
        localStorage.setItem(BEST_RHYTHM_KEY, JSON.stringify(next));
      } catch {
        // ignore quota
      }
      return next;
    });
  }, []);

  const startRhythmSession = useCallback(
    (targetMode: RhythmMode = mode) => {
      const chart = generateBeatChart(bpm, TOTAL_CHART_NOTES, 1600);
      notesRef.current = chart;
      setNotes(chart);
      startTsRef.current = performance.now();
      lastBeatPlayedRef.current = -1;
      comboRef.current = 0;
      scoreRef.current = 0;
      setSongTimeMs(0);
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setCounts({ perfect: 0, great: 0, good: 0, miss: 0 });
      setLastJudge(null);
      setOffsetHistory([]);
      setPhase('RUNNING');
      setMode(targetMode);
    },
    [bpm, mode]
  );

  // Beatbar & Aim-Rings animation + metronome loop
  useEffect(() => {
    if (mode === 'skillcheck' || phase !== 'RUNNING') return;
    let rafId = 0;
    const beatMs = 60000 / bpm;

    const frame = (now: number) => {
      const elapsed = now - startTsRef.current;
      setSongTimeMs(elapsed);

      // Synthesized metronome pulse on every beat
      const beatIndex = Math.floor(elapsed / beatMs);
      if (beatIndex > lastBeatPlayedRef.current && beatIndex >= 0) {
        lastBeatPlayedRef.current = beatIndex;
        const isDownbeat = beatIndex % 4 === 0;
        playNoteTone(isDownbeat ? 660 : 440, 0.055, 'sine', soundRef.current, isDownbeat ? 0.08 : 0.045);
      }

      // Auto-miss notes that passed beyond the late window
      let changed = false;
      for (const note of notesRef.current) {
        if (!note.hit && !note.missed && elapsed - note.targetTimeMs > RHYTHM_WINDOWS.goodMs + 30) {
          note.missed = true;
          note.grade = 'miss';
          changed = true;
          comboRef.current = 0;
          setCombo(0);
          setCounts(prev => ({ ...prev, miss: prev.miss + 1 }));
          setLastJudge({ grade: 'miss', offsetMs: RHYTHM_WINDOWS.goodMs + 30, direction: 'late' });
          playArcadeSound('miss', soundRef.current);
        }
      }

      if (changed) {
        setNotes([...notesRef.current]);
      }

      const lastNote = notesRef.current[notesRef.current.length - 1];
      if (lastNote && elapsed > lastNote.targetTimeMs + 500) {
        setPhase('DONE');
        saveBest(mode, scoreRef.current);
        return;
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [mode, phase, bpm, saveBest]);

  // Apply hit evaluation to a specific note (or closest unhit note in Beatbar mode)
  const evaluateNoteHit = useCallback(
    (specificNoteId?: number) => {
      if (phase !== 'RUNNING') return;
      const elapsed = performance.now() - startTsRef.current - offsetRef.current;

      let candidate: RhythmNote | undefined;
      if (specificNoteId !== undefined) {
        candidate = notesRef.current.find(n => n.id === specificNoteId && !n.hit && !n.missed);
      } else {
        let bestAbs = Infinity;
        for (const n of notesRef.current) {
          if (n.hit || n.missed) continue;
          const diff = Math.abs(elapsed - n.targetTimeMs);
          if (diff < bestAbs) {
            bestAbs = diff;
            candidate = n;
          }
        }
      }

      if (!candidate) return;
      const offsetMs = elapsed - candidate.targetTimeMs;
      if (Math.abs(offsetMs) > 220) return; // Ignore clicks far away from any note

      const judgment = judgeRhythmOffset(offsetMs);
      candidate.hit = judgment.grade !== 'miss';
      candidate.missed = judgment.grade === 'miss';
      candidate.grade = judgment.grade;
      setNotes([...notesRef.current]);
      setLastJudge({ grade: judgment.grade, offsetMs: judgment.offsetMs, direction: judgment.direction });

      if (judgment.grade === 'miss') {
        comboRef.current = 0;
        setCombo(0);
        setCounts(prev => ({ ...prev, miss: prev.miss + 1 }));
        playArcadeSound('miss', soundRef.current);
      } else {
        const nextCombo = comboRef.current + 1;
        comboRef.current = nextCombo;
        setCombo(nextCombo);
        setMaxCombo(m => Math.max(m, nextCombo));
        const mult = computeComboMultiplier(nextCombo);
        scoreRef.current += judgment.points * mult;
        setScore(scoreRef.current);
        setOffsetHistory(prev => [...prev.slice(-24), judgment.offsetMs]);
        setCounts(prev => ({
          ...prev,
          [judgment.grade]: prev[judgment.grade] + 1,
        }));
        playArcadeSound(judgment.grade === 'perfect' ? 'bonus' : 'hit', soundRef.current);
      }
    },
    [phase]
  );

  // Mode 3: Skill-Check oscillating loop
  useEffect(() => {
    if (mode !== 'skillcheck' || !skillRunning) return;
    let rafId = 0;
    let lastTs = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      let pos = skillCursorRef.current + skillDirRef.current * skillSpeedRef.current * dt;
      if (pos >= 1) {
        pos = 1;
        skillDirRef.current = -1;
      } else if (pos <= 0) {
        pos = 0;
        skillDirRef.current = 1;
      }
      skillCursorRef.current = pos;
      setSkillCursor(pos);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [mode, skillRunning]);

  const startSkillCheck = useCallback(() => {
    setSkillStreak(0);
    setSkillZoneCenter(0.5);
    setSkillZoneWidth(0.24);
    skillCursorRef.current = 0.06;
    skillDirRef.current = 1;
    skillSpeedRef.current = 0.78;
    setSkillCursor(0.06);
    setSkillFeedback('none');
    setSkillRunning(true);
  }, []);

  const triggerSkillCheckHit = useCallback(() => {
    if (!skillRunning) {
      startSkillCheck();
      return;
    }
    const res = evaluateTimingBarHit(skillCursorRef.current, skillZoneCenter, skillZoneWidth);
    if (res.hit) {
      const nextStreak = skillStreak + 1;
      setSkillStreak(nextStreak);
      saveBest('skillcheck', nextStreak);
      setSkillFeedback(res.perfect ? 'perfect' : 'hit');
      playArcadeSound(res.perfect ? 'bonus' : 'hit', soundRef.current);
      const nextWidth = Math.max(0.065, 0.24 - nextStreak * 0.01);
      const margin = nextWidth / 2 + 0.08;
      setSkillZoneWidth(nextWidth);
      setSkillZoneCenter(margin + Math.random() * (1 - margin * 2));
      skillSpeedRef.current = Math.min(2.5, 0.78 + nextStreak * 0.09);
    } else {
      playArcadeSound('miss', soundRef.current);
      setSkillFeedback('miss');
      setSkillRunning(false);
    }
  }, [skillRunning, startSkillCheck, skillZoneCenter, skillZoneWidth, skillStreak, saveBest]);

  // Keyboard support (Space / D / F / J / K)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (e.code === 'Space' || k === 'd' || k === 'f' || k === 'j' || k === 'k') {
        e.preventDefault();
        if (mode === 'skillcheck') {
          triggerSkillCheckHit();
        } else if (mode === 'beatbar') {
          if (phase === 'RUNNING') evaluateNoteHit();
          else startRhythmSession('beatbar');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, phase, evaluateNoteHit, startRhythmSession, triggerSkillCheckHit]);

  const accuracy = computeRhythmAccuracy(counts);
  const letterGrade = computeRhythmLetterGrade(accuracy);

  const visibleBeatNotes = notes.filter(
    n => !n.hit && !n.missed && n.targetTimeMs - songTimeMs <= APPROACH_MS && songTimeMs - n.targetTimeMs <= 160
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t('tool_rhythm_timing_bar_title', 'Aim & Rhythm Timing Bar Studio')}
          </h2>
          <p className="text-xs text-slate-400">
            {t(
              'rhy_subtitle',
              'Hit beat-synced notes on a scrolling timing lane, click shrinking BPM approach circles, or streak an escalating precision skill-check bar.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
            {(
              [
                { id: 'beatbar' as RhythmMode, label: t('rhy_mode_beatbar', 'Rhythm Bar'), icon: <Music className="w-3.5 h-3.5" /> },
                { id: 'aimrings' as RhythmMode, label: t('rhy_mode_aimrings', 'Aim-Click Rings'), icon: <Target className="w-3.5 h-3.5" /> },
                { id: 'skillcheck' as RhythmMode, label: t('rhy_mode_skillcheck', 'Skill-Check Bar'), icon: <Crosshair className="w-3.5 h-3.5" /> },
              ] as const
            ).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPhase('IDLE');
                  setSkillRunning(false);
                  setMode(opt.id);
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  mode === opt.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

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

      {/* BPM & Audio Calibration Bar (for Beatbar & Aim-Rings) */}
      {mode !== 'skillcheck' && (
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400">{t('rhy_tempo', 'Tempo (BPM)')}:</span>
            {[85, 110, 130, 155].map(val => (
              <button
                key={val}
                type="button"
                disabled={phase === 'RUNNING'}
                onClick={() => setBpm(val)}
                className={`px-2.5 py-1 rounded-lg border font-mono transition-colors disabled:opacity-50 ${
                  bpm === val
                    ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {val} BPM
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span>{t('rhy_offset', 'Audio Offset')}:</span>
            <input
              type="range"
              min={-100}
              max={100}
              step={5}
              value={audioOffsetMs}
              onChange={e => setAudioOffsetMs(Number(e.target.value))}
              className="w-28 accent-indigo-500"
            />
            <span className="font-mono text-white w-14 text-right">
              {audioOffsetMs > 0 ? `+${audioOffsetMs}` : audioOffsetMs} ms
            </span>
          </div>
        </div>
      )}

      {/* MODE 1: BEAT-SYNCED RHYTHM BAR */}
      {mode === 'beatbar' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('game_score', 'Score')}</span>
              <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">{score}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('rhy_combo', 'Combo')}</span>
              <span className="text-2xl font-mono font-bold text-indigo-400 tabular-nums">
                {combo}× <span className="text-xs text-slate-400">({computeComboMultiplier(combo)}x)</span>
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('aim_accuracy', 'Accuracy')}</span>
              <span className="text-2xl font-mono font-bold text-white tabular-nums">{accuracy.toFixed(1)}%</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>{t('game_best', 'Best')}</span>
              </span>
              <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums">
                {Math.max(bests.beatbar, score)}
              </span>
            </div>
          </div>

          {/* Scrolling Timing Lane */}
          <div className="p-5 rounded-2xl od-fixed-dark-stage border border-slate-800 space-y-5">
            <div className="relative h-28 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden select-none">
              {/* Hit Receptor Line at 18% from left */}
              <div
                className="absolute top-0 bottom-0 w-10 -ml-5 bg-emerald-500/15 border-x border-emerald-400/50"
                style={{ left: '18%' }}
              />
              <div
                className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]"
                style={{ left: '18%' }}
              />

              {/* Approaching Beat Notes */}
              {visibleBeatNotes.map(note => {
                const timeUntilHit = note.targetTimeMs - songTimeMs;
                const xPct = 18 + (timeUntilHit / APPROACH_MS) * 80;
                return (
                  <div
                    key={note.id}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-5 h-16 rounded-lg bg-indigo-400 border-2 border-white shadow-[0_0_14px_rgba(129,140,248,0.8)]"
                    style={{ left: `${xPct}%` }}
                  />
                );
              })}

              {/* Center Judgment Callout */}
              {lastJudge && (
                <div className="absolute right-4 top-3 text-right font-mono">
                  <div
                    className={`text-sm font-extrabold uppercase ${
                      lastJudge.grade === 'perfect'
                        ? 'text-amber-400'
                        : lastJudge.grade === 'great'
                          ? 'text-emerald-400'
                          : lastJudge.grade === 'good'
                            ? 'text-sky-400'
                            : 'text-rose-400'
                    }`}
                  >
                    {lastJudge.grade}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {lastJudge.offsetMs > 0 ? `+${lastJudge.offsetMs}` : lastJudge.offsetMs} ms ({lastJudge.direction})
                  </div>
                </div>
              )}
            </div>

            {/* Early / Late Offset Error Meter */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>EARLY (-125ms)</span>
                <span>PERFECT (0ms)</span>
                <span>LATE (+125ms)</span>
              </div>
              <div className="relative h-5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -ml-[1px] bg-amber-400" />
                {offsetHistory.map((off, idx) => {
                  const pct = Math.max(2, Math.min(98, 50 + (off / 125) * 48));
                  const abs = Math.abs(off);
                  return (
                    <div
                      key={idx}
                      className={`absolute top-1 bottom-1 w-1 rounded-full ${
                        abs <= RHYTHM_WINDOWS.perfectMs
                          ? 'bg-amber-400'
                          : abs <= RHYTHM_WINDOWS.greatMs
                            ? 'bg-emerald-400'
                            : 'bg-sky-400'
                      }`}
                      style={{ left: `${pct}%`, opacity: 0.4 + (idx / Math.max(1, offsetHistory.length)) * 0.6 }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Action Button / Summary */}
            <div className="flex flex-col items-center gap-3">
              {phase === 'DONE' ? (
                <div className="text-center space-y-2">
                  <div className="text-4xl font-mono font-extrabold text-amber-400">
                    {t('rhy_grade', 'Grade')}: {letterGrade}
                  </div>
                  <div className="text-xs font-mono text-slate-300">
                    Perfect {counts.perfect} · Great {counts.great} · Good {counts.good} · Miss {counts.miss} · Max Combo {maxCombo}×
                  </div>
                  <button
                    type="button"
                    onClick={() => startRhythmSession('beatbar')}
                    className="mt-1 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold inline-flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{t('game_play_again', 'Play Again')}</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onPointerDown={() =>
                    phase === 'RUNNING' ? evaluateNoteHit() : startRhythmSession('beatbar')
                  }
                  className={`px-10 py-3.5 rounded-xl text-sm font-bold text-white transition-colors min-w-[240px] ${
                    phase === 'RUNNING'
                      ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98]'
                      : 'bg-indigo-600 hover:bg-indigo-500'
                  }`}
                >
                  {phase === 'RUNNING'
                    ? t('rhy_tap_btn', 'TAP ON BEAT (Space / D / F / J / K)')
                    : t('rhy_start_beatbar', 'Start Rhythm Bar')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: AIM-CLICK RHYTHM RINGS */}
      {mode === 'aimrings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('game_score', 'Score')}</span>
              <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">{score}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('rhy_combo', 'Combo')}</span>
              <span className="text-2xl font-mono font-bold text-indigo-400 tabular-nums">{combo}×</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('aim_accuracy', 'Accuracy')}</span>
              <span className="text-2xl font-mono font-bold text-white tabular-nums">{accuracy.toFixed(1)}%</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>{t('game_best', 'Best')}</span>
              </span>
              <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums">
                {Math.max(bests.aimrings, score)}
              </span>
            </div>
          </div>

          <div className="relative h-[400px] rounded-2xl od-fixed-dark-stage border border-slate-800 overflow-hidden select-none">
            {phase === 'RUNNING' &&
              visibleBeatNotes.map(note => {
                const rem = note.targetTimeMs - songTimeMs;
                const progress = Math.max(0, Math.min(1, rem / APPROACH_MS));
                const ringScale = 1 + progress * 1.45;
                return (
                  <button
                    key={note.id}
                    type="button"
                    onPointerDown={e => {
                      e.stopPropagation();
                      evaluateNoteHit(note.id);
                    }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-indigo-600/85 border-2 border-white text-white font-mono text-sm font-bold flex items-center justify-center cursor-pointer shadow-lg"
                    style={{ left: `${note.xPct ?? 50}%`, top: `${note.yPct ?? 50}%` }}
                  >
                    <span>{note.id}</span>
                    <span
                      className="pointer-events-none absolute inset-0 rounded-full border-2 border-amber-400"
                      style={{ transform: `scale(${ringScale})`, opacity: Math.max(0.25, 1 - progress * 0.7) }}
                    />
                  </button>
                );
              })}

            {phase !== 'RUNNING' && (
              <div className="absolute inset-0 bg-slate-950/75 flex flex-col items-center justify-center p-6 text-center space-y-4">
                {phase === 'DONE' ? (
                  <>
                    <div className="text-4xl font-mono font-extrabold text-amber-400">
                      {t('rhy_grade', 'Grade')}: {letterGrade}
                    </div>
                    <div className="text-xs font-mono text-slate-200">
                      {t('game_final_score', 'Score: {score}', { score })} · {accuracy.toFixed(1)}% · Max Combo {maxCombo}×
                    </div>
                    <button
                      type="button"
                      onClick={() => startRhythmSession('aimrings')}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold inline-flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{t('game_play_again', 'Play Again')}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <Target className="w-11 h-11 text-indigo-400" />
                    <h3 className="text-xl font-bold text-white">
                      {t('rhy_aimrings_title', 'Aim-Click Approach Circles')}
                    </h3>
                    <p className="text-xs text-slate-300 max-w-md">
                      {t(
                        'rhy_aimrings_desc',
                        'Click each numbered circle right when its shrinking gold approach ring aligns with the white rim on the beat.'
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => startRhythmSession('aimrings')}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold inline-flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>{t('game_start', 'Start Aim-Rhythm')}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: SKILL-CHECK PRECISION BAR */}
      {mode === 'skillcheck' && (
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-base font-semibold text-white">
                {t('rhy_skillcheck_title', 'Escalating Skill-Check Bar')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('rhy_skillcheck_desc', 'Press Space or click right as the white needle crosses the green zone (gold center = Perfect).')}
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <div>
                <span className="text-slate-400">{t('rx_streak', 'Streak')}: </span>
                <span className="text-emerald-400 font-bold text-base">{skillStreak}</span>
              </div>
              <div>
                <span className="text-slate-400">{t('game_best', 'Best')}: </span>
                <span className="text-amber-400 font-bold text-base">{bests.skillcheck}</span>
              </div>
            </div>
          </div>

          <div className="relative h-16 rounded-xl od-fixed-dark-stage border border-slate-800 overflow-hidden select-none">
            <div
              className="absolute top-0 bottom-0 bg-emerald-500/35 border-x-2 border-emerald-400"
              style={{
                left: `${(skillZoneCenter - skillZoneWidth / 2) * 100}%`,
                width: `${skillZoneWidth * 100}%`,
              }}
            />
            <div
              className="absolute top-0 bottom-0 bg-amber-400/55"
              style={{
                left: `${(skillZoneCenter - skillZoneWidth * 0.16) * 100}%`,
                width: `${skillZoneWidth * 0.32 * 100}%`,
              }}
            />
            <div
              className="absolute top-1 bottom-1 w-2 -ml-1 rounded-full bg-white shadow-lg"
              style={{ left: `${skillCursor * 100}%` }}
            />
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              onPointerDown={triggerSkillCheckHit}
              className={`px-8 py-3.5 rounded-xl text-sm font-bold text-white min-w-[220px] transition-colors ${
                skillRunning ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {skillRunning
                ? t('rx_timing_hit_btn', 'HIT NOW (Space)')
                : skillFeedback === 'miss'
                  ? t('game_play_again', 'Play Again')
                  : t('rx_timing_start_btn', 'Start Timing Run')}
            </button>
            <div className="h-5 text-xs font-semibold">
              {skillFeedback === 'perfect' && (
                <span className="text-amber-400">{t('rx_fb_perfect', 'PERFECT CENTER HIT!')}</span>
              )}
              {skillFeedback === 'hit' && (
                <span className="text-emerald-400">{t('rx_fb_hit', 'Nice hit! Speed increasing...')}</span>
              )}
              {skillFeedback === 'miss' && (
                <span className="text-rose-400">
                  {t('rx_fb_miss', 'Missed the zone — Final streak: {streak}', { streak: skillStreak })}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
