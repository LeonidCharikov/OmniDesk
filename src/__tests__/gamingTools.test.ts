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
import {
  computeRefreshMetrics,
  PIXEL_TEST_COLORS,
  snapStandardRefreshRate,
} from '../tools/gaming/monitorTester.logic';
import {
  ANSI_KEYBOARD_ROWS,
  computeStickMetrics,
  GHOSTING_CHALLENGES,
  isChallengeSatisfied,
  isKeyChatter,
  summarizeLatencySamples,
} from '../tools/gaming/inputDiagnostics.logic';
import {
  createInitial2048State,
  getMax2048Tile,
  hasAvailable2048Moves,
  slide2048Board,
} from '../tools/gaming/game2048.logic';
import {
  checkMinesweeperWin,
  chordRevealCell,
  countFlags,
  createEmptyMinesweeperBoard,
  placeMinesSafely,
  revealMineCell,
  toggleFlagCell,
} from '../tools/gaming/minesweeper.logic';
import {
  computeTypingConsistency,
  evaluateTypingProgress,
  generateTypingPrompt,
} from '../tools/gaming/typingTest.logic';
import {
  appendSimonStep,
  generateDigitSequence,
  generateGridPattern,
  getGridConfigForLevel,
  getSimonPlaybackIntervalMs,
} from '../tools/gaming/memorySequence.logic';
import {
  computeComboMultiplier,
  computeRhythmAccuracy,
  computeRhythmLetterGrade,
  generateBeatChart,
  judgeRhythmOffset,
} from '../tools/gaming/rhythmTiming.logic';

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

describe('Monitor & Dead-Pixel / Ghosting Test Logic', () => {
  it('measures refresh rate, frame jitter, dropped frames, and snaps nominal Hz', () => {
    expect(PIXEL_TEST_COLORS.length).toBeGreaterThanOrEqual(8);
    // Simulate 144 Hz display (~6.94ms) with one dropped frame spike (21ms)
    const deltas = [...Array(29).fill(6.944), 21.0];
    const m = computeRefreshMetrics(deltas);
    expect(m.hz).toBeCloseTo(144, 0);
    expect(m.droppedFrames).toBe(1);
    expect(snapStandardRefreshRate(143.8)).toBe(144);
    expect(snapStandardRefreshRate(59.94)).toBe(60);
    expect(snapStandardRefreshRate(239.7)).toBe(240);
  });
});

describe('Keyboard NKRO, Mouse & Gamepad Input Diagnostics Logic', () => {
  it('validates ANSI layout, NKRO combos, key chatter, stick drift, and latency stats', () => {
    expect(ANSI_KEYBOARD_ROWS.length).toBe(6);
    const held = new Set(['KeyW', 'KeyD', 'ShiftLeft', 'Space']);
    expect(isChallengeSatisfied(held, GHOSTING_CHALLENGES[0])).toBe(true);
    expect(isChallengeSatisfied(new Set(['KeyW']), GHOSTING_CHALLENGES[0])).toBe(false);

    expect(isKeyChatter(12, 25)).toBe(true);
    expect(isKeyChatter(60, 25)).toBe(false);

    const drifting = computeStickMetrics(0.14, 0.05, 0.08);
    expect(drifting.isDrifting).toBe(true);
    const centered = computeStickMetrics(0.01, -0.02, 0.08);
    expect(centered.isDrifting).toBe(false);

    const lat = summarizeLatencySamples([2.1, 3.4, 4.0, 8.2, 2.9]);
    expect(lat).not.toBeNull();
    expect(lat!.minMs).toBe(2.1);
    expect(lat!.maxMs).toBe(8.2);
    expect(lat!.count).toBe(5);
  });
});

describe('2048 Arcade Logic', () => {
  it('merges adjacent equal tiles once per slide and detects game over', () => {
    const state = {
      ...createInitial2048State(4, () => 0),
      board: [
        [2, 2, 4, 4],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    };
    const res = slide2048Board(state, 'LEFT', () => 0);
    expect(res.moved).toBe(true);
    expect(res.gainedScore).toBe(12);
    expect(res.next.board[0][0]).toBe(4);
    expect(res.next.board[0][1]).toBe(8);
    expect(getMax2048Tile(res.next.board)).toBe(8);

    const lockedBoard = [
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
    ];
    expect(hasAvailable2048Moves(lockedBoard)).toBe(false);
  });
});

describe('Minesweeper Classic Logic', () => {
  it('guarantees first-click safety, flood-fill reveals, flags, chord reveals, and win detection', () => {
    const empty = createEmptyMinesweeperBoard(9, 9);
    const placed = placeMinesSafely(empty, 10, 4, 4, () => 0.3);
    // Safe 3x3 zone around first click must be mine-free
    for (let r = 3; r <= 5; r++) {
      for (let c = 3; c <= 5; c++) {
        expect(placed[r][c].isMine).toBe(false);
      }
    }
    const firstClick = revealMineCell(placed, 4, 4);
    expect(firstClick.hitMine).toBe(false);
    expect(firstClick.revealedCount).toBeGreaterThan(1);

    // Deterministic 3x3 board with 1 mine at (0,0)
    const mini = createEmptyMinesweeperBoard(3, 3);
    mini[0][0].isMine = true;
    mini[0][1].adjacentMines = 1;
    mini[1][0].adjacentMines = 1;
    mini[1][1].adjacentMines = 1;

    const flagged = toggleFlagCell(mini, 0, 0);
    expect(countFlags(flagged)).toBe(1);
    const rev1 = revealMineCell(flagged, 1, 1);
    expect(rev1.hitMine).toBe(false);
    const chord = chordRevealCell(rev1.board, 1, 1);
    expect(chord.hitMine).toBe(false);
    expect(checkMinesweeperWin(chord.board)).toBe(true);
  });
});

describe('Typing Speed & Accuracy Test Logic', () => {
  it('generates prompts and calculates WPM, accuracy, weak keys, and consistency', () => {
    const words = generateTypingPrompt(
      { mode: 'words', wordCount: 15, includePunctuation: true, includeNumbers: false },
      () => 0.4
    );
    expect(words.split(' ').length).toBe(15);

    const code = generateTypingPrompt(
      { mode: 'code', wordCount: 30, includePunctuation: false, includeNumbers: false },
      () => 0.2
    );
    expect(code.length).toBeGreaterThan(20);

    const stats = evaluateTypingProgress('hello world', 'hello wxrld', 6); // 6s = 0.1 min
    expect(stats.correctChars).toBe(10);
    expect(stats.errorChars).toBe(1);
    expect(stats.netWpm).toBe(20);
    expect(stats.weakKeys[0]).toEqual({ char: 'O', misses: 1 });
    expect(computeTypingConsistency([80, 82, 79, 81])).toBeGreaterThan(95);
  });
});

describe('Memory Sequence Trainer Logic', () => {
  it('generates escalating Simon sequences, unique grid patterns, and digit spans', () => {
    const seq = appendSimonStep(appendSimonStep([], 4, () => 0.1), 4, () => 0.9);
    expect(seq).toHaveLength(2);
    expect(getSimonPlaybackIntervalMs(8)).toBeLessThan(getSimonPlaybackIntervalMs(1));

    const cfg = getGridConfigForLevel(5);
    expect(cfg.gridSize).toBe(4);
    const pattern = generateGridPattern(cfg.gridSize, cfg.tileCount, () => 0.3);
    expect(pattern).toHaveLength(cfg.tileCount);
    expect(new Set(pattern).size).toBe(cfg.tileCount);

    const digits = generateDigitSequence(7, () => 0.5);
    expect(digits).toMatch(/^\d{7}$/);
  });
});

describe('Aim & Rhythm Timing Bar Logic', () => {
  it('judges timing windows, builds BPM charts, and scores accuracy/grades', () => {
    expect(judgeRhythmOffset(10).grade).toBe('perfect');
    expect(judgeRhythmOffset(-55).grade).toBe('great');
    expect(judgeRhythmOffset(105).grade).toBe('good');
    expect(judgeRhythmOffset(180).grade).toBe('miss');

    const chart = generateBeatChart(120, 16, 1500, () => 0.2);
    expect(chart).toHaveLength(16);
    expect(chart[0].targetTimeMs).toBe(1500);
    expect(chart[1].targetTimeMs).toBe(2000);

    const acc = computeRhythmAccuracy({ perfect: 18, great: 2, good: 0, miss: 0 });
    expect(acc).toBe(97.5);
    expect(computeRhythmLetterGrade(acc)).toBe('S');
    expect(computeComboMultiplier(30)).toBe(4);
  });
});

