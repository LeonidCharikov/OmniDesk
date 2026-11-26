export type SnakeDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type SnakeMode = 'classic' | 'wrap' | 'turbo';

export interface GridPoint {
  x: number;
  y: number;
}

export interface SnakeState {
  gridSize: number;
  snake: GridPoint[];
  direction: SnakeDirection;
  food: GridPoint;
  bonusFood: (GridPoint & { ttl: number }) | null;
  score: number;
  foodsEaten: number;
  mode: SnakeMode;
  gameOver: boolean;
}

export function isOppositeDirection(a: SnakeDirection, b: SnakeDirection): boolean {
  return (
    (a === 'UP' && b === 'DOWN') ||
    (a === 'DOWN' && b === 'UP') ||
    (a === 'LEFT' && b === 'RIGHT') ||
    (a === 'RIGHT' && b === 'LEFT')
  );
}

export function spawnFreeCell(
  gridSize: number,
  occupied: GridPoint[],
  rng: () => number = Math.random
): GridPoint {
  const occupiedSet = new Set(occupied.map(p => `${p.x},${p.y}`));
  const free: GridPoint[] = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (!occupiedSet.has(`${x},${y}`)) {
        free.push({ x, y });
      }
    }
  }
  if (free.length === 0) return { x: 0, y: 0 };
  const idx = Math.floor(rng() * free.length) % free.length;
  return free[idx];
}

export function createInitialSnakeState(
  mode: SnakeMode = 'classic',
  gridSize = 20,
  rng: () => number = Math.random
): SnakeState {
  const mid = Math.floor(gridSize / 2);
  const snake: GridPoint[] = [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
  const food = spawnFreeCell(gridSize, snake, rng);
  return {
    gridSize,
    snake,
    direction: 'RIGHT',
    food,
    bonusFood: null,
    score: 0,
    foodsEaten: 0,
    mode,
    gameOver: false,
  };
}

export function getSnakeTickMs(mode: SnakeMode, foodsEaten: number): number {
  if (mode === 'turbo') {
    return Math.max(48, 105 - foodsEaten * 3);
  }
  if (mode === 'wrap') {
    return Math.max(62, 130 - foodsEaten * 2.2);
  }
  return Math.max(60, 135 - foodsEaten * 2.4);
}

export function stepSnakeState(
  state: SnakeState,
  requestedDir?: SnakeDirection,
  rng: () => number = Math.random
): { next: SnakeState; ateFood: boolean; ateBonus: boolean } {
  if (state.gameOver) {
    return { next: state, ateFood: false, ateBonus: false };
  }

  const nextDir =
    requestedDir && !isOppositeDirection(state.direction, requestedDir)
      ? requestedDir
      : state.direction;

  const head = state.snake[0];
  let nx = head.x;
  let ny = head.y;
  if (nextDir === 'UP') ny -= 1;
  else if (nextDir === 'DOWN') ny += 1;
  else if (nextDir === 'LEFT') nx -= 1;
  else nx += 1;

  if (state.mode === 'wrap') {
    nx = (nx + state.gridSize) % state.gridSize;
    ny = (ny + state.gridSize) % state.gridSize;
  } else if (nx < 0 || ny < 0 || nx >= state.gridSize || ny >= state.gridSize) {
    return {
      next: { ...state, direction: nextDir, gameOver: true },
      ateFood: false,
      ateBonus: false,
    };
  }

  const ateFood = nx === state.food.x && ny === state.food.y;
  const ateBonus = Boolean(state.bonusFood && nx === state.bonusFood.x && ny === state.bonusFood.y);

  // Tail vacates its square unless snake grows this tick
  const bodyToCheck = ateFood ? state.snake : state.snake.slice(0, -1);
  if (bodyToCheck.some(seg => seg.x === nx && seg.y === ny)) {
    return {
      next: { ...state, direction: nextDir, gameOver: true },
      ateFood: false,
      ateBonus: false,
    };
  }

  const nextSnake: GridPoint[] = [{ x: nx, y: ny }, ...state.snake];
  if (!ateFood) {
    nextSnake.pop();
  }

  const nextFoodsEaten = ateFood ? state.foodsEaten + 1 : state.foodsEaten;
  const pointsDelta = (ateFood ? (state.mode === 'turbo' ? 15 : 10) : 0) + (ateBonus ? 35 : 0);

  let nextBonus = state.bonusFood
    ? ateBonus
      ? null
      : state.bonusFood.ttl > 1
        ? { ...state.bonusFood, ttl: state.bonusFood.ttl - 1 }
        : null
    : null;

  const nextFood = ateFood
    ? spawnFreeCell(
        state.gridSize,
        nextBonus ? [...nextSnake, nextBonus] : nextSnake,
        rng
      )
    : state.food;

  if (ateFood && !nextBonus && nextFoodsEaten > 0 && nextFoodsEaten % 5 === 0) {
    const pos = spawnFreeCell(state.gridSize, [...nextSnake, nextFood], rng);
    nextBonus = { ...pos, ttl: 38 };
  }

  const filledBoard = nextSnake.length >= state.gridSize * state.gridSize;

  return {
    next: {
      ...state,
      snake: nextSnake,
      direction: nextDir,
      food: nextFood,
      bonusFood: nextBonus,
      score: state.score + pointsDelta,
      foodsEaten: nextFoodsEaten,
      gameOver: filledBoard,
    },
    ateFood,
    ateBonus,
  };
}
