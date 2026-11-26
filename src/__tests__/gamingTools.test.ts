import { describe, it, expect } from 'vitest';
import {
  CROSSHAIR_PRESETS,
  DEFAULT_CROSSHAIR_CONFIG,
  sanitizeCrosshairConfig,
  encodeCrosshairShareCode,
  decodeCrosshairShareCode,
  generateRandomCrosshair,
  buildCrosshairSvgMarkup,
} from '../tools/gaming/crosshair.logic';
import {
  createInitialSnakeState,
  getSnakeTickMs,
  isOppositeDirection,
  stepSnakeState,
} from '../tools/gaming/snake.logic';
import {
  TETRIS_COLS,
  TETRIS_ROWS,
  createEmptyBoard,
  createInitialTetrisState,
  generateBag,
  getGhostY,
  getTetrisDropIntervalMs,
  hardDropActivePiece,
  holdActivePiece,
  moveActivePiece,
  rotateActivePiece,
  spawnPiece,
} from '../tools/gaming/tetris.logic';
import {
  computeAimAccuracy,
  computePollingRateHz,
  evaluateTimingBarHit,
  isAccidentalDoubleClick,
  summarizeReactionTimes,
} from '../tools/gaming/reflex.logic';

describe('Crosshair Overlay Studio Logic', () => {
  it('provides valid game presets across popular FPS titles', () => {
    expect(CROSSHAIR_PRESETS.length).toBeGreaterThanOrEqual(12);
    const ids = new Set<string>();
    for (const preset of CROSSHAIR_PRESETS) {
      expect(ids.has(preset.id)).toBe(false);
      ids.add(preset.id);
      const sanitized = sanitizeCrosshairConfig(preset.config);
      expect(sanitized.opacity).toBeGreaterThanOrEqual(0.1);
      expect(sanitized.opacity).toBeLessThanOrEqual(1);
      expect(sanitized.scale).toBeGreaterThanOrEqual(0.5);
      expect(sanitized.scale).toBeLessThanOrEqual(3);
    }
  });

  it('clamps out-of-range values and sanitizes invalid colors', () => {
    const clean = sanitizeCrosshairConfig({
      color: 'not-a-color',
      opacity: 99,
      scale: -5,
      lineLength: 500,
      offsetX: -999,
      offsetY: 999,
    });
    expect(clean.color).toBe(DEFAULT_CROSSHAIR_CONFIG.color);
    expect(clean.opacity).toBe(1);
    expect(clean.scale).toBe(0.5);
    expect(clean.lineLength).toBe(40);
    expect(clean.offsetX).toBe(-200);
    expect(clean.offsetY).toBe(200);
  });

  it('round-trips ODX share codes and JSON payloads cleanly', () => {
    const custom = sanitizeCrosshairConfig({
      ...DEFAULT_CROSSHAIR_CONFIG,
      name: 'Valorant Precision',
      color: '#ff3b30',
      tStyle: true,
      diagonal: true,
      showRing: true,
      ringRadius: 14,
      offsetX: -3,
      offsetY: 2,
    });

    const code = encodeCrosshairShareCode(custom);
    expect(code.startsWith('ODX-')).toBe(true);

    const decoded = decodeCrosshairShareCode(code);
    expect(decoded).toEqual(custom);

    const jsonDecoded = decodeCrosshairShareCode(JSON.stringify(custom));
    expect(jsonDecoded).toEqual(custom);

    expect(decodeCrosshairShareCode('')).toBeNull();
    expect(decodeCrosshairShareCode('INVALID-CODE')).toBeNull();
  });

  it('generates randomized configs and valid SVG markup', () => {
    let seed = 0.25;
    const rng = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const randomConfig = generateRandomCrosshair(rng);
    expect(randomConfig.name.startsWith('Random #')).toBe(true);

    const svg = buildCrosshairSvgMarkup(
      {
        ...DEFAULT_CROSSHAIR_CONFIG,
        showLines: true,
        showDot: true,
        showRing: true,
        diagonal: true,
      },
      256
    );
    expect(svg).toContain('<svg ');
    expect(svg).toContain('viewBox="0 0 256 256"');
    expect(svg).toContain('rotate(45)');
    expect(svg).toContain('<circle ');
    expect(svg).toContain('<rect ');
  });
});

describe('Snake Arcade Logic', () => {
  it('prevents 180-degree reversal and moves forward cleanly', () => {
    expect(isOppositeDirection('UP', 'DOWN')).toBe(true);
    expect(isOppositeDirection('LEFT', 'RIGHT')).toBe(true);
    expect(isOppositeDirection('UP', 'LEFT')).toBe(false);

    const initial = createInitialSnakeState('classic', 20, () => 0);
    const { next } = stepSnakeState(initial, 'LEFT', () => 0);
    // Reversal LEFT is ignored while moving RIGHT
    expect(next.direction).toBe('RIGHT');
    expect(next.snake[0].x).toBe(initial.snake[0].x + 1);
    expect(next.gameOver).toBe(false);
  });

  it('ends on wall hit in classic mode but wraps in portal mode', () => {
    const base = createInitialSnakeState('classic', 10, () => 0);
    const edgeClassic = {
      ...base,
      snake: [
        { x: 9, y: 5 },
        { x: 8, y: 5 },
        { x: 7, y: 5 },
      ],
      direction: 'RIGHT' as const,
      food: { x: 0, y: 0 },
    };
    expect(stepSnakeState(edgeClassic, undefined, () => 0).next.gameOver).toBe(true);

    const edgeWrap = { ...edgeClassic, mode: 'wrap' as const };
    const wrapped = stepSnakeState(edgeWrap, undefined, () => 0).next;
    expect(wrapped.gameOver).toBe(false);
    expect(wrapped.snake[0]).toEqual({ x: 0, y: 5 });
  });

  it('grows snake, increments score, and spawns bonus golden apple every 5 foods', () => {
    const initial = createInitialSnakeState('classic', 12, () => 0);
    const poised = {
      ...initial,
      foodsEaten: 4,
      food: { x: initial.snake[0].x + 1, y: initial.snake[0].y },
    };
    const { next, ateFood } = stepSnakeState(poised, 'RIGHT', () => 0.5);
    expect(ateFood).toBe(true);
    expect(next.foodsEaten).toBe(5);
    expect(next.snake.length).toBe(initial.snake.length + 1);
    expect(next.score).toBe(10);
    expect(next.bonusFood).not.toBeNull();
    expect(getSnakeTickMs('turbo', 10)).toBeLessThan(getSnakeTickMs('classic', 10));
  });
});

describe('Tetris Classic Logic', () => {
  it('generates complete 7-piece bags without duplicates', () => {
    const bag = generateBag(() => 0.37);
    expect(bag).toHaveLength(7);
    expect(new Set(bag).size).toBe(7);
  });

  it('supports movement, rotation with wall-kick, hold swap, and hard-drop line clearing', () => {
    const state = createInitialTetrisState(() => 0.2);
    const moved = moveActivePiece(state, 1, 0);
    expect(moved).not.toBeNull();
    expect(moved!.active.x).toBe(state.active.x + 1);

    const held = holdActivePiece(state, () => 0.2);
    expect(held).not.toBeNull();
    expect(held!.hold).toBe(state.active.type);
    expect(held!.canHold).toBe(false);
    // Second hold before lock must be blocked
    expect(holdActivePiece(held!, () => 0.2)).toBeNull();

    // Wall-kick test: place I piece against left edge and rotate
    const wallState = {
      ...state,
      active: { ...spawnPiece('I'), x: 0, y: 4 },
    };
    const rotated = rotateActivePiece(wallState, true);
    expect(rotated).not.toBeNull();
    expect(rotated!.active.rotation).toBe(1);

    // Line-clear scoring test with bottom row filled except 4 cells for horizontal I piece
    const board = createEmptyBoard();
    for (let c = 0; c < TETRIS_COLS; c++) {
      if (c < 3 || c >= 7) {
        board[TETRIS_ROWS - 1][c] = 'J';
      }
    }
    const clearReady = {
      ...state,
      board,
      active: { ...spawnPiece('I'), x: 3, y: 0 },
    };
    const ghostY = getGhostY(clearReady.board, clearReady.active);
    expect(ghostY).toBe(TETRIS_ROWS - 2);

    const { next, clearedLines, dropDistance } = hardDropActivePiece(clearReady, () => 0.1);
    expect(clearedLines).toBe(1);
    expect(dropDistance).toBeGreaterThan(0);
    expect(next.lines).toBe(1);
    expect(next.score).toBe(100 + dropDistance * 2);
    expect(getTetrisDropIntervalMs(10)).toBeLessThan(getTetrisDropIntervalMs(1));
  });
});

describe('Reaction, Aim & Mouse Lab Logic', () => {
  it('computes accurate reaction summary stats and speed tier', () => {
    expect(summarizeReactionTimes([])).toBeNull();

    const summary = summarizeReactionTimes([170, 185, 195, 180, 190]);
    expect(summary).not.toBeNull();
    expect(summary!.count).toBe(5);
    expect(summary!.averageMs).toBe(184);
    expect(summary!.bestMs).toBe(170);
    expect(summary!.worstMs).toBe(195);
    expect(summary!.tier).toBe('pro');
  });

  it('evaluates timing bar hits, perfect center hits, and misses', () => {
    const perfect = evaluateTimingBarHit(0.5, 0.5, 0.2);
    expect(perfect.hit).toBe(true);
    expect(perfect.perfect).toBe(true);

    const edgeHit = evaluateTimingBarHit(0.58, 0.5, 0.2);
    expect(edgeHit.hit).toBe(true);
    expect(edgeHit.perfect).toBe(false);

    const miss = evaluateTimingBarHit(0.85, 0.5, 0.2);
    expect(miss.hit).toBe(false);
    expect(miss.perfect).toBe(false);
  });

  it('calculates aim accuracy, polling rate Hz, and double-click faults', () => {
    expect(computeAimAccuracy(0, 0)).toBe(100);
    expect(computeAimAccuracy(18, 2)).toBe(90);

    // Simulated 1000 Hz mouse (1ms deltas)
    const samples1000Hz = Array.from({ length: 20 }, (_, i) => i * 1.0);
    expect(computePollingRateHz(samples1000Hz)).toBe(1000);

    // Simulated 250 Hz mouse (4ms deltas)
    const samples250Hz = Array.from({ length: 20 }, (_, i) => i * 4.0);
    expect(computePollingRateHz(samples250Hz)).toBe(250);

    expect(isAccidentalDoubleClick(35, 80)).toBe(true);
    expect(isAccidentalDoubleClick(140, 80)).toBe(false);
  });
});
