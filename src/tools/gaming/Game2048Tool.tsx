import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCcw,
  Trophy,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  createInitial2048State,
  Direction2048,
  Game2048State,
  getMax2048Tile,
  slide2048Board,
} from './game2048.logic';
import { playArcadeSound } from './gamingAudio';

const BEST_KEY = 'omnidesk_2048_best_v1';

type BoardSize = 4 | 5;
type BestMap = Record<string, number>;

function loadBests(): BestMap {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as BestMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getTileStyle(val: number): string {
  switch (val) {
    case 0:
      return 'bg-slate-800/50 text-transparent border-slate-800/70';
    case 2:
      return 'bg-slate-200 text-slate-900 border-slate-300';
    case 4:
      return 'bg-amber-100 text-slate-900 border-amber-200';
    case 8:
      return 'bg-orange-400 text-white border-orange-300';
    case 16:
      return 'bg-orange-500 text-white border-orange-400';
    case 32:
      return 'bg-rose-500 text-white border-rose-400';
    case 64:
      return 'bg-red-600 text-white border-red-400';
    case 128:
      return 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.35)]';
    case 256:
      return 'bg-amber-500 text-slate-950 border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.4)]';
    case 512:
      return 'bg-yellow-400 text-slate-950 border-yellow-200 shadow-[0_0_18px_rgba(250,204,21,0.45)]';
    case 1024:
      return 'bg-emerald-500 text-white border-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)]';
    case 2048:
      return 'bg-indigo-500 text-white border-indigo-300 shadow-[0_0_24px_rgba(99,102,241,0.65)]';
    default:
      return 'bg-fuchsia-600 text-white border-fuchsia-300 shadow-[0_0_26px_rgba(192,38,211,0.65)]';
  }
}

export const Game2048Tool: React.FC = () => {
  const { t } = useI18n();
  const [size, setSize] = useState<BoardSize>(4);
  const [state, setState] = useState<Game2048State>(() => createInitial2048State(4));
  const [history, setHistory] = useState<Game2048State[]>([]);
  const [keepPlayingAfterWin, setKeepPlayingAfterWin] = useState(false);
  const [bests, setBests] = useState<BestMap>(loadBests);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const saveBest = useCallback((boardSize: BoardSize, score: number) => {
    setBests(prev => {
      const key = String(boardSize);
      if (score <= (prev[key] || 0)) return prev;
      const next = { ...prev, [key]: score };
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(next));
      } catch {
        // ignore quota
      }
      return next;
    });
  }, []);

  const resetGame = useCallback((nextSize: BoardSize = size) => {
    setSize(nextSize);
    setState(createInitial2048State(nextSize));
    setHistory([]);
    setKeepPlayingAfterWin(false);
  }, [size]);

  const handleMove = useCallback(
    (dir: Direction2048) => {
      setState(prev => {
        if (prev.gameOver) return prev;
        if (prev.won && !keepPlayingAfterWin) return prev;
        const { next, moved, mergedAny } = slide2048Board(prev, dir);
        if (!moved) return prev;

        setHistory(h => [...h.slice(-9), prev]);
        saveBest(prev.size as BoardSize, next.score);

        if (next.gameOver) {
          playArcadeSound('gameover', soundEnabled);
        } else if (!prev.won && next.won) {
          playArcadeSound('tetris', soundEnabled);
        } else if (mergedAny) {
          playArcadeSound('eat', soundEnabled);
        } else {
          playArcadeSound('rotate', soundEnabled);
        }

        return next;
      });
    },
    [keepPlayingAfterWin, saveBest, soundEnabled]
  );

  const handleUndo = useCallback(() => {
    setHistory(prev => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setState(last);
      return prev.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowup' || k === 'w') {
        e.preventDefault();
        handleMove('UP');
      } else if (k === 'arrowdown' || k === 's') {
        e.preventDefault();
        handleMove('DOWN');
      } else if (k === 'arrowleft' || k === 'a') {
        e.preventDefault();
        handleMove('LEFT');
      } else if (k === 'arrowright' || k === 'd') {
        e.preventDefault();
        handleMove('RIGHT');
      } else if (k === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleMove, handleUndo]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const pt = e.touches[0];
    if (pt) touchStartRef.current = { x: pt.clientX, y: pt.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    const pt = e.changedTouches[0];
    if (!start || !pt) return;
    const dx = pt.clientX - start.x;
    const dy = pt.clientY - start.y;
    if (Math.hypot(dx, dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      handleMove(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStartRef.current = null;
  };

  const bestScore = Math.max(bests[String(size)] || 0, state.score);
  const maxTile = getMax2048Tile(state.board);
  const showWinOverlay = state.won && !keepPlayingAfterWin;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t('tool_game_2048_title', '2048 Arcade')}
          </h2>
          <p className="text-xs text-slate-400">
            {t(
              'g2048_subtitle',
              'Slide and merge matching numbered tiles to reach 2048 and beyond with 4×4 / 5×5 boards, undo history, and local high scores.'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
            {([4, 5] as BoardSize[]).map(sz => (
              <button
                key={sz}
                type="button"
                onClick={() => resetGame(sz)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors ${
                  size === sz ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {sz}×{sz}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Game Board */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative w-full max-w-[460px] aspect-square p-3 rounded-2xl od-fixed-dark-stage border border-slate-800 shadow-xl select-none touch-none"
          >
            <div
              className="grid gap-2.5 w-full h-full"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
            >
              {state.board.flatMap((row, r) =>
                row.map((val, c) => (
                  <div
                    key={`${r}-${c}`}
                    className={`rounded-xl border flex items-center justify-center font-mono font-extrabold tabular-nums transition-all duration-100 ${getTileStyle(
                      val
                    )} ${
                      val >= 1024
                        ? size === 5
                          ? 'text-base sm:text-lg'
                          : 'text-xl sm:text-2xl'
                        : val >= 128
                          ? size === 5
                            ? 'text-lg sm:text-xl'
                            : 'text-2xl sm:text-3xl'
                          : size === 5
                            ? 'text-xl sm:text-2xl'
                            : 'text-3xl sm:text-4xl'
                    }`}
                  >
                    {val > 0 ? val : ''}
                  </div>
                ))
              )}
            </div>

            {(showWinOverlay || state.gameOver) && (
              <div className="absolute inset-0 rounded-2xl bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-4">
                {showWinOverlay ? (
                  <>
                    <Trophy className="w-10 h-10 text-amber-400" />
                    <h3 className="text-2xl font-bold text-emerald-400">
                      {t('g2048_you_win', 'You Reached 2048!')}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setKeepPlayingAfterWin(true)}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                      >
                        {t('g2048_keep_going', 'Continue Endless')}
                      </button>
                      <button
                        type="button"
                        onClick={() => resetGame(size)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
                      >
                        {t('game_restart', 'Restart')}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold text-rose-400">{t('game_over', 'Game Over')}</h3>
                    <div className="text-sm font-mono text-slate-200">
                      {t('game_final_score', 'Score: {score}', { score: state.score })} · Max: {maxTile}
                    </div>
                    <button
                      type="button"
                      onClick={() => resetGame(size)}
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

          {/* Mobile / Mouse D-Pad */}
          <div className="mt-4 grid grid-cols-3 gap-2 w-40">
            <div />
            <button
              type="button"
              onClick={() => handleMove('UP')}
              className="h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 hover:border-indigo-500"
              aria-label="Up"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <div />
            <button
              type="button"
              onClick={() => handleMove('LEFT')}
              className="h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 hover:border-indigo-500"
              aria-label="Left"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleMove('DOWN')}
              className="h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 hover:border-indigo-500"
              aria-label="Down"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleMove('RIGHT')}
              className="h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 hover:border-indigo-500"
              aria-label="Right"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right HUD */}
        <div className="lg:col-span-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('game_score', 'Score')}</span>
              <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums">{state.score}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>{t('game_best', 'Best')}</span>
              </span>
              <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums">{bestScore}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('g2048_max_tile', 'Max Tile')}</span>
              <span className="text-xl font-mono font-bold text-indigo-400 tabular-nums">{maxTile}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('g2048_moves', 'Moves')}</span>
              <span className="text-xl font-mono font-bold text-white tabular-nums">{state.moves}</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>{t('g2048_undo', 'Undo')} ({history.length})</span>
              </button>
              <button
                type="button"
                onClick={() => resetGame(size)}
                className="flex-1 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('game_restart', 'New Game')}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>{t('g2048_ctrl_slide', 'Slide Tiles')}</span>
                <span className="font-mono text-slate-200">WASD / Arrows / Swipe</span>
              </div>
              <div className="flex justify-between">
                <span>{t('g2048_undo', 'Undo')}</span>
                <span className="font-mono text-slate-200">Ctrl + Z</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
