import { describe, it, expect } from 'vitest';
import { resolveSwap, resolveBoosterImpact, createTileUidFactory } from '@/games/match3/engine/cascadeResolver';
import { getCascadeMultiplier } from '@/games/match3/engine/match3Scoring';
import { resolveSpecialSwapCombo } from '@/games/match3/engine/specialTiles';
import { MATCH3_SCORING_CONFIG } from '@/config/match3.config';
import { seededRandom } from '@/utils/random';
import type { Match3Board, ObstacleType, SpecialTileType } from '@/types/match3.types';

function makeBoard(rows = 7, cols = 7, colorCount = 5): Match3Board {
  const uid = createTileUidFactory('sp');
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
          colorIndex: (r * 2 + c) % colorCount,
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

describe('Match 3 Special Combos, Chain Reactions, Obstacles & Cascade Determinism (M3-SPEC-01..05)', () => {
  it('M3-SPEC-01: verifies all 7 Special+Special & Rainbow+Tile swap fusions', () => {
    // 1. line_line -> 1 full row + 1 full col
    const bLine = makeBoard(7, 7);
    bLine[3][2].tile!.special = 'striped_h';
    bLine[3][3].tile!.special = 'striped_v';
    const rLine = resolveSwap(bLine, { r: 3, c: 2 }, { r: 3, c: 3 }, 5, seededRandom(1));
    expect(rLine.valid).toBe(true);
    expect(rLine.isSpecialCombo).toBe(true);
    expect(rLine.waves[0].blastedCoords.length).toBeGreaterThanOrEqual(13);

    // 2. line_bomb -> 3 rows + 3 cols (7x7: 3*7 + 3*7 - 9 = 33 cells)
    const bLB = makeBoard(7, 7);
    bLB[3][2].tile!.special = 'striped_h';
    bLB[3][3].tile!.special = 'bomb_3x3';
    const rLB = resolveSwap(bLB, { r: 3, c: 2 }, { r: 3, c: 3 }, 5, seededRandom(2));
    expect(rLB.valid).toBe(true);
    expect(rLB.waves[0].blastedCoords.length).toBeGreaterThanOrEqual(33);

    // 3. bomb_bomb -> 5x5 blast + inner 3x3 doubleDamageCoords cracking metal-2 in 1 turn!
    const bBB = makeBoard(7, 7);
    bBB[3][2].tile!.special = 'bomb_3x3';
    bBB[3][3].tile!.special = 'bomb_3x3';
    // Put metal-2 inside inner 3x3 around target (3,3), e.g., at (2,3)
    bBB[2][3].obstacle = 'metal-2';
    bBB[2][3].tile = null;
    const planBB = resolveSpecialSwapCombo(bBB, { r: 3, c: 2 }, { r: 3, c: 3 });
    expect(planBB.comboKey).toBe('bomb_bomb');
    expect(planBB.affectedCoords).toHaveLength(25);
    expect(planBB.doubleDamageCoords).toHaveLength(9);

    const rBB = resolveSwap(bBB, { r: 3, c: 2 }, { r: 3, c: 3 }, 5, seededRandom(3));
    expect(rBB.metalDestroyed).toBe(1);
    expect(rBB.finalBoard[2][3].obstacle).toBe('');

    // 4. rainbow_color -> purges all tiles of the swapped tile's color
    const bRC = makeBoard(7, 7);
    bRC[3][2].tile!.special = 'rainbow';
    bRC[3][2].tile!.colorIndex = -1;
    const targetColor = bRC[3][3].tile!.colorIndex;
    const planRC = resolveSpecialSwapCombo(bRC, { r: 3, c: 2 }, { r: 3, c: 3 });
    expect(planRC.comboKey).toBe('rainbow_color');
    expect(planRC.rainbowTargets.every((pt) => bRC[pt.r][pt.c].tile?.colorIndex === targetColor)).toBe(true);

    // 5. rainbow_line
    const bRL = makeBoard(7, 7);
    bRL[3][2].tile!.special = 'rainbow';
    bRL[3][2].tile!.colorIndex = -1;
    bRL[3][3].tile!.special = 'striped_h';
    const planRL = resolveSpecialSwapCombo(bRL, { r: 3, c: 2 }, { r: 3, c: 3 });
    expect(planRL.comboKey).toBe('rainbow_line');
    expect(planRL.affectedCoords.length).toBeGreaterThan(20);

    // 6. rainbow_bomb
    const bRB = makeBoard(7, 7);
    bRB[3][2].tile!.special = 'rainbow';
    bRB[3][2].tile!.colorIndex = -1;
    bRB[3][3].tile!.special = 'bomb_3x3';
    const planRB = resolveSpecialSwapCombo(bRB, { r: 3, c: 2 }, { r: 3, c: 3 });
    expect(planRB.comboKey).toBe('rainbow_bomb');
    expect(planRB.affectedCoords.length).toBeGreaterThan(25);

    // 7. rainbow_rainbow -> clears entire playable board (excluding holes)
    const bRR = makeBoard(7, 7);
    bRR[0][0].isHole = true;
    bRR[0][0].tile = null;
    bRR[3][2].tile!.special = 'rainbow';
    bRR[3][2].tile!.colorIndex = -1;
    bRR[3][3].tile!.special = 'rainbow';
    bRR[3][3].tile!.colorIndex = -1;
    const rRR = resolveSwap(bRR, { r: 3, c: 2 }, { r: 3, c: 3 }, 5, seededRandom(4));
    expect(rRR.waves[0].blastedCoords).toHaveLength(48);
  });

  it('M3-SPEC-02: resolves recursive BFS special chain reactions cleanly without loops', () => {
    const board = makeBoard(7, 7, 5);
    // Match 3 in row 1 (1,0),(1,1),(1,2) via swap (1,3)->(1,2); include striped_v at (1,0)
    // which hits bomb_3x3 at (4,0), which hits striped_h at (5,1)
    board[1][0].tile!.colorIndex = 0;
    board[1][0].tile!.special = 'striped_v';
    board[1][1].tile!.colorIndex = 0;
    board[1][2].tile!.colorIndex = 4;
    board[1][3].tile!.colorIndex = 0;
    board[0][2].tile!.colorIndex = 2;
    board[2][2].tile!.colorIndex = 3;

    board[4][0].tile!.special = 'bomb_3x3';
    board[5][1].tile!.special = 'striped_h';

    const res = resolveSwap(board, { r: 1, c: 3 }, { r: 1, c: 2 }, 5, seededRandom(15));
    expect(res.valid).toBe(true);
    const triggeredTypes = res.waves[0].triggeredSpecials.map((s) => s.type);
    expect(triggeredTypes).toContain('striped_v');
    expect(triggeredTypes).toContain('bomb_3x3');
    expect(triggeredTypes).toContain('striped_h');
    // Entire row 5 must have been cleared by the chained striped_h
    for (let c = 0; c < 7; c++) {
      expect(res.waves[0].blastedCoords).toContainEqual({ r: 5, c });
    }
  });

  it('M3-SPEC-03: computes cascade score multipliers (1.0x..4.0x cap), obstacle damage & booster strikes', () => {
    expect(getCascadeMultiplier(0)).toBe(1);
    expect(getCascadeMultiplier(1)).toBe(1.25);
    expect(getCascadeMultiplier(2)).toBe(1.5);
    expect(getCascadeMultiplier(20)).toBe(MATCH3_SCORING_CONFIG.cascadeMultiplierMax);
    expect(getCascadeMultiplier(20)).toBe(4);

    // Hammer 1x1 chips metal-2 -> metal-1 on first hit, then clears metal-1 on second hit
    const board = makeBoard(7, 7, 5);
    board[3][3].obstacle = 'metal-2';
    board[3][3].tile = null;
    board[3][4].obstacle = 'wood';
    board[3][4].tile = null;

    const hammer1 = resolveBoosterImpact(board, { r: 3, c: 3 }, 'hammer', 5, seededRandom(55));
    expect(hammer1.valid).toBe(true);
    expect(hammer1.finalBoard[3][3].obstacle).toBe('metal-1');
    expect(hammer1.finalBoard[3][3].tile).toBeNull();

    const hammer2 = resolveBoosterImpact(hammer1.finalBoard, { r: 3, c: 3 }, 'hammer', 5, seededRandom(56));
    expect(hammer2.metalDestroyed).toBe(1);
    expect(hammer2.finalBoard[3][3].obstacle).toBe('');
    expect(hammer2.finalBoard[3][3].tile).not.toBeNull();

    // Bomb 3x3 destroys adjacent wood and surrounding tiles
    const bombRes = resolveBoosterImpact(board, { r: 3, c: 4 }, 'bomb', 5, seededRandom(57));
    expect(bombRes.woodDestroyed).toBe(1);
    expect(bombRes.finalBoard[3][4].obstacle).toBe('');
  });

  it('M3-SPEC-04: gravity and refill preserve holes/solid blockers and leave zero empty playable cells', () => {
    const board = makeBoard(8, 8, 5);
    // Cutout hole at (3,3) and solid stone at (2,4)
    board[3][3].isHole = true;
    board[3][3].tile = null;
    board[2][4].obstacle = 'stone';
    board[2][4].tile = null;

    // Trigger rainbow supernova or hammer across board and check invariants
    const res = resolveBoosterImpact(board, { r: 4, c: 4 }, 'bomb', 5, seededRandom(77));
    expect(res.cascadeCount).toBeLessThanOrEqual(MATCH3_SCORING_CONFIG.maxCascadeIterations);

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = res.finalBoard[r][c];
        if (r === 3 && c === 3) {
          expect(cell.isHole).toBe(true);
          expect(cell.tile).toBeNull();
        } else if (r === 2 && c === 4 && cell.obstacle === 'stone') {
          expect(cell.tile).toBeNull();
        } else {
          expect(cell.tile).not.toBeNull();
        }
      }
    }
  });

  it('M3-SPEC-05: seeded resolveSwap execution is bit-identical across runs', () => {
    const board = makeBoard(7, 7, 5);
    board[3][0].tile!.colorIndex = 1;
    board[3][1].tile!.colorIndex = 1;
    board[3][2].tile!.colorIndex = 4;
    board[3][3].tile!.colorIndex = 1;
    board[2][2].tile!.colorIndex = 2;
    board[4][2].tile!.colorIndex = 3;

    const r1 = resolveSwap(
      board,
      { r: 3, c: 3 },
      { r: 3, c: 2 },
      5,
      seededRandom(98765),
      createTileUidFactory('det'),
    );
    const r2 = resolveSwap(
      board,
      { r: 3, c: 3 },
      { r: 3, c: 2 },
      5,
      seededRandom(98765),
      createTileUidFactory('det'),
    );

    expect(r1.totalScoreDelta).toBe(r2.totalScoreDelta);
    expect(r1.cascadeCount).toBe(r2.cascadeCount);
    expect(r1.finalBoard).toEqual(r2.finalBoard);
  });
});
