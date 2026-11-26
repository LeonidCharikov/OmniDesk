export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export const TETRIS_COLS = 10;
export const TETRIS_ROWS = 20;

export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: '#06b6d4',
  O: '#eab308',
  T: '#a855f7',
  S: '#22c55e',
  Z: '#ef4444',
  J: '#3b82f6',
  L: '#f97316',
};

export type PieceMatrix = number[][];

export const TETROMINO_SHAPES: Record<TetrominoType, PieceMatrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export interface ActivePiece {
  type: TetrominoType;
  matrix: PieceMatrix;
  x: number;
  y: number;
  rotation: number; // 0..3
}

export type TetrisBoard = Array<Array<TetrominoType | null>>;

export interface TetrisState {
  board: TetrisBoard;
  active: ActivePiece;
  queue: TetrominoType[];
  hold: TetrominoType | null;
  canHold: boolean;
  score: number;
  lines: number;
  level: number;
  combo: number;
  backToBack: boolean;
  gameOver: boolean;
}

const ALL_TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export function createEmptyBoard(): TetrisBoard {
  return Array.from({ length: TETRIS_ROWS }, () => Array<TetrominoType | null>(TETRIS_COLS).fill(null));
}

export function generateBag(rng: () => number = Math.random): TetrominoType[] {
  const bag = [...ALL_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)) % (i + 1);
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }
  return bag;
}

export function rotateMatrixCW(matrix: PieceMatrix): PieceMatrix {
  const n = matrix.length;
  const out: PieceMatrix = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[c][n - 1 - r] = matrix[r][c];
    }
  }
  return out;
}

export function rotateMatrixCCW(matrix: PieceMatrix): PieceMatrix {
  const n = matrix.length;
  const out: PieceMatrix = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      out[n - 1 - c][r] = matrix[r][c];
    }
  }
  return out;
}

export function spawnPiece(type: TetrominoType): ActivePiece {
  const matrix = TETROMINO_SHAPES[type].map(row => [...row]);
  const x = Math.floor((TETRIS_COLS - matrix[0].length) / 2);
  const y = type === 'I' ? -1 : 0;
  return { type, matrix, x, y, rotation: 0 };
}

export function collides(board: TetrisBoard, piece: ActivePiece, dx = 0, dy = 0, matrix = piece.matrix): boolean {
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (!matrix[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= TETRIS_COLS || ny >= TETRIS_ROWS) return true;
      if (ny >= 0 && board[ny][nx] !== null) return true;
    }
  }
  return false;
}

export function getGhostY(board: TetrisBoard, piece: ActivePiece): number {
  let dy = 0;
  while (!collides(board, piece, 0, dy + 1)) {
    dy += 1;
  }
  return piece.y + dy;
}

export function getTetrisDropIntervalMs(level: number): number {
  const clamped = Math.max(1, Math.min(20, level));
  return Math.max(80, Math.round(800 * Math.pow(0.84, clamped - 1)));
}

function ensureQueue(queue: TetrominoType[], rng: () => number): TetrominoType[] {
  const next = [...queue];
  while (next.length < 7) {
    next.push(...generateBag(rng));
  }
  return next;
}

export function createInitialTetrisState(rng: () => number = Math.random): TetrisState {
  const initialQueue = ensureQueue(generateBag(rng), rng);
  const firstType = initialQueue.shift()!;
  return {
    board: createEmptyBoard(),
    active: spawnPiece(firstType),
    queue: ensureQueue(initialQueue, rng),
    hold: null,
    canHold: true,
    score: 0,
    lines: 0,
    level: 1,
    combo: -1,
    backToBack: false,
    gameOver: false,
  };
}

export function moveActivePiece(state: TetrisState, dx: number, dy: number): TetrisState | null {
  if (state.gameOver) return null;
  if (collides(state.board, state.active, dx, dy)) return null;
  return {
    ...state,
    active: {
      ...state.active,
      x: state.active.x + dx,
      y: state.active.y + dy,
    },
    score: dy > 0 ? state.score + dy : state.score,
  };
}

export function rotateActivePiece(state: TetrisState, clockwise = true): TetrisState | null {
  if (state.gameOver) return null;
  if (state.active.type === 'O') return state;
  const nextMatrix = clockwise ? rotateMatrixCW(state.active.matrix) : rotateMatrixCCW(state.active.matrix);
  const kicks: Array<[number, number]> =
    state.active.type === 'I'
      ? [
          [0, 0],
          [-2, 0],
          [2, 0],
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, -2],
        ]
      : [
          [0, 0],
          [-1, 0],
          [1, 0],
          [0, -1],
          [-1, -1],
          [1, -1],
          [0, 1],
        ];

  for (const [kx, ky] of kicks) {
    if (!collides(state.board, state.active, kx, ky, nextMatrix)) {
      return {
        ...state,
        active: {
          ...state.active,
          matrix: nextMatrix,
          x: state.active.x + kx,
          y: state.active.y + ky,
          rotation: (state.active.rotation + (clockwise ? 1 : 3)) % 4,
        },
      };
    }
  }
  return null;
}

export function holdActivePiece(state: TetrisState, rng: () => number = Math.random): TetrisState | null {
  if (state.gameOver || !state.canHold) return null;
  const currentType = state.active.type;
  let nextType: TetrominoType;
  let nextQueue = [...state.queue];
  if (state.hold) {
    nextType = state.hold;
  } else {
    nextType = nextQueue.shift()!;
    nextQueue = ensureQueue(nextQueue, rng);
  }
  const spawned = spawnPiece(nextType);
  if (collides(state.board, spawned)) {
    return { ...state, gameOver: true };
  }
  return {
    ...state,
    active: spawned,
    queue: nextQueue,
    hold: currentType,
    canHold: false,
  };
}

export function lockActivePiece(
  state: TetrisState,
  extraDropPoints = 0,
  rng: () => number = Math.random
): { next: TetrisState; clearedLines: number } {
  const nextBoard: TetrisBoard = state.board.map(row => [...row]);
  let toppedOut = false;

  for (let r = 0; r < state.active.matrix.length; r++) {
    for (let c = 0; c < state.active.matrix[r].length; c++) {
      if (!state.active.matrix[r][c]) continue;
      const bx = state.active.x + c;
      const by = state.active.y + r;
      if (by < 0) {
        toppedOut = true;
      } else if (by < TETRIS_ROWS && bx >= 0 && bx < TETRIS_COLS) {
        nextBoard[by][bx] = state.active.type;
      }
    }
  }

  const remainingRows = nextBoard.filter(row => row.some(cell => cell === null));
  const clearedLines = TETRIS_ROWS - remainingRows.length;
  while (remainingRows.length < TETRIS_ROWS) {
    remainingRows.unshift(Array<TetrominoType | null>(TETRIS_COLS).fill(null));
  }

  const baseLinePoints = [0, 100, 300, 500, 800][clearedLines] || 0;
  const nextCombo = clearedLines > 0 ? state.combo + 1 : -1;
  const isTetris = clearedLines === 4;
  const b2bBonus = isTetris && state.backToBack ? Math.round(baseLinePoints * 0.5) : 0;
  const comboBonus = nextCombo > 0 ? 50 * nextCombo * state.level : 0;
  const lineScore = (baseLinePoints + b2bBonus) * state.level + comboBonus;

  const nextLines = state.lines + clearedLines;
  const nextLevel = Math.floor(nextLines / 10) + 1;
  const nextQueue = ensureQueue([...state.queue], rng);
  const nextType = nextQueue.shift()!;
  const spawned = spawnPiece(nextType);
  const gameOver = toppedOut || collides(remainingRows, spawned);

  return {
    clearedLines,
    next: {
      board: remainingRows,
      active: spawned,
      queue: ensureQueue(nextQueue, rng),
      hold: state.hold,
      canHold: true,
      score: state.score + lineScore + extraDropPoints,
      lines: nextLines,
      level: nextLevel,
      combo: nextCombo,
      backToBack: clearedLines > 0 ? isTetris : state.backToBack,
      gameOver,
    },
  };
}

export function hardDropActivePiece(
  state: TetrisState,
  rng: () => number = Math.random
): { next: TetrisState; clearedLines: number; dropDistance: number } {
  if (state.gameOver) return { next: state, clearedLines: 0, dropDistance: 0 };
  const targetY = getGhostY(state.board, state.active);
  const dropDistance = Math.max(0, targetY - state.active.y);
  const droppedState: TetrisState = {
    ...state,
    active: { ...state.active, y: targetY },
  };
  const { next, clearedLines } = lockActivePiece(droppedState, dropDistance * 2, rng);
  return { next, clearedLines, dropDistance };
}
