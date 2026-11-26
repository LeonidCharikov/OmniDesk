import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Pause,
  Play,
  Repeat2,
  RotateCcw,
  RotateCw,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  createInitialTetrisState,
  getGhostY,
  getTetrisDropIntervalMs,
  hardDropActivePiece,
  holdActivePiece,
  lockActivePiece,
  moveActivePiece,
  rotateActivePiece,
  TETRIS_COLS,
  TETRIS_ROWS,
  TetrisState,
  TETROMINO_COLORS,
  TETROMINO_SHAPES,
  TetrominoType,
} from './tetris.logic';
import { playArcadeSound } from './gamingAudio';

const BEST_STORAGE_KEY = 'omnidesk_tetris_best_v1';
const CELL_PX = 28;
const BOARD_W = TETRIS_COLS * CELL_PX;
const BOARD_H = TETRIS_ROWS * CELL_PX;

type GamePhase = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

interface TetrisBest {
  score: number;
  lines: number;
}

function loadBest(): TetrisBest {
  try {
    const raw = localStorage.getItem(BEST_STORAGE_KEY);
    if (!raw) return { score: 0, lines: 0 };
    const parsed = JSON.parse(raw) as Partial<TetrisBest>;
    return {
      score: Math.max(0, Number(parsed.score) || 0),
      lines: Math.max(0, Number(parsed.lines) || 0),
    };
  } catch {
    return { score: 0, lines: 0 };
  }
}

const MiniPiecePreview: React.FC<{ type: TetrominoType | null; dimmed?: boolean }> = ({
  type,
  dimmed = false,
}) => {
  if (!type) {
    return <div className="h-12 flex items-center justify-center text-[11px] text-slate-600">—</div>;
  }
  const shape = TETROMINO_SHAPES[type];
  const color = TETROMINO_COLORS[type];
  return (
    <div
      className={`h-12 flex items-center justify-center ${dimmed ? 'opacity-40' : ''}`}
      aria-label={type}
    >
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${shape[0].length}, 12px)` }}
      >
        {shape.flatMap((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className="w-3 h-3 rounded-[2px]"
              style={{
                backgroundColor: cell ? color : 'transparent',
                boxShadow: cell ? 'inset 0 1px 0 rgba(255,255,255,0.35)' : undefined,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
};

export const TetrisGameTool: React.FC = () => {
  const { t } = useI18n();
  const [phase, setPhase] = useState<GamePhase>('TITLE_MENU');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [best, setBest] = useState<TetrisBest>(loadBest);
  const [snapshot, setSnapshot] = useState<TetrisState>(() => createInitialTetrisState());

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<TetrisState>(snapshot);
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  const saveBestIfNeeded = useCallback((score: number, lines: number) => {
    setBest(prev => {
      const next: TetrisBest = {
        score: Math.max(prev.score, score),
        lines: Math.max(prev.lines, lines),
      };
      if (next.score === prev.score && next.lines === prev.lines) return prev;
      try {
        localStorage.setItem(BEST_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota
      }
      return next;
    });
  }, []);

  const drawCanvas = useCallback((st: TetrisState) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#090f1d';
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    for (let c = 1; c < TETRIS_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * CELL_PX + 0.5, 0);
      ctx.lineTo(c * CELL_PX + 0.5, BOARD_H);
      ctx.stroke();
    }
    for (let r = 1; r < TETRIS_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * CELL_PX + 0.5);
      ctx.lineTo(BOARD_W, r * CELL_PX + 0.5);
      ctx.stroke();
    }

    const drawBlock = (x: number, y: number, color: string, alpha = 1) => {
      if (y < 0) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      const px = x * CELL_PX + 1.5;
      const py = y * CELL_PX + 1.5;
      const s = CELL_PX - 3;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(px, py, s, s, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(px + 2, py + 2, s - 4, 3);
      ctx.restore();
    };

    // Settled blocks
    for (let r = 0; r < TETRIS_ROWS; r++) {
      for (let c = 0; c < TETRIS_COLS; c++) {
        const cell = st.board[r][c];
        if (cell) drawBlock(c, r, TETROMINO_COLORS[cell], 1);
      }
    }

    // Ghost landing piece
    if (!st.gameOver) {
      const ghostY = getGhostY(st.board, st.active);
      const color = TETROMINO_COLORS[st.active.type];
      for (let r = 0; r < st.active.matrix.length; r++) {
        for (let c = 0; c < st.active.matrix[r].length; c++) {
          if (!st.active.matrix[r][c]) continue;
          const gx = st.active.x + c;
          const gy = ghostY + r;
          if (gy >= 0) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.globalAlpha = 0.4;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(gx * CELL_PX + 3, gy * CELL_PX + 3, CELL_PX - 6, CELL_PX - 6);
            ctx.restore();
          }
        }
      }

      // Active falling piece
      for (let r = 0; r < st.active.matrix.length; r++) {
        for (let c = 0; c < st.active.matrix[r].length; c++) {
          if (!st.active.matrix[r][c]) continue;
          drawBlock(st.active.x + c, st.active.y + r, color, 1);
        }
      }
    }
  }, []);

  const commitState = useCallback(
    (next: TetrisState) => {
      stateRef.current = next;
      setSnapshot(next);
      drawCanvas(next);
      if (next.gameOver) {
        playArcadeSound('gameover', soundRef.current);
        saveBestIfNeeded(next.score, next.lines);
        setPhase('GAME_OVER');
      }
    },
    [drawCanvas, saveBestIfNeeded]
  );

  const startGame = useCallback(() => {
    const fresh = createInitialTetrisState();
    stateRef.current = fresh;
    setSnapshot(fresh);
    setPhase('PLAYING');
    drawCanvas(fresh);
  }, [drawCanvas]);

  const actMove = useCallback(
    (dx: number, dy: number) => {
      if (phase !== 'PLAYING') return;
      const moved = moveActivePiece(stateRef.current, dx, dy);
      if (moved) {
        commitState(moved);
      } else if (dy > 0) {
        const { next, clearedLines } = lockActivePiece(stateRef.current);
        if (clearedLines === 4) playArcadeSound('tetris', soundRef.current);
        else if (clearedLines > 0) playArcadeSound('clear', soundRef.current);
        else playArcadeSound('drop', soundRef.current);
        commitState(next);
      }
    },
    [phase, commitState]
  );

  const actRotate = useCallback(
    (clockwise = true) => {
      if (phase !== 'PLAYING') return;
      const rotated = rotateActivePiece(stateRef.current, clockwise);
      if (rotated) {
        playArcadeSound('rotate', soundRef.current);
        commitState(rotated);
      }
    },
    [phase, commitState]
  );

  const actHardDrop = useCallback(() => {
    if (phase !== 'PLAYING') return;
    const { next, clearedLines } = hardDropActivePiece(stateRef.current);
    if (clearedLines === 4) playArcadeSound('tetris', soundRef.current);
    else if (clearedLines > 0) playArcadeSound('clear', soundRef.current);
    else playArcadeSound('drop', soundRef.current);
    commitState(next);
  }, [phase, commitState]);

  const actHold = useCallback(() => {
    if (phase !== 'PLAYING') return;
    const held = holdActivePiece(stateRef.current);
    if (held) {
      playArcadeSound('rotate', soundRef.current);
      commitState(held);
    }
  }, [phase, commitState]);

  useEffect(() => {
    drawCanvas(stateRef.current);
  }, [drawCanvas]);

  // Gravity loop
  useEffect(() => {
    if (phase !== 'PLAYING') return;
    let rafId = 0;
    let last = performance.now();
    let acc = 0;

    const loop = (now: number) => {
      const dt = Math.min(250, now - last);
      last = now;
      acc += dt;
      const interval = getTetrisDropIntervalMs(stateRef.current.level);
      if (acc >= interval) {
        acc -= interval;
        const moved = moveActivePiece(stateRef.current, 0, 1);
        if (moved) {
          // Gravity drop shouldn't award manual soft-drop points
          const fixed = { ...moved, score: stateRef.current.score };
          commitState(fixed);
        } else {
          const { next, clearedLines } = lockActivePiece(stateRef.current);
          if (clearedLines === 4) playArcadeSound('tetris', soundRef.current);
          else if (clearedLines > 0) playArcadeSound('clear', soundRef.current);
          commitState(next);
        }
      }
      if (!stateRef.current.gameOver) {
        rafId = requestAnimationFrame(loop);
      }
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [phase, commitState]);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') {
        e.preventDefault();
        actMove(-1, 0);
      } else if (k === 'arrowright' || k === 'd') {
        e.preventDefault();
        actMove(1, 0);
      } else if (k === 'arrowdown' || k === 's') {
        e.preventDefault();
        actMove(0, 1);
      } else if (k === 'arrowup' || k === 'w' || k === 'x') {
        e.preventDefault();
        actRotate(true);
      } else if (k === 'z') {
        e.preventDefault();
        actRotate(false);
      } else if (k === ' ') {
        e.preventDefault();
        if (phase === 'PLAYING') actHardDrop();
        else if (phase === 'TITLE_MENU' || phase === 'GAME_OVER') startGame();
      } else if (k === 'c' || k === 'shift') {
        e.preventDefault();
        actHold();
      } else if (k === 'p') {
        e.preventDefault();
        if (phase === 'PLAYING') setPhase('PAUSED');
        else if (phase === 'PAUSED') setPhase('PLAYING');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase, actMove, actRotate, actHardDrop, actHold, startGame]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t('tool_tetris_game_title', 'Tetris Classic')}
          </h2>
          <p className="text-xs text-slate-400">
            {t('tetris_subtitle', 'Modern guideline falling blocks with 7-bag randomizer, SRS wall kicks, ghost shadow, Hold slot, and combo scoring.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {phase === 'PLAYING' ? (
            <button
              type="button"
              onClick={() => setPhase('PAUSED')}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>{t('game_pause', 'Pause')}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => (phase === 'PAUSED' ? setPhase('PLAYING') : startGame())}
              className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{phase === 'PAUSED' ? t('game_resume', 'Resume') : t('game_start', 'Start Game')}</span>
            </button>
          )}
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

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Hold + Stats */}
        <div className="lg:col-span-3 space-y-3 order-2 lg:order-1">
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">
                {t('tetris_hold', 'Hold (C)')}
              </span>
              <button
                type="button"
                onClick={actHold}
                disabled={phase !== 'PLAYING' || !snapshot.canHold}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 disabled:opacity-40"
              >
                <Repeat2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="rounded-lg od-fixed-dark-stage border border-slate-800/80 py-1">
              <MiniPiecePreview type={snapshot.hold} dimmed={!snapshot.canHold} />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">{t('game_score', 'Score')}</span>
              <span className="text-2xl font-mono font-bold text-indigo-400 tabular-nums mt-0.5 block">
                {snapshot.score.toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>{t('game_best', 'Best')}</span>
              </span>
              <span className="text-xl font-mono font-bold text-amber-400 tabular-nums mt-0.5 block">
                {Math.max(best.score, snapshot.score).toLocaleString()}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-slate-400 block">{t('tetris_level', 'Level')}</span>
                <span className="text-lg font-mono font-bold text-white tabular-nums">{snapshot.level}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">{t('tetris_lines', 'Lines')}</span>
                <span className="text-lg font-mono font-bold text-emerald-400 tabular-nums">{snapshot.lines}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Playfield */}
        <div className="lg:col-span-5 flex flex-col items-center order-1 lg:order-2">
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-xl od-fixed-dark-stage">
            <canvas
              ref={canvasRef}
              width={BOARD_W}
              height={BOARD_H}
              className="block max-w-full h-auto"
              style={{ width: BOARD_W, height: BOARD_H }}
            />

            {phase !== 'PLAYING' && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center space-y-4">
                {phase === 'TITLE_MENU' && (
                  <>
                    <h3 className="text-2xl font-bold text-white">
                      {t('tool_tetris_game_title', 'Tetris Classic')}
                    </h3>
                    <p className="text-xs text-slate-300 max-w-[210px] leading-relaxed">
                      {t('tetris_start_hint', 'Clear horizontal lines to score and level up. Press Space for instant Hard Drop.')}
                    </p>
                    <button
                      type="button"
                      onClick={startGame}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>{t('game_start', 'Start Game')}</span>
                    </button>
                  </>
                )}

                {phase === 'PAUSED' && (
                  <>
                    <h3 className="text-xl font-bold text-white">{t('game_paused', 'Paused')}</h3>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPhase('PLAYING')}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                      >
                        {t('game_resume', 'Resume')}
                      </button>
                      <button
                        type="button"
                        onClick={startGame}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold"
                      >
                        {t('game_restart', 'Restart')}
                      </button>
                    </div>
                  </>
                )}

                {phase === 'GAME_OVER' && (
                  <>
                    <h3 className="text-2xl font-bold text-rose-400">{t('game_over', 'Game Over')}</h3>
                    <div className="text-xs font-mono text-slate-200 tabular-nums space-y-1">
                      <div>{t('game_final_score', 'Score: {score}', { score: snapshot.score.toLocaleString() })}</div>
                      <div>
                        {t('tetris_lines', 'Lines')}: {snapshot.lines} · {t('tetris_level', 'Level')}: {snapshot.level}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={startGame}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>{t('game_play_again', 'Play Again')}</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile / Click Controls */}
          <div className="mt-4 flex items-center gap-2 flex-wrap justify-center">
            <button
              type="button"
              onClick={() => actMove(-1, 0)}
              className="w-11 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 hover:border-indigo-500/50"
              aria-label="Left"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => actMove(0, 1)}
              className="w-11 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 hover:border-indigo-500/50"
              aria-label="Soft Drop"
            >
              <ArrowDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => actMove(1, 0)}
              className="w-11 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 hover:border-indigo-500/50"
              aria-label="Right"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => actRotate(true)}
              className="w-11 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-200 hover:border-indigo-500/50"
              aria-label="Rotate"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={actHardDrop}
              className="px-3 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/50 text-indigo-200 text-xs font-semibold inline-flex items-center gap-1"
            >
              <ChevronDown className="w-4 h-4" />
              <span>{t('tetris_hard_drop', 'Drop')}</span>
            </button>
          </div>
        </div>

        {/* Right: Next Queue + Controls Legend */}
        <div className="lg:col-span-4 space-y-3 order-3">
          <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
            <span className="text-[11px] font-medium text-slate-400 block">
              {t('tetris_next_queue', 'Next Pieces')}
            </span>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-2">
              {snapshot.queue.slice(0, 3).map((piece, idx) => (
                <div
                  key={`${piece}-${idx}`}
                  className="rounded-lg od-fixed-dark-stage border border-slate-800/80 py-1"
                >
                  <MiniPiecePreview type={piece} />
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-1.5 text-xs text-slate-400">
            <div className="font-semibold text-slate-200 mb-1">
              {t('tetris_controls_title', 'Controls')}
            </div>
            <div className="flex justify-between">
              <span>{t('tetris_ctrl_move', 'Move')}</span>
              <span className="font-mono text-slate-200">← → / A D</span>
            </div>
            <div className="flex justify-between">
              <span>{t('tetris_ctrl_rotate', 'Rotate CW / CCW')}</span>
              <span className="font-mono text-slate-200">↑ W X / Z</span>
            </div>
            <div className="flex justify-between">
              <span>{t('tetris_ctrl_soft_drop', 'Soft Drop')}</span>
              <span className="font-mono text-slate-200">↓ / S</span>
            </div>
            <div className="flex justify-between">
              <span>{t('tetris_hard_drop', 'Hard Drop')}</span>
              <span className="font-mono text-slate-200">Space</span>
            </div>
            <div className="flex justify-between">
              <span>{t('tetris_hold', 'Hold')}</span>
              <span className="font-mono text-slate-200">C / Shift</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
