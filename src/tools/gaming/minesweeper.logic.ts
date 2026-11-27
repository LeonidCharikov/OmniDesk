// Pure logic for Minesweeper Classic

export type MinesweeperDifficultyId = 'beginner' | 'intermediate' | 'expert';

export interface MinesweeperDifficulty {
  id: MinesweeperDifficultyId;
  rows: number;
  cols: number;
  mines: number;
}

export const MINESWEEPER_DIFFICULTIES: Record<MinesweeperDifficultyId, MinesweeperDifficulty> = {
  beginner: { id: 'beginner', rows: 9, cols: 9, mines: 10 },
  intermediate: { id: 'intermediate', rows: 16, cols: 16, mines: 40 },
  expert: { id: 'expert', rows: 16, cols: 30, mines: 99 },
};

export interface MineCell {
  row: number;
  col: number;
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  adjacentMines: number;
  exploded?: boolean;
}

export type MinesweeperStatus = 'ready' | 'playing' | 'won' | 'lost';

export function createEmptyMinesweeperBoard(rows: number, cols: number): MineCell[][] {
  return Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => ({
      row,
      col,
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  );
}

export function cloneMinesweeperBoard(board: MineCell[][]): MineCell[][] {
  return board.map(row => row.map(cell => ({ ...cell })));
}

function getNeighbors(rows: number, cols: number, r: number, c: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        out.push([nr, nc]);
      }
    }
  }
  return out;
}

export function placeMinesSafely(
  board: MineCell[][],
  mineCount: number,
  safeRow: number,
  safeCol: number,
  rng: () => number = Math.random
): MineCell[][] {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const next = cloneMinesweeperBoard(board);

  const candidates: Array<[number, number]> = [];
  const fallback: Array<[number, number]> = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const inSafeZone = Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1;
      if (!inSafeZone) {
        candidates.push([r, c]);
      } else if (!(r === safeRow && c === safeCol)) {
        fallback.push([r, c]);
      }
    }
  }

  const shuffle = (arr: Array<[number, number]>) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1)) % (i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };

  shuffle(candidates);
  shuffle(fallback);
  const pool = [...candidates, ...fallback];
  const clampedMines = Math.min(mineCount, pool.length);

  for (let i = 0; i < clampedMines; i++) {
    const [r, c] = pool[i];
    next[r][c].isMine = true;
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (next[r][c].isMine) continue;
      let count = 0;
      for (const [nr, nc] of getNeighbors(rows, cols, r, c)) {
        if (next[nr][nc].isMine) count++;
      }
      next[r][c].adjacentMines = count;
    }
  }

  return next;
}

export function revealMineCell(
  board: MineCell[][],
  startRow: number,
  startCol: number
): { board: MineCell[][]; hitMine: boolean; revealedCount: number } {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const next = cloneMinesweeperBoard(board);
  const target = next[startRow]?.[startCol];
  if (!target || target.isRevealed || target.isFlagged) {
    return { board: next, hitMine: false, revealedCount: 0 };
  }

  if (target.isMine) {
    target.isRevealed = true;
    target.exploded = true;
    // Reveal all mines on loss
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (next[r][c].isMine) next[r][c].isRevealed = true;
      }
    }
    return { board: next, hitMine: true, revealedCount: 1 };
  }

  let revealedCount = 0;
  const queue: Array<[number, number]> = [[startRow, startCol]];
  target.isRevealed = true;
  revealedCount++;

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (next[r][c].adjacentMines !== 0) continue;
    for (const [nr, nc] of getNeighbors(rows, cols, r, c)) {
      const neighbor = next[nr][nc];
      if (!neighbor.isRevealed && !neighbor.isFlagged && !neighbor.isMine) {
        neighbor.isRevealed = true;
        revealedCount++;
        if (neighbor.adjacentMines === 0) {
          queue.push([nr, nc]);
        }
      }
    }
  }

  return { board: next, hitMine: false, revealedCount };
}

export function toggleFlagCell(board: MineCell[][], row: number, col: number): MineCell[][] {
  const next = cloneMinesweeperBoard(board);
  const cell = next[row]?.[col];
  if (!cell || cell.isRevealed) return next;
  cell.isFlagged = !cell.isFlagged;
  return next;
}

export function chordRevealCell(
  board: MineCell[][],
  row: number,
  col: number
): { board: MineCell[][]; hitMine: boolean; revealedCount: number } {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const cell = board[row]?.[col];
  if (!cell || !cell.isRevealed || cell.adjacentMines <= 0) {
    return { board, hitMine: false, revealedCount: 0 };
  }

  const neighbors = getNeighbors(rows, cols, row, col);
  const flaggedCount = neighbors.reduce((sum, [nr, nc]) => sum + (board[nr][nc].isFlagged ? 1 : 0), 0);
  if (flaggedCount !== cell.adjacentMines) {
    return { board, hitMine: false, revealedCount: 0 };
  }

  let current = board;
  let totalRevealed = 0;
  for (const [nr, nc] of neighbors) {
    if (!current[nr][nc].isRevealed && !current[nr][nc].isFlagged) {
      const res = revealMineCell(current, nr, nc);
      current = res.board;
      totalRevealed += res.revealedCount;
      if (res.hitMine) {
        return { board: current, hitMine: true, revealedCount: totalRevealed };
      }
    }
  }

  return { board: current, hitMine: false, revealedCount: totalRevealed };
}

export function countFlags(board: MineCell[][]): number {
  let flags = 0;
  for (const row of board) {
    for (const cell of row) {
      if (cell.isFlagged) flags++;
    }
  }
  return flags;
}

export function checkMinesweeperWin(board: MineCell[][]): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.isMine && !cell.isRevealed) return false;
    }
  }
  return true;
}
