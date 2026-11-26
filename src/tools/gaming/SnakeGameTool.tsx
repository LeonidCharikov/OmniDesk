import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Pause,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  createInitialSnakeState,
  getSnakeTickMs,
  isOppositeDirection,
  SnakeDirection,
  SnakeMode,
  SnakeState,
  stepSnakeState,
} from './snake.logic';
import { playArcadeSound } from './gamingAudio';

const BEST_STORAGE_KEY = 'omnidesk_snake_best_v1';
const GRID_SIZE = 20;
const CANVAS_PX = 480;

type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

type BestScores = Record<SnakeMode, number>;

function loadBestScores(): BestScores {
  try {
    const raw = localStorage.getItem(BEST_STORAGE_KEY);
    if (!raw) return { classic: 0, wrap: 0, turbo: 0 };
    const parsed = JSON.parse(raw) as Partial<BestScores>;
    return {
      classic: Math.max(0, Number(parsed.classic) || 0),
      wrap: Math.max(0, Number(parsed.wrap) || 0),
      turbo: Math.max(0, Number(parsed.turbo) || 0),
    };
  } catch {
    return { classic: 0, wrap: 0, turbo: 0 };
  }
}

export const SnakeGameTool: React.FC = () => {
  const { t } = useI18n();
  const [mode, setMode] = useState<SnakeMode>('classic');
  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bestScores, setBestScores] = useState<BestScores>(loadBestScores);
  const [hud, setHud] = useState({ score: 0, length: 3, foods: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<SnakeState>(createInitialSnakeState('classic', GRID_SIZE));
  const dirQueueRef = useRef<SnakeDirection[]>([]);
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const saveBestIfNeeded = useCallback((m: SnakeMode, score: number) => {
    setBestScores(prev => {
      if (score <= prev[m]) return prev;
      const next = { ...prev, [m]: score };
      try {
        localStorage.setItem(BEST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota
      }
      return next;
    });
  }, []);

  const drawBoard = useCallback((st: SnakeState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cell = CANVAS_PX / st.gridSize;

    // Background & subtle checkerboard
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX);
    for (let y = 0; y < st.gridSize; y++) {
      for (let x = 0; x < st.gridSize; x++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = 'rgba(30, 41, 59, 0.35)';
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }

    // Regular food
    const fx = (st.food.x + 0.5) * cell;
    const fy = (st.food.y + 0.5) * cell;
    ctx.save();
    ctx.shadowColor = 'rgba(244, 63, 94, 0.7)';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(fx, fy, cell * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fda4af';
    ctx.beginPath();
    ctx.arc(fx - cell * 0.1, fy - cell * 0.1, cell * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bonus golden apple
    if (st.bonusFood) {
      const bx = (st.bonusFood.x + 0.5) * cell;
      const by = (st.bonusFood.y + 0.5) * cell;
      ctx.save();
      ctx.shadowColor = 'rgba(250, 204, 21, 0.8)';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(bx, by, cell * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Snake body (tail to head)
    for (let i = st.snake.length - 1; i >= 0; i--) {
      const seg = st.snake[i];
      const isHead = i === 0;
      const pad = isHead ? 1.5 : 2.5;
      const ratio = 1 - i / Math.max(st.snake.length, 1);
      ctx.fillStyle = isHead
        ? '#34d399'
        : `rgb(${Math.round(16 + ratio * 24)}, ${Math.round(140 + ratio * 65)}, ${Math.round(95 + ratio * 35)})`;

      const rx = seg.x * cell + pad;
      const ry = seg.y * cell + pad;
      const rw = cell - pad * 2;
      const rh = cell - pad * 2;
      const rad = isHead ? 6 : 4;

      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, rad);
      ctx.fill();

      if (isHead) {
        ctx.fillStyle = '#064e3b';
        const eyeSize = 2.6;
        let e1x = rx + rw * 0.68;
        let e1y = ry + rh * 0.28;
        let e2x = rx + rw * 0.68;
        let e2y = ry + rh * 0.72;
        if (st.direction === 'LEFT') {
          e1x = rx + rw * 0.32;
          e2x = rx + rw * 0.32;
        } else if (st.direction === 'UP') {
          e1x = rx + rw * 0.28;
          e1y = ry + rh * 0.32;
          e2x = rx + rw * 0.72;
          e2y = ry + rh * 0.32;
        } else if (st.direction === 'DOWN') {
          e1x = rx + rw * 0.28;
          e1y = ry + rh * 0.68;
          e2x = rx + rw * 0.72;
          e2y = ry + rh * 0.68;
        }
        ctx.beginPath();
        ctx.arc(e1x, e1y, eyeSize, 0, Math.PI * 2);
        ctx.arc(e2x, e2y, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  const startGame = useCallback(
    (selectedMode: SnakeMode = mode) => {
      const initial = createInitialSnakeState(selectedMode, GRID_SIZE);
      stateRef.current = initial;
      dirQueueRef.current = [];
      setHud({ score: 0, length: initial.snake.length, foods: 0 });
      setPhase('PLAYING');
      drawBoard(initial);
    },
    [mode, drawBoard]
  );

  const enqueueDirection = useCallback((dir: SnakeDirection) => {
    const queue = dirQueueRef.current;
    const lastPlanned = queue.length > 0 ? queue[queue.length - 1] : stateRef.current.direction;
    if (dir === lastPlanned || isOppositeDirection(lastPlanned, dir)) return;
    if (queue.length < 2) {
      queue.push(dir);
    }
  }, []);

  // Initial draw
  useEffect(() => {
    drawBoard(stateRef.current);
  }, [drawBoard]);

  // Game loop
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    let rafId = 0;
    let lastTime = performance.now();
    let acc = 0;

    const frame = (now: number) => {
      const dt = Math.min(250, now - lastTime);
      lastTime = now;
      acc += dt;

      const tickMs = getSnakeTickMs(stateRef.current.mode, stateRef.current.foodsEaten);
      if (acc >= tickMs) {
        acc -= tickMs;
        const nextDir = dirQueueRef.current.shift();
        const { next, ateFood, ateBonus } = stepSnakeState(stateRef.current, nextDir);
        stateRef.current = next;
        drawBoard(next);

        if (ateBonus) {
          playArcadeSound('bonus', soundRef.current);
        } else if (ateFood) {
          playArcadeSound('eat', soundRef.current);
        }

        if (ateFood || ateBonus || next.gameOver) {
          setHud({ score: next.score, length: next.snake.length, foods: next.foodsEaten });
        }

        if (next.gameOver) {
          playArcadeSound('gameover', soundRef.current);
          saveBestIfNeeded(next.mode, next.score);
          setPhase('GAME_OVER');
          return;
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [phase, drawBoard, saveBestIfNeeded]);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') {
        e.preventDefault();
        if (phase === 'PLAYING') enqueueDirection('UP');
      } else if (key === 'arrowdown' || key === 's') {
        e.preventDefault();
        if (phase === 'PLAYING') enqueueDirection('DOWN');
      } else if (key === 'arrowleft' || key === 'a') {
        e.preventDefault();
        if (phase === 'PLAYING') enqueueDirection('LEFT');
      } else if (key === 'arrowright' || key === 'd') {
        e.preventDefault();
        if (phase === 'PLAYING') enqueueDirection('RIGHT');
      } else if (key === ' ' || key === 'p') {
        e.preventDefault();
        if (phase === 'PLAYING') setPhase('PAUSED');
        else if (phase === 'PAUSED') setPhase('PLAYING');
        else if (phase === 'TITLE_MENU' || phase === 'GAME_OVER') startGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, enqueueDirection, startGame]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    const touch = e.changedTouches[0];
    if (!start || !touch || phase !== 'PLAYING') return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.hypot(dx, dy) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      enqueueDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      enqueueDirection(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStartRef.current = null;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t('tool_snake_game_title', 'Snake Arcade')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('snake_subtitle', 'Classic grid arcade with Portal Walls, Turbo speed escalation, golden bonus apples, and local best scores.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
            {(
              [
                { id: 'classic' as SnakeMode, label: t('snake_mode_classic', 'Classic') },
                { id: 'wrap' as SnakeMode, label: t('snake_mode_wrap', 'Portal Walls') },
                { id: 'turbo' as SnakeMode, label: t('snake_mode_turbo', 'Turbo') },
              ] as const
            ).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setMode(opt.id);
                  if (phase === 'PLAYING' || phase === 'PAUSED') {
                    startGame(opt.id);
                  } else {
                    const fresh = createInitialSnakeState(opt.id, GRID_SIZE);
                    stateRef.current = fresh;
                    setHud({ score: 0, length: 3, foods: 0 });
                    drawBoard(fresh);
                  }
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  mode === opt.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSoundEnabled(prev => !prev)}
            aria-label={soundEnabled ? t('game_mute', 'Mute sound') : t('game_unmute', 'Enable sound')}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Main Arena + HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Arena */}
        <div className="lg:col-span-8 flex flex-col items-center">
          <div
            className="relative w-full max-w-[480px] aspect-square rounded-2xl overflow-hidden border border-slate-800 shadow-xl od-fixed-dark-stage touch-none"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_PX}
              height={CANVAS_PX}
              className="w-full h-full block"
            />

            {phase !== 'PLAYING' && (
              <div className="absolute inset-0 bg-slate-950/78 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-4">
                {phase === 'TITLE_MENU' && (
                  <>
                    <h3 className="text-2xl font-bold text-white">
                      {t('tool_snake_game_title', 'Snake Arcade')}
                    </h3>
                    <p className="text-xs text-slate-300 max-w-xs leading-relaxed">
                      {t('snake_controls_hint', 'Use Arrow keys or WASD to steer. Collect golden apples every 5 foods for +35 bonus points.')}
                    </p>
                    <button
                      type="button"
                      onClick={() => startGame()}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      <span>{t('game_start', 'Start Game')}</span>
                    </button>
                  </>
                )}

                {phase === 'PAUSED' && (
                  <>
                    <h3 className="text-xl font-bold text-white">{t('game_paused', 'Paused')}</h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPhase('PLAYING')}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{t('game_resume', 'Resume')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => startGame()}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>{t('game_restart', 'Restart')}</span>
                      </button>
                    </div>
                  </>
                )}

                {phase === 'GAME_OVER' && (
                  <>
                    <h3 className="text-2xl font-bold text-rose-400">{t('game_over', 'Game Over')}</h3>
                    <div className="text-sm font-mono tabular-nums text-slate-200">
                      {t('game_final_score', 'Score: {score}', { score: hud.score })} ·{' '}
                      {t('game_best_short', 'Best: {best}', { best: Math.max(bestScores[mode], hud.score) })}
                    </div>
                    <button
                      type="button"
                      onClick={() => startGame()}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{t('game_play_again', 'Play Again')}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Touch D-Pad for mobile / mouse */}
          <div className="mt-4 grid grid-cols-3 gap-2 w-40 sm:hidden">
            <div />
            <button
              type="button"
              onClick={() => enqueueDirection('UP')}
              className="h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 active:bg-indigo-600"
              aria-label="Up"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
            <div />
            <button
              type="button"
              onClick={() => enqueueDirection('LEFT')}
              className="h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 active:bg-indigo-600"
              aria-label="Left"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => enqueueDirection('DOWN')}
              className="h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 active:bg-indigo-600"
              aria-label="Down"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => enqueueDirection('RIGHT')}
              className="h-11 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 active:bg-indigo-600"
              aria-label="Right"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Right HUD & Controls */}
        <div className="lg:col-span-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('game_score', 'Score')}</span>
              <span className="text-2xl font-mono font-bold text-emerald-400 tabular-nums mt-0.5 block">
                {hud.score}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>{t('game_best', 'Best')}</span>
              </span>
              <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums mt-0.5 block">
                {Math.max(bestScores[mode], hud.score)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('snake_length', 'Length')}</span>
              <span className="text-lg font-mono font-semibold text-white tabular-nums mt-0.5 block">
                {hud.length}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('snake_speed', 'Tick Speed')}</span>
              <span className="text-lg font-mono font-semibold text-indigo-400 tabular-nums mt-0.5 block">
                {Math.round(getSnakeTickMs(mode, hud.foods))} ms
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
            <div className="flex gap-2">
              {phase === 'PLAYING' ? (
                <button
                  type="button"
                  onClick={() => setPhase('PAUSED')}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>{t('game_pause', 'Pause')}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => (phase === 'PAUSED' ? setPhase('PLAYING') : startGame())}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{phase === 'PAUSED' ? t('game_resume', 'Resume') : t('game_start', 'Start Game')}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => startGame()}
                className="py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-medium inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('game_restart', 'Restart')}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>{t('snake_key_move', 'Steer')}</span>
                <span className="font-mono text-slate-200">WASD / Arrows</span>
              </div>
              <div className="flex justify-between">
                <span>{t('game_pause', 'Pause')}</span>
                <span className="font-mono text-slate-200">Space / P</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
