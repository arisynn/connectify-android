/**
 * Deterministic Match 3 Board Generator.
 * Populates shaped holes, fixed obstacles, ice overlays, gems, and colored tiles
 * with zero immediate matches and at least 2 valid opening swaps.
 * Zero React/DOM/Storage dependencies.
 * Owned by @match3-eng.
 */

import type {
  Match3Board,
  Match3Cell,
  Match3LevelConfig,
  ObstacleType,
} from '@/types/match3.types';
import { seededRandom, type RngFn } from '@/utils/random';
import { createTileUidFactory } from './cascadeResolver';
import { findAllValidSwaps, injectGuaranteedValidSwap } from './deadlockDetector';
import { findAllMatches, isSolidBlocker } from './matchDetector';

function pickSafeColor(
  board: Match3Board,
  r: number,
  c: number,
  tileColorCount: 4 | 5 | 6,
  rng: RngFn,
): number {
  const excluded = new Set<number>();

  // Prevent horizontal 3-in-a-row: (r, c-1) === (r, c-2)
  if (c >= 2) {
    const t1 = board[r][c - 1]?.tile;
    const t2 = board[r][c - 2]?.tile;
    if (t1 && t2 && t1.colorIndex >= 0 && t1.colorIndex === t2.colorIndex) {
      excluded.add(t1.colorIndex);
    }
  }

  // Prevent vertical 3-in-a-row: (r-1, c) === (r-2, c)
  if (r >= 2) {
    const t1 = board[r - 1][c]?.tile;
    const t2 = board[r - 2][c]?.tile;
    if (t1 && t2 && t1.colorIndex >= 0 && t1.colorIndex === t2.colorIndex) {
      excluded.add(t1.colorIndex);
    }
  }

  const allowed: number[] = [];
  for (let color = 0; color < tileColorCount; color++) {
    if (!excluded.has(color)) allowed.push(color);
  }

  const pool = allowed.length > 0 ? allowed : Array.from({ length: tileColorCount }, (_, i) => i);
  return pool[Math.floor(rng() * pool.length)];
}

/**
 * Generates a playable initial Match 3 board from a level configuration.
 */
export function generateMatch3Board(
  config: Match3LevelConfig,
  rngOverride?: RngFn,
): Match3Board {
  const rng = rngOverride ?? seededRandom(config.seed);
  const uidGen = createTileUidFactory(`L${config.level}`);
  const { rows, cols, tileColorCount } = config;

  const holeSet = new Set(config.holes.map((h) => `${h.r}:${h.c}`));
  const obstacleMap = new Map<string, ObstacleType>();
  for (const obs of config.obstacles) {
    if (obs.r >= 0 && obs.r < rows && obs.c >= 0 && obs.c < cols) {
      obstacleMap.set(`${obs.r}:${obs.c}`, obs.type);
    }
  }

  const buildAttempt = (): Match3Board => {
    const board: Match3Board = [];

    for (let r = 0; r < rows; r++) {
      const rowCells: Match3Cell[] = [];
      board.push(rowCells);

      for (let c = 0; c < cols; c++) {
        const key = `${r}:${c}`;
        const isHole = holeSet.has(key);
        const obstacle: ObstacleType = isHole ? '' : (obstacleMap.get(key) ?? '');

        if (isHole) {
          rowCells.push({ r, c, isHole: true, tile: null, obstacle: '' });
          continue;
        }

        if (isSolidBlocker(obstacle)) {
          rowCells.push({ r, c, isHole: false, tile: null, obstacle });
          continue;
        }

        if (obstacle === 'gem') {
          rowCells.push({
            r,
            c,
            isHole: false,
            obstacle: 'gem',
            tile: {
              uid: uidGen(),
              colorIndex: -1,
              special: 'none',
              dropRows: 0,
              isNewSpawn: false,
            },
          });
          continue;
        }

        // Playable normal tile or ice-covered tile
        const colorIndex = pickSafeColor(board, r, c, tileColorCount, rng);
        rowCells.push({
          r,
          c,
          isHole: false,
          obstacle,
          tile: {
            uid: uidGen(),
            colorIndex,
            special: 'none',
            dropRows: 0,
            isNewSpawn: false,
          },
        });
      }
    }

    return board;
  };

  let bestBoard = buildAttempt();
  for (let retry = 0; retry < 25; retry++) {
    const candidate = retry === 0 ? bestBoard : buildAttempt();
    const matches = findAllMatches(candidate);
    const validSwaps = findAllValidSwaps(candidate);
    if (matches.length === 0 && validSwaps.length >= 2) {
      return candidate;
    }
    bestBoard = candidate;
  }

  // Ensure guaranteed playable opening moves if the obstacle layout is dense
  if (findAllValidSwaps(bestBoard).length < 2) {
    injectGuaranteedValidSwap(bestBoard, tileColorCount, rng);
  }

  return bestBoard;
}
