import { describe, it, expect } from 'vitest';
import {
  findAllMatches,
  validateSwap,
  cloneBoard,
} from '@/games/match3/engine/matchDetector';
import { resolveSwap, createTileUidFactory } from '@/games/match3/engine/cascadeResolver';
import { seededRandom } from '@/utils/random';
import type { Match3Board, ObstacleType, SpecialTileType } from '@/types/match3.types';

function createPatternBoard(rows = 7, cols = 7): Match3Board {
  const uid = createTileUidFactory('pat');
  const board: Match3Board = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      row.push({
        r,
        c,
        isHole: false,
        obstacle: '' as ObstacleType,
        tile: {
          uid: uid(),
          // Uses only colors 1..4 with no horizontal or vertical 3-in-a-row, leaving color 0 exclusive to injected test patterns
          colorIndex: 1 + ((r * 2 + c) % 4),
          special: 'none' as SpecialTileType,
          dropRows: 0,
          isNewSpawn: false,
        },
      });
    }
    board.push(row);
  }
  return board;
}

describe('Match 3 Swap Validation, Shape Classification & Gem Carriers (M3-SWAP-01..06)', () => {
  it('M3-SWAP-01: accepts valid match-3 swap, rejects non-matching swap, and never mutates input board', () => {
    const board = createPatternBoard(7, 7);
    // Set up horizontal match-3 when swapping (3,2) <-> (3,3):
    // Put color 0 at (3,0), (3,1), and (3,3)
    board[3][0].tile!.colorIndex = 0;
    board[3][1].tile!.colorIndex = 0;
    board[3][3].tile!.colorIndex = 0;

    const snapshotBefore = cloneBoard(board);
    const validRes = validateSwap(board, { r: 3, c: 3 }, { r: 3, c: 2 }, 'idle');
    expect(validRes.valid).toBe(true);
    expect(validRes.isSpecialCombo).toBe(false);
    expect(validRes.matches?.[0].shape).toBe('match_3');
    // Non-mutating validation
    expect(board).toEqual(snapshotBefore);

    // Non-matching swap returns NO_MATCH
    const badRes = validateSwap(board, { r: 0, c: 0 }, { r: 0, c: 1 }, 'idle');
    expect(badRes.valid).toBe(false);
    expect(badRes.reason).toBe('NO_MATCH');
    expect(board).toEqual(snapshotBefore);
  });

  it('M3-SWAP-02: rejects locked phase, out-of-bounds, non-adjacent, holes, and immovable obstacles', () => {
    const board = createPatternBoard(7, 7);
    board[1][1].isHole = true;
    board[1][1].tile = null;
    board[2][2].obstacle = 'ice';
    board[2][3].obstacle = 'wood';
    board[2][3].tile = null;
    board[2][4].obstacle = 'metal-2';
    board[2][4].tile = null;
    board[2][5].obstacle = 'stone';
    board[2][5].tile = null;

    expect(validateSwap(board, { r: 0, c: 0 }, { r: 0, c: 1 }, 'cascading')).toEqual({
      valid: false,
      reason: 'INPUT_LOCKED',
    });
    expect(validateSwap(board, { r: -1, c: 0 }, { r: 0, c: 0 })).toEqual({
      valid: false,
      reason: 'OUT_OF_BOUNDS',
    });
    expect(validateSwap(board, { r: 0, c: 0 }, { r: 1, c: 1 })).toEqual({
      valid: false,
      reason: 'NOT_ADJACENT',
    });
    expect(validateSwap(board, { r: 1, c: 0 }, { r: 1, c: 1 })).toEqual({
      valid: false,
      reason: 'BLOCKED_CELL',
    });
    expect(validateSwap(board, { r: 2, c: 1 }, { r: 2, c: 2 })).toEqual({
      valid: false,
      reason: 'IMMOVABLE_TILE',
    });
    expect(validateSwap(board, { r: 3, c: 3 }, { r: 2, c: 3 })).toEqual({
      valid: false,
      reason: 'IMMOVABLE_TILE',
    });
    expect(validateSwap(board, { r: 3, c: 4 }, { r: 2, c: 4 })).toEqual({
      valid: false,
      reason: 'IMMOVABLE_TILE',
    });
    expect(validateSwap(board, { r: 3, c: 5 }, { r: 2, c: 5 })).toEqual({
      valid: false,
      reason: 'IMMOVABLE_TILE',
    });
  });

  it('M3-SWAP-03: classifies Match-4 horizontal -> striped_v and Match-4 vertical -> striped_h at focal coordinate', () => {
    const hBoard = createPatternBoard(7, 7);
    // Horizontal 4-match of color 0 at row 3 cols 1..4 via swapping (2,2)->(3,2)
    hBoard[3][1].tile!.colorIndex = 0;
    hBoard[2][2].tile!.colorIndex = 0;
    hBoard[3][3].tile!.colorIndex = 0;
    hBoard[3][4].tile!.colorIndex = 0;

    const resH = resolveSwap(hBoard, { r: 2, c: 2 }, { r: 3, c: 2 }, 5, seededRandom(11));
    expect(resH.valid).toBe(true);
    expect(resH.waves[0].spawnedSpecials[0]).toMatchObject({
      coord: { r: 3, c: 2 },
      type: 'striped_v',
      colorIndex: 0,
    });

    const vBoard = createPatternBoard(7, 7);
    // Vertical 4-match of color 0 at col 4 rows 1..4 via swapping (2,3)->(2,4)
    vBoard[1][4].tile!.colorIndex = 0;
    vBoard[2][3].tile!.colorIndex = 0;
    vBoard[3][4].tile!.colorIndex = 0;
    vBoard[4][4].tile!.colorIndex = 0;

    const resV = resolveSwap(vBoard, { r: 2, c: 3 }, { r: 2, c: 4 }, 5, seededRandom(12));
    expect(resV.valid).toBe(true);
    expect(resV.waves[0].spawnedSpecials[0]).toMatchObject({
      coord: { r: 2, c: 4 },
      type: 'striped_h',
      colorIndex: 0,
    });
  });

  it('M3-SWAP-04: classifies L-shape & T-shape intersections as bomb_3x3', () => {
    // L-shape at corner (2,2) with color 0: (2,2),(2,3),(2,4) and (3,2),(4,2)
    const lBoard = createPatternBoard(7, 7);
    lBoard[2][2].tile!.colorIndex = 0;
    lBoard[2][3].tile!.colorIndex = 0;
    lBoard[2][4].tile!.colorIndex = 0;
    lBoard[3][2].tile!.colorIndex = 0;
    lBoard[4][2].tile!.colorIndex = 0;
    const lMatches = findAllMatches(lBoard);
    expect(lMatches).toHaveLength(1);
    expect(lMatches[0].shape).toBe('match_L');
    expect(lMatches[0].spawnSpecialType).toBe('bomb_3x3');
    expect(lMatches[0].spawnSpecialAt).toEqual({ r: 2, c: 2 });

    // T-shape at intersection (2,3) with color 0: (2,2),(2,3),(2,4) and (3,3),(4,3)
    const tBoard = createPatternBoard(7, 7);
    tBoard[2][2].tile!.colorIndex = 0;
    tBoard[2][3].tile!.colorIndex = 0;
    tBoard[2][4].tile!.colorIndex = 0;
    tBoard[3][3].tile!.colorIndex = 0;
    tBoard[4][3].tile!.colorIndex = 0;
    const tMatches = findAllMatches(tBoard);
    expect(tMatches).toHaveLength(1);
    expect(tMatches[0].shape).toBe('match_T');
    expect(tMatches[0].spawnSpecialType).toBe('bomb_3x3');
    expect(tMatches[0].spawnSpecialAt).toEqual({ r: 2, c: 3 });
  });

  it('M3-SWAP-05: classifies Match-5 line & Match-5 cross as rainbow (colorIndex = -1)', () => {
    const board = createPatternBoard(7, 7);
    // Row 3 cols 1..5 all color 0 via swap (2,3)->(3,3)
    board[3][1].tile!.colorIndex = 0;
    board[3][2].tile!.colorIndex = 0;
    board[2][3].tile!.colorIndex = 0;
    board[3][4].tile!.colorIndex = 0;
    board[3][5].tile!.colorIndex = 0;

    const res = resolveSwap(board, { r: 2, c: 3 }, { r: 3, c: 3 }, 5, seededRandom(21));
    expect(res.valid).toBe(true);
    expect(res.waves[0].spawnedSpecials[0]).toMatchObject({
      coord: { r: 3, c: 3 },
      type: 'rainbow',
      colorIndex: -1,
    });
  });

  it('M3-SWAP-06: drops and collects bottom-row gem carrier cleanly during gravity step', () => {
    const board = createPatternBoard(6, 6);
    // Place gem at (4,2) right above a horizontal match-3 on bottom row (5,1)-(5,2)-(5,3)
    board[4][2].obstacle = 'gem';
    board[4][2].tile = {
      uid: 'gem_1',
      colorIndex: -1,
      special: 'none',
      dropRows: 0,
      isNewSpawn: false,
    };
    // Trigger match of color 0 on bottom row (5,1),(5,2),(5,3) by swapping (5,0) <-> (5,1)
    board[5][0].tile!.colorIndex = 0;
    board[5][2].tile!.colorIndex = 0;
    board[5][3].tile!.colorIndex = 0;

    const res = resolveSwap(board, { r: 5, c: 0 }, { r: 5, c: 1 }, 5, seededRandom(33));
    expect(res.valid).toBe(true);
    expect(res.totalGemsCollected).toBe(1);
    expect(res.waves[0].gemsCollectedCoords).toContainEqual({ r: 5, c: 2 });
    // Gem should no longer remain on the final board
    const anyGemLeft = res.finalBoard.some((row) => row.some((c) => c.obstacle === 'gem'));
    expect(anyGemLeft).toBe(false);
  });
});
