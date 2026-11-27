import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Brain,
  Grid,
  Hash,
  Heart,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  appendSimonStep,
  generateDigitSequence,
  generateGridPattern,
  getDigitDisplayMs,
  getGridConfigForLevel,
  getSimonPlaybackIntervalMs,
  MemoryMode,
  SIMON_PADS,
} from './memorySequence.logic';
import { playArcadeSound, playNoteTone } from './gamingAudio';

const BEST_MEM_KEY = 'omnidesk_memory_seq_best_v1';

type BestScores = Record<MemoryMode, number>;

function loadBests(): BestScores {
  try {
    const raw = localStorage.getItem(BEST_MEM_KEY);
    if (!raw) return { simon: 0, grid: 0, digits: 0 };
    const parsed = JSON.parse(raw) as Partial<BestScores>;
    return {
      simon: Math.max(0, Number(parsed.simon) || 0),
      grid: Math.max(0, Number(parsed.grid) || 0),
      digits: Math.max(0, Number(parsed.digits) || 0),
    };
  } catch {
    return { simon: 0, grid: 0, digits: 0 };
  }
}

export const MemorySequenceTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<MemoryMode>('simon');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bests, setBests] = useState<BestScores>(loadBests);

  // Mode 1: Simon Color Sequence
  const [simonPhase, setSimonPhase] = useState<'IDLE' | 'SHOWING' | 'INPUT' | 'GAME_OVER'>('IDLE');
  const [simonSeq, setSimonSeq] = useState<number[]>([]);
  const [simonInputIdx, setSimonInputIdx] = useState(0);
  const [activePad, setActivePad] = useState<number | null>(null);

  // Mode 2: Spatial Grid Matrix
  const [gridPhase, setGridPhase] = useState<'IDLE' | 'PREVIEW' | 'INPUT' | 'GAME_OVER'>('IDLE');
  const [gridLevel, setGridLevel] = useState(1);
  const [gridLives, setGridLives] = useState(3);
  const [gridPattern, setGridPattern] = useState<number[]>([]);
  const [gridSelected, setGridSelected] = useState<Set<number>>(() => new Set());
  const [gridWrong, setGridWrong] = useState<Set<number>>(() => new Set());

  // Mode 3: Digit Span
  const [digitPhase, setDigitPhase] = useState<'IDLE' | 'SHOWING' | 'INPUT' | 'GAME_OVER'>('IDLE');
  const [digitLevel, setDigitLevel] = useState(1);
  const [digitTarget, setDigitTarget] = useState('');
  const [digitAnswer, setDigitAnswer] = useState('');

  const timersRef = useRef<number[]>([]);
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  const clearAllTimers = useCallback(() => {
    for (const id of timersRef.current) window.clearTimeout(id);
    timersRef.current = [];
  }, []);

  useEffect(() => clearAllTimers, [clearAllTimers]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  const saveBest = useCallback((m: MemoryMode, score: number) => {
    setBests(prev => {
      if (score <= prev[m]) return prev;
      const next = { ...prev, [m]: score };
      try {
        localStorage.setItem(BEST_MEM_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // --- SIMON LOGIC ---
  const playSimonSequence = useCallback(
    (seq: number[]) => {
      clearAllTimers();
      setSimonPhase('SHOWING');
      setSimonInputIdx(0);
      const stepMs = getSimonPlaybackIntervalMs(seq.length);

      seq.forEach((padId, idx) => {
        schedule(() => {
          setActivePad(padId);
          playNoteTone(SIMON_PADS[padId].freqHz, 0.24, 'triangle', soundRef.current);
          schedule(() => setActivePad(null), Math.round(stepMs * 0.58));
        }, 380 + idx * stepMs);
      });

      schedule(() => {
        setActivePad(null);
        setSimonPhase('INPUT');
      }, 420 + seq.length * stepMs);
    },
    [clearAllTimers, schedule]
  );

  const startSimon = useCallback(() => {
    const first = appendSimonStep([]);
    setSimonSeq(first);
    playSimonSequence(first);
  }, [playSimonSequence]);

  const pressSimonPad = useCallback(
    (padId: number) => {
      if (simonPhase !== 'INPUT') return;
      setActivePad(padId);
      playNoteTone(SIMON_PADS[padId].freqHz, 0.18, 'triangle', soundRef.current);
      schedule(() => setActivePad(null), 160);

      if (simonSeq[simonInputIdx] !== padId) {
        playArcadeSound('gameover', soundRef.current);
        setSimonPhase('GAME_OVER');
        saveBest('simon', Math.max(0, simonSeq.length - 1));
        return;
      }

      const nextIdx = simonInputIdx + 1;
      if (nextIdx >= simonSeq.length) {
        saveBest('simon', simonSeq.length);
        const extended = appendSimonStep(simonSeq);
        setSimonSeq(extended);
        setSimonPhase('SHOWING');
        schedule(() => playSimonSequence(extended), 450);
      } else {
        setSimonInputIdx(nextIdx);
      }
    },
    [simonPhase, simonSeq, simonInputIdx, schedule, saveBest, playSimonSequence]
  );

  // Keyboard shortcuts for Simon (1-4 / Q,W,A,S)
  useEffect(() => {
    if (mode !== 'simon' || simonPhase !== 'INPUT') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === '1' || k === 'q') pressSimonPad(0);
      else if (k === '2' || k === 'w') pressSimonPad(1);
      else if (k === '3' || k === 'a') pressSimonPad(2);
      else if (k === '4' || k === 's') pressSimonPad(3);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, simonPhase, pressSimonPad]);

  // --- SPATIAL GRID LOGIC ---
  const launchGridLevel = useCallback(
    (level: number) => {
      clearAllTimers();
      const cfg = getGridConfigForLevel(level);
      const pattern = generateGridPattern(cfg.gridSize, cfg.tileCount);
      setGridLevel(level);
      setGridPattern(pattern);
      setGridSelected(new Set());
      setGridWrong(new Set());
      setGridPhase('PREVIEW');

      schedule(() => {
        setGridPhase('INPUT');
      }, cfg.previewMs);
    },
    [clearAllTimers, schedule]
  );

  const startGridGame = useCallback(() => {
    setGridLives(3);
    launchGridLevel(1);
  }, [launchGridLevel]);

  const handleGridCellClick = (idx: number) => {
    if (gridPhase !== 'INPUT') return;
    if (gridSelected.has(idx) || gridWrong.has(idx)) return;

    if (gridPattern.includes(idx)) {
      const nextSelected = new Set(gridSelected);
      nextSelected.add(idx);
      setGridSelected(nextSelected);
      playArcadeSound('hit', soundRef.current);

      if (nextSelected.size >= gridPattern.length) {
        saveBest('grid', gridLevel);
        playArcadeSound('bonus', soundRef.current);
        setGridPhase('PREVIEW');
        schedule(() => launchGridLevel(gridLevel + 1), 600);
      }
    } else {
      const nextWrong = new Set(gridWrong);
      nextWrong.add(idx);
      setGridWrong(nextWrong);
      playArcadeSound('miss', soundRef.current);

      const remLives = gridLives - 1;
      setGridLives(remLives);
      if (remLives <= 0) {
        playArcadeSound('gameover', soundRef.current);
        saveBest('grid', Math.max(0, gridLevel - 1));
        setGridPhase('GAME_OVER');
      }
    }
  };

  // --- DIGIT SPAN LOGIC ---
  const launchDigitLevel = useCallback(
    (level: number) => {
      clearAllTimers();
      const len = level + 2; // Level 1 = 3 digits
      const seq = generateDigitSequence(len);
      setDigitLevel(level);
      setDigitTarget(seq);
      setDigitAnswer('');
      setDigitPhase('SHOWING');

      schedule(() => {
        setDigitPhase('INPUT');
      }, getDigitDisplayMs(len));
    },
    [clearAllTimers, schedule]
  );

  const submitDigitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    if (digitPhase !== 'INPUT') return;
    const clean = digitAnswer.trim();
    if (clean === digitTarget) {
      playArcadeSound('bonus', soundRef.current);
      saveBest('digits', digitTarget.length);
      launchDigitLevel(digitLevel + 1);
    } else {
      playArcadeSound('gameover', soundRef.current);
      saveBest('digits', Math.max(0, digitTarget.length - 1));
      setDigitPhase('GAME_OVER');
    }
  };

  const gridCfg = getGridConfigForLevel(gridLevel);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t('tool_memory_sequence_title', 'Memory Sequence Trainer')}
          </h2>
          <p className="text-xs text-slate-400">
            {t(
              'mem_subtitle',
              'Train working memory with Musical Color Simon, Spatial Grid Pattern Matrix, and Escalating Digit Span recall.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
            {(
              [
                { id: 'simon' as MemoryMode, label: t('mem_mode_simon', 'Color Simon'), icon: <Sparkles className="w-3.5 h-3.5" /> },
                { id: 'grid' as MemoryMode, label: t('mem_mode_grid', 'Spatial Matrix'), icon: <Grid className="w-3.5 h-3.5" /> },
                { id: 'digits' as MemoryMode, label: t('mem_mode_digits', 'Digit Span'), icon: <Hash className="w-3.5 h-3.5" /> },
              ] as const
            ).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  clearAllTimers();
                  setMode(opt.id);
                  setSimonPhase('IDLE');
                  setGridPhase('IDLE');
                  setDigitPhase('IDLE');
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

      {/* MODE 1: COLOR SIMON */}
      {mode === 'simon' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 flex flex-col items-center">
            <div className="w-full max-w-[440px] p-5 rounded-2xl od-fixed-dark-stage border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">
                  {simonPhase === 'SHOWING'
                    ? t('mem_watch_seq', 'Watch the sequence...')
                    : simonPhase === 'INPUT'
                      ? t('mem_your_turn', 'Repeat the sequence ({cur}/{tot})', {
                          cur: simonInputIdx,
                          tot: simonSeq.length,
                        })
                      : simonPhase === 'GAME_OVER'
                        ? t('mem_wrong_pad', 'Wrong pad! Sequence reached {len}.', { len: simonSeq.length })
                        : t('mem_ready_start', 'Press Start to watch the musical pattern.')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3.5 aspect-square">
                {SIMON_PADS.map(pad => {
                  const lit = activePad === pad.id;
                  return (
                    <button
                      key={pad.id}
                      type="button"
                      disabled={simonPhase !== 'INPUT'}
                      onClick={() => pressSimonPad(pad.id)}
                      className={`rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-all duration-100 select-none ${
                        lit ? pad.activeClass : pad.idleClass
                      } ${simonPhase === 'INPUT' ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <span className="text-lg font-bold">{pad.label}</span>
                      <span className="text-[11px] font-mono opacity-80">{pad.keyHint}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">{t('tetris_level', 'Sequence')}</span>
                <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">
                  {simonSeq.length}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>{t('game_best', 'Best')}</span>
                </span>
                <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums">{bests.simon}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={startSimon}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              {simonPhase === 'GAME_OVER' ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>
                {simonPhase === 'GAME_OVER'
                  ? t('game_play_again', 'Play Again')
                  : t('game_start', 'Start Sequence')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* MODE 2: SPATIAL GRID MATRIX */}
      {mode === 'grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-8 flex flex-col items-center">
            <div className="w-full max-w-[440px] p-5 rounded-2xl od-fixed-dark-stage border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300">
                  {gridPhase === 'PREVIEW'
                    ? t('mem_grid_memorize', 'Memorize the lit tiles...')
                    : gridPhase === 'INPUT'
                      ? t('mem_grid_recall', 'Click the {rem} remaining tiles', {
                          rem: gridPattern.length - gridSelected.size,
                        })
                      : gridPhase === 'GAME_OVER'
                        ? t('game_over', 'Game Over')
                        : t('mem_grid_idle', 'Start to flash the spatial tile pattern.')}
                </span>
                <span className="inline-flex items-center gap-1 text-rose-400">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Heart
                      key={i}
                      className={`w-3.5 h-3.5 ${i < gridLives ? 'fill-rose-500 text-rose-500' : 'text-slate-700'}`}
                    />
                  ))}
                </span>
              </div>

              <div
                className="grid gap-2.5 aspect-square"
                style={{ gridTemplateColumns: `repeat(${gridCfg.gridSize}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: gridCfg.gridSize * gridCfg.gridSize }).map((_, idx) => {
                  const inPattern = gridPattern.includes(idx);
                  const showLit =
                    (gridPhase === 'PREVIEW' && inPattern) ||
                    gridSelected.has(idx) ||
                    (gridPhase === 'GAME_OVER' && inPattern);
                  const isErr = gridWrong.has(idx);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={gridPhase !== 'INPUT'}
                      onClick={() => handleGridCellClick(idx)}
                      className={`rounded-xl border transition-all duration-150 ${
                        isErr
                          ? 'bg-rose-600/80 border-rose-400'
                          : showLit
                            ? 'bg-indigo-500 border-indigo-300 shadow-[0_0_16px_rgba(99,102,241,0.5)]'
                            : 'bg-slate-800/70 border-slate-700 hover:bg-slate-700/80'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 block">{t('tetris_level', 'Level')}</span>
                <span className="text-2xl font-mono font-bold text-indigo-400 tabular-nums">{gridLevel}</span>
                <span className="text-[10px] font-mono text-slate-400 block">
                  {gridCfg.gridSize}×{gridCfg.gridSize} ({gridCfg.tileCount} tiles)
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" />
                  <span>{t('game_best', 'Best Level')}</span>
                </span>
                <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums">{bests.grid}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={startGridGame}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
            >
              {gridPhase === 'GAME_OVER' ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>
                {gridPhase === 'GAME_OVER'
                  ? t('game_play_again', 'Play Again')
                  : t('game_start', 'Start Matrix')}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* MODE 3: DIGIT SPAN */}
      {mode === 'digits' && (
        <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-5 text-center">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-400">
              {t('mem_digit_length', 'Digits')}: <strong className="text-white">{digitLevel + 2}</strong>
            </span>
            <span className="text-amber-400 inline-flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              <span>{t('game_best', 'Best')}: {bests.digits}</span>
            </span>
          </div>

          <div className="min-h-[180px] rounded-2xl od-fixed-dark-stage border border-slate-800 flex flex-col items-center justify-center p-6 space-y-4">
            {digitPhase === 'IDLE' && (
              <>
                <Brain className="w-10 h-10 text-indigo-400" />
                <p className="text-xs text-slate-300 max-w-sm">
                  {t('mem_digit_idle', 'Memorize the flashing number sequence, then type it back from memory. Each level adds one digit.')}
                </p>
                <button
                  type="button"
                  onClick={() => launchDigitLevel(1)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  <span>{t('game_start', 'Start Digit Span')}</span>
                </button>
              </>
            )}

            {digitPhase === 'SHOWING' && (
              <div className="space-y-2">
                <div className="text-xs font-mono text-indigo-300 uppercase tracking-wider">
                  {t('mem_memorize_now', 'Memorize')}
                </div>
                <div className="text-4xl sm:text-5xl font-mono font-extrabold tracking-[0.22em] text-white select-none">
                  {digitTarget}
                </div>
              </div>
            )}

            {digitPhase === 'INPUT' && (
              <form onSubmit={submitDigitAnswer} className="w-full max-w-sm space-y-3">
                <div className="text-xs text-slate-300">
                  {t('mem_type_digits', 'Enter the exact {n}-digit sequence:', { n: digitTarget.length })}
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={digitAnswer}
                  onChange={e => setDigitAnswer(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="012345..."
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-center text-2xl font-mono tracking-[0.2em] text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold"
                >
                  {t('mem_submit_answer', 'Submit Answer')}
                </button>
              </form>
            )}

            {digitPhase === 'GAME_OVER' && (
              <div className="space-y-3">
                <div className="text-xl font-bold text-rose-400">{t('mem_mismatch', 'Sequence Mismatch')}</div>
                <div className="text-xs font-mono space-y-1 text-slate-300">
                  <div>
                    {t('mem_expected', 'Expected')}: <span className="text-emerald-400 font-bold">{digitTarget}</span>
                  </div>
                  <div>
                    {t('mem_your_answer', 'You typed')}: <span className="text-rose-400 font-bold">{digitAnswer || '—'}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => launchDigitLevel(1)}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{t('game_play_again', 'Play Again')}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
