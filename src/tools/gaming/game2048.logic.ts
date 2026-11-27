// Pure logic for 2048 Puzzle Arcade

export type Direction2048 = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Game2048State {
  size: number;
  board: number[][];
  score: number;
  moves: number;
  won: boolean;
  gameOver: boolean;
}

export function createEmpty2048Board(size = 4): number[][] {
  return Array.from({ length: size }, () => Array<number>(size).fill(0));
}

export function clone2048Board(board: number[][]): number[][] {
  return board.map(row => [...row]);
}

export function spawn2048Tile(board: number[][], rng: () => number = Math.random): number[][] {
  const next = clone2048Board(board);
  const empty: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < next.length; r++) {
    for (let c = 0; c < next[r].length; c++) {
      if (next[r][c] === 0) empty.push({ r, c });
    }
  }
  if (empty.length === 0) return next;
  const pick = empty[Math.floor(rng() * empty.length) % empty.length];
  next[pick.r][pick.c] = rng() < 0.9 ? 2 : 4;
  return next;
}

export function createInitial2048State(size = 4, rng: () => number = Math.random): Game2048State {
  let board = createEmpty2048Board(size);
  board = spawn2048Tile(board, rng);
  board = spawn2048Tile(board, rng);
  return {
    size,
    board,
    score: 0,
    moves: 0,
    won: false,
    gameOver: false,
  };
}

export function getMax2048Tile(board: number[][]): number {
  let max = 0;
  for (const row of board) {
    for (const v of row) {
      if (v > max) max = v;
    }
  }
  return max;
}

export function hasAvailable2048Moves(board: number[][]): boolean {
  const n = board.length;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const val = board[r][c];
      if (val === 0) return true;
      if (c + 1 < n && board[r][c + 1] === val) return true;
      if (r + 1 < n && board[r + 1][c] === val) return true;
    }
  }
  return false;
}

function slideLineLeft(line: number[]): { line: number[]; gained: number; moved: boolean } {
  const nonZero = line.filter(v => v !== 0);
  const merged: number[] = [];
  let gained = 0;

  let i = 0;
  while (i < nonZero.length) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const val = nonZero[i] * 2;
      merged.push(val);
      gained += val;
      i += 2;
    } else {
      merged.push(nonZero[i]);
      i += 1;
    }
  }

  while (merged.length < line.length) {
    merged.push(0);
  }

  let moved = false;
  for (let idx = 0; idx < line.length; idx++) {
    if (merged[idx] !== line[idx]) {
      moved = true;
      break;
    }
  }

  return { line: merged, gained, moved };
}

export interface Slide2048Result {
  next: Game2048State;
  moved: boolean;
  gainedScore: number;
  mergedAny: boolean;
}

export function slide2048Board(
  state: Game2048State,
  direction: Direction2048,
  rng: () => number = Math.random
): Slide2048Result {
  if (state.gameOver) {
    return { next: state, moved: false, gainedScore: 0, mergedAny: false };
  }

  const n = state.size;
  const nextBoard = createEmpty2048Board(n);
  let moved = false;
  let gainedScore = 0;

  if (direction === 'LEFT' || direction === 'RIGHT') {
    for (let r = 0; r < n; r++) {
      const raw = direction === 'RIGHT' ? [...state.board[r]].reverse() : [...state.board[r]];
      const res = slideLineLeft(raw);
      const finalRow = direction === 'RIGHT' ? res.line.reverse() : res.line;
      nextBoard[r] = finalRow;
      if (res.moved) moved = true;
      gainedScore += res.gained;
    }
  } else {
    for (let c = 0; c < n; c++) {
      const col: number[] = [];
      for (let r = 0; r < n; r++) col.push(state.board[r][c]);
      const raw = direction === 'DOWN' ? [...col].reverse() : col;
      const res = slideLineLeft(raw);
      const finalCol = direction === 'DOWN' ? res.line.reverse() : res.line;
      for (let r = 0; r < n; r++) nextBoard[r][c] = finalCol[r];
      if (res.moved) moved = true;
      gainedScore += res.gained;
    }
  }

  if (!moved) {
    return { next: state, moved: false, gainedScore: 0, mergedAny: false };
  }

  const withSpawn = spawn2048Tile(nextBoard, rng);
  const won = state.won || getMax2048Tile(withSpawn) >= 2048;
  const gameOver = !hasAvailable2048Moves(withSpawn);

  return {
    next: {
      size: state.size,
      board: withSpawn,
      score: state.score + gainedScore,
      moves: state.moves + 1,
      won,
      gameOver,
    },
    moved: true,
    gainedScore,
    mergedAny: gainedScore > 0,
  };
}
