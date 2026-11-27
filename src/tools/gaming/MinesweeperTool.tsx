import React, { useState, useEffect, useCallback } from 'react';
import {
  Bomb,
  Clock,
  Flag,
  MousePointerClick,
  RotateCcw,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useI18n } from '../../i18n/context';
import {
  checkMinesweeperWin,
  chordRevealCell,
  countFlags,
  createEmptyMinesweeperBoard,
  MineCell,
  MINESWEEPER_DIFFICULTIES,
  MinesweeperDifficultyId,
  MinesweeperStatus,
  placeMinesSafely,
  revealMineCell,
  toggleFlagCell,
} from './minesweeper.logic';
import { playArcadeSound } from './gamingAudio';

const BEST_TIME_KEY = 'omnidesk_minesweeper_best_v1';

type BestTimes = Partial<Record<MinesweeperDifficultyId, number>>;

function loadBestTimes(): BestTimes {
  try {
    const raw = localStorage.getItem(BEST_TIME_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as BestTimes;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

const NUMBER_COLORS: Record<number, string> = {
  1: 'text-sky-400',
  2: 'text-emerald-400',
  3: 'text-rose-400',
  4: 'text-indigo-400',
  5: 'text-amber-400',
  6: 'text-cyan-400',
  7: 'text-fuchsia-400',
  8: 'text-slate-300',
};

export const MinesweeperTool: React.FC = () => {
  const { t } = useI18n();
  const [difficulty, setDifficulty] = useState<MinesweeperDifficultyId>('beginner');
  const [board, setBoard] = useState<MineCell[][]>(() =>
    createEmptyMinesweeperBoard(
      MINESWEEPER_DIFFICULTIES.beginner.rows,
      MINESWEEPER_DIFFICULTIES.beginner.cols
    )
  );
  const [status, setStatus] = useState<MinesweeperStatus>('ready');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [flagMode, setFlagMode] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bestTimes, setBestTimes] = useState<BestTimes>(loadBestTimes);

  const spec = MINESWEEPER_DIFFICULTIES[difficulty];

  const saveBestTime = useCallback((diff: MinesweeperDifficultyId, sec: number) => {
    setBestTimes(prev => {
      const current = prev[diff];
      if (current !== undefined && sec >= current) return prev;
      const next = { ...prev, [diff]: sec };
      try {
        localStorage.setItem(BEST_TIME_KEY, JSON.stringify(next));
      } catch {
        // ignore quota
      }
      return next;
    });
  }, []);

  const resetBoard = useCallback(
    (nextDiff: MinesweeperDifficultyId = difficulty) => {
      const d = MINESWEEPER_DIFFICULTIES[nextDiff];
      setDifficulty(nextDiff);
      setBoard(createEmptyMinesweeperBoard(d.rows, d.cols));
      setStatus('ready');
      setElapsedSec(0);
    },
    [difficulty]
  );

  // Elapsed timer
  useEffect(() => {
    if (status !== 'playing') return;
    const id = window.setInterval(() => {
      setElapsedSec(s => Math.min(999, s + 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const handleCellClick = (r: number, c: number) => {
    if (status === 'won' || status === 'lost') return;

    if (flagMode) {
      if (status === 'ready') return;
      setBoard(prev => toggleFlagCell(prev, r, c));
      playArcadeSound('rotate', soundEnabled);
      return;
    }

    let workingBoard = board;
    if (status === 'ready') {
      workingBoard = placeMinesSafely(board, spec.mines, r, c);
      setStatus('playing');
    }

    const target = workingBoard[r][c];
    const result = target.isRevealed
      ? chordRevealCell(workingBoard, r, c)
      : revealMineCell(workingBoard, r, c);

    setBoard(result.board);

    if (result.hitMine) {
      setStatus('lost');
      playArcadeSound('gameover', soundEnabled);
      return;
    }

    if (result.revealedCount > 0) {
      if (checkMinesweeperWin(result.board)) {
        setStatus('won');
        saveBestTime(difficulty, Math.max(1, elapsedSec));
        playArcadeSound('tetris', soundEnabled);
      } else {
        playArcadeSound('hit', soundEnabled);
      }
    }
  };

  const handleCellContextMenu = (e: React.MouseEvent, r: number, c: number) => {
    e.preventDefault();
    if (status === 'won' || status === 'lost' || status === 'ready') return;
    setBoard(prev => toggleFlagCell(prev, r, c));
    playArcadeSound('rotate', soundEnabled);
  };

  const flagsUsed = countFlags(board);
  const minesRemaining = spec.mines - flagsUsed;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-white">
            {t('tool_minesweeper_title', 'Minesweeper Classic')}
          </h2>
          <p className="text-xs text-slate-400">
            {t(
              'mine_subtitle',
              'Classic minefield deduction with guaranteed safe first click, flood-fill cascades, number chord-reveal, right-click flags, and local best times.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950 border border-slate-800">
            {(
              [
                { id: 'beginner' as MinesweeperDifficultyId, label: t('mine_diff_beginner', 'Beginner 9×9') },
                { id: 'intermediate' as MinesweeperDifficultyId, label: t('mine_diff_intermediate', 'Intermediate 16×16') },
                { id: 'expert' as MinesweeperDifficultyId, label: t('mine_diff_expert', 'Expert 30×16') },
              ] as const
            ).map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => resetBoard(opt.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  difficulty === opt.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
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
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* HUD Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Bomb className="w-3 h-3 text-rose-400" />
            <span>{t('mine_remaining', 'Mines Left')}</span>
          </span>
          <span className="text-2xl font-mono font-bold text-rose-400 tabular-nums">{minesRemaining}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>{t('aim_time_left', 'Time')}</span>
          </span>
          <span className="text-2xl font-mono font-bold text-white tabular-nums">{elapsedSec}s</span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span>{t('mine_best_time', 'Best Time')}</span>
          </span>
          <span className="text-2xl font-mono font-bold text-amber-400 tabular-nums">
            {bestTimes[difficulty] !== undefined ? `${bestTimes[difficulty]}s` : '—'}
          </span>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setFlagMode(prev => !prev)}
            className={`flex-1 py-2 px-2.5 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 border transition-colors ${
              flagMode
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {flagMode ? <Flag className="w-3.5 h-3.5" /> : <MousePointerClick className="w-3.5 h-3.5" />}
            <span>{flagMode ? t('mine_mode_flag', 'Flag Mode') : t('mine_mode_dig', 'Dig Mode')}</span>
          </button>
          <button
            type="button"
            onClick={() => resetBoard(difficulty)}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
            title={t('game_restart', 'Restart')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Banner */}
      {(status === 'won' || status === 'lost') && (
        <div
          className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
            status === 'won'
              ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="text-sm font-semibold">
            {status === 'won'
              ? t('mine_status_won', 'Field Cleared in {sec}s!', { sec: Math.max(1, elapsedSec) })
              : t('mine_status_lost', 'Boom! You hit a mine.')}
          </div>
          <button
            type="button"
            onClick={() => resetBoard(difficulty)}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t('game_play_again', 'Play Again')}</span>
          </button>
        </div>
      )}

      {/* Minefield Grid */}
      <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 overflow-x-auto flex justify-center">
        <div
          className="inline-grid gap-1 p-2.5 rounded-xl od-fixed-dark-stage border border-slate-800 select-none"
          style={{
            gridTemplateColumns: `repeat(${spec.cols}, ${difficulty === 'expert' ? '26px' : difficulty === 'intermediate' ? '28px' : '36px'})`,
          }}
        >
          {board.flatMap((row, r) =>
            row.map((cell, c) => {
              const sizeClass =
                difficulty === 'expert'
                  ? 'w-[26px] h-[26px] text-xs'
                  : difficulty === 'intermediate'
                    ? 'w-[28px] h-[28px] text-xs'
                    : 'w-[36px] h-[36px] text-sm';

              let cellClass = 'bg-slate-700 hover:bg-slate-600 border-slate-500/50 cursor-pointer';
              if (cell.isRevealed) {
                cellClass = cell.exploded
                  ? 'bg-rose-600 border-rose-400 text-white'
                  : cell.isMine
                    ? 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                    : 'bg-slate-900/90 border-slate-800/90';
              } else if (cell.isFlagged) {
                cellClass = 'bg-slate-800 border-amber-500/60 text-amber-400';
              }

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  onContextMenu={e => handleCellContextMenu(e, r, c)}
                  className={`${sizeClass} rounded-md border font-mono font-bold flex items-center justify-center transition-colors ${cellClass}`}
                >
                  {cell.isRevealed ? (
                    cell.isMine ? (
                      <Bomb className="w-3.5 h-3.5" />
                    ) : cell.adjacentMines > 0 ? (
                      <span className={NUMBER_COLORS[cell.adjacentMines] ?? 'text-white'}>
                        {cell.adjacentMines}
                      </span>
                    ) : null
                  ) : cell.isFlagged ? (
                    <Flag className="w-3.5 h-3.5 text-amber-400" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="text-xs text-slate-400 text-center">
        {t(
          'mine_controls_hint',
          'Left-click to reveal · Right-click (or Flag Mode) to place flags · Click a revealed number when matching flags surround it to chord-reveal neighbors.'
        )}
      </div>
    </div>
  );
};
