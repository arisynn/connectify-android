import { describe, it, expect } from 'vitest';
import {
  getPath,
  findHint,
  countRemainingMasters,
  countRemainingCells,
} from '@/games/onet/engine/pathfinding';
import {
  createEmptyBoard,
  placeGroup,
  clearMatchedGroups,
  applyGravity,
} from '@/games/onet/engine/boardGenerator';
import {
  computeMatchScore,
  computeVictoryTimeBonus,
  computeOnetFinalScore,
  boardToSnapshot,
  snapshotToBoard,
} from '@/games/onet/engine/onetScoring';
import type { OnetBoard, OnetDirection } from '@/types/onet.types';

function make1x1(
  id: string,
  icon: string,
  openSide: OnetDirection | null = null,
) {
  return {
    id,
    icon,
    themeKey: 'candy',
    rowSpan: 1 as const,
    colSpan: 1 as const,
    openSide,
    splitAxis: 'h' as const,
  };
}

function placeStone(board: OnetBoard, r: number, c: number, id = `stone-${r}-${c}`) {
  board[r][c] = { id, isBlocker: true, obstacleType: 'stone' };
}

describe('Onet Pathfinding, Multi-Cell Rules & Gravity (ONET-PATH-01..07)', () => {
  it('ONET-PATH-01: matches straight 0-turn paths and rejects obstructed straight lines', () => {
    const board = createEmptyBoard(4, 4);
    placeGroup(board, 1, 0, make1x1('a1', 'apple'));
    placeGroup(board, 1, 3, make1x1('a2', 'apple'));

    // Clear interior -> 0 turns
    const clearPath = getPath(board, { r: 1, c: 0 }, { r: 1, c: 3 });
    expect(clearPath).not.toBeNull();
    expect(clearPath!.turns).toBe(0);

    // Block middle with an unmatched tile -> must route around (2 turns via top/bottom)
    placeGroup(board, 1, 1, make1x1('b1', 'banana'));
    const rerouted = getPath(board, { r: 1, c: 0 }, { r: 1, c: 3 });
    expect(rerouted).not.toBeNull();
    expect(rerouted!.turns).toBe(2);

    // Adjacent tiles -> 0 turns
    const adjBoard = createEmptyBoard(3, 3);
    placeGroup(adjBoard, 1, 1, make1x1('x1', 'cherry'));
    placeGroup(adjBoard, 1, 2, make1x1('x2', 'cherry'));
    const adj = getPath(adjBoard, { r: 1, c: 1 }, { r: 1, c: 2 });
    expect(adj).not.toBeNull();
    expect(adj!.turns).toBe(0);
  });

  it('ONET-PATH-02: matches 1-turn L-paths around obstacles', () => {
    const board = createEmptyBoard(4, 4);
    placeGroup(board, 0, 0, make1x1('a1', 'grape'));
    placeGroup(board, 2, 2, make1x1('a2', 'grape'));
    // Block the bottom-left corner (2,0) so only top-right corner (0,2) works in 1 turn
    placeStone(board, 2, 0);

    const res = getPath(board, { r: 0, c: 0 }, { r: 2, c: 2 });
    expect(res).not.toBeNull();
    expect(res!.turns).toBe(1);
    expect(res!.points).toEqual([
      { r: 0, c: 0 },
      { r: 0, c: 2 },
      { r: 2, c: 2 },
    ]);
  });

  it('ONET-PATH-03: matches 2-turn U-paths including outer perimeter lane (-1, cols, rows)', () => {
    const board = createEmptyBoard(3, 4);
    placeGroup(board, 0, 0, make1x1('a1', 'lemon'));
    placeGroup(board, 0, 3, make1x1('a2', 'lemon'));
    // Fill entire row 0 between them and row 1 below them so only outer -1 top lane works
    placeStone(board, 0, 1);
    placeStone(board, 0, 2);
    placeStone(board, 1, 0);
    placeStone(board, 1, 3);

    const outerPath = getPath(board, { r: 0, c: 0 }, { r: 0, c: 3 });
    expect(outerPath).not.toBeNull();
    expect(outerPath!.turns).toBe(2);
    expect(outerPath!.points.some((pt) => pt.r === -1)).toBe(true);
  });

  it('ONET-PATH-04: rejects >=3 turn paths, mismatched icons/footprints, and self-matches', () => {
    // 3+ turn staircase labyrinth
    const board = createEmptyBoard(4, 4);
    placeGroup(board, 1, 1, make1x1('a1', 'melon'));
    placeGroup(board, 2, 2, make1x1('a2', 'melon'));
    // Surround (1,1) on top/left/right and (2,2) on bottom/right/left, leaving only an S-curve (>=3 turns)
    placeStone(board, 0, 1);
    placeStone(board, 1, 0);
    placeStone(board, 1, 2);
    placeStone(board, 2, 1);
    placeStone(board, 2, 3);
    placeStone(board, 3, 2);
    // Block outer bypasses too
    placeStone(board, 0, 2);
    placeStone(board, 3, 1);

    expect(getPath(board, { r: 1, c: 1 }, { r: 2, c: 2 })).toBeNull();

    // Mismatched icons
    const mismatchBoard = createEmptyBoard(2, 2);
    placeGroup(mismatchBoard, 0, 0, make1x1('m1', 'apple'));
    placeGroup(mismatchBoard, 0, 1, make1x1('m2', 'orange'));
    expect(getPath(mismatchBoard, { r: 0, c: 0 }, { r: 0, c: 1 })).toBeNull();

    // Same-tile self match
    expect(getPath(mismatchBoard, { r: 0, c: 0 }, { r: 0, c: 0 })).toBeNull();

    // Mismatched footprint (2x1 vs 1x1 with same icon)
    const fpBoard = createEmptyBoard(4, 4);
    placeGroup(fpBoard, 0, 0, {
      id: 'big',
      icon: 'star',
      themeKey: 'candy',
      rowSpan: 2,
      colSpan: 1,
    });
    placeGroup(fpBoard, 0, 2, make1x1('small', 'star'));
    expect(getPath(fpBoard, { r: 0, c: 0 }, { r: 0, c: 2 })).toBeNull();
    // Clicking slave cell vs own master cell must also fail
    expect(getPath(fpBoard, { r: 0, c: 0 }, { r: 1, c: 0 })).toBeNull();
  });

  it('ONET-PATH-05: enforces openSide directional gating and prevents Bug B1 internal 2x2 bypass', () => {
    const board = createEmptyBoard(6, 6);
    // Place two 2x2 tiles on row 2..3 with openSide = 'left' ONLY on A and 'right' ONLY on B.
    // Put B to the LEFT of A? No: put A at (2, 1..2) open 'left' and B at (2, 4..5) open 'right'.
    // Surround A's top, bottom, and right with stones? Even simpler:
    // A at (1,1)-(2,2) has openSide='up'. Can only leave upward from row 1.
    // Surround row 0 above A? No, block above A except wait — if B1 were present, A could step internally
    // down into its slave cell (2,1) and exit left/down! Let's block ALL paths out of 'up' side of A
    // and keep 'down'/'left'/'right' of A completely open empty air.
    placeGroup(board, 1, 1, {
      id: 'bigA',
      icon: 'cake',
      themeKey: 'candy',
      rowSpan: 2,
      colSpan: 2,
      openSide: 'up',
    });
    placeGroup(board, 1, 4, {
      id: 'bigB',
      icon: 'cake',
      themeKey: 'candy',
      rowSpan: 2,
      colSpan: 2,
      openSide: 'right',
    });

    // Block the ONLY allowed exit cells immediately above bigA: (0,1) and (0,2)
    placeStone(board, 0, 1);
    placeStone(board, 0, 2);

    // Even though cells to the bottom (3,1), (3,2) and left (1,0), (2,0) of bigA are completely empty,
    // bigA has openSide='up' so it MUST NOT route internally through its own body out of any other side.
    expect(getPath(board, { r: 1, c: 1 }, { r: 1, c: 4 })).toBeNull();
    // Also verify clicking a slave cell of bigA does not bypass openSide
    expect(getPath(board, { r: 2, c: 2 }, { r: 2, c: 5 })).toBeNull();

    // Now unblock (0,1) — routing out 'up' into (0,1), wrapping around right edge to bigB's 'right' side works
    board[0][1] = null;
    // Actually from (0,1) going up to (-1,1) -> (-1,6) -> (1,6) -> enter (1,5) takes 3 turns if blocked;
    // make a clean <=2 turn path from 'up' exit of A to 'up' exit of B when both open 'up':
    const okBoard = createEmptyBoard(4, 6);
    placeGroup(okBoard, 1, 0, {
      id: 'gA',
      icon: 'cake',
      themeKey: 'candy',
      rowSpan: 2,
      colSpan: 2,
      openSide: 'up',
    });
    placeGroup(okBoard, 1, 4, {
      id: 'gB',
      icon: 'cake',
      themeKey: 'candy',
      rowSpan: 2,
      colSpan: 2,
      openSide: 'up',
    });
    const allowed = getPath(okBoard, { r: 1, c: 0 }, { r: 1, c: 4 });
    expect(allowed).not.toBeNull();
    expect(allowed!.turns).toBe(2);
  });

  it('ONET-PATH-06: treats stone blockers as impassable and unmatchable', () => {
    const board = createEmptyBoard(3, 3);
    placeStone(board, 0, 0, 's1');
    placeStone(board, 0, 2, 's2');
    expect(getPath(board, { r: 0, c: 0 }, { r: 0, c: 2 })).toBeNull();
    expect(findHint(board)).toBeNull();
    expect(countRemainingMasters(board)).toBe(0);
    expect(countRemainingCells(board)).toBe(0);
  });

  it('ONET-PATH-07: handles 2x2 deterministic splits, multi-cell gravity integrity, scoring & snapshot roundtrip', () => {
    const board = createEmptyBoard(6, 4);
    placeGroup(board, 0, 0, {
      id: 'pair2x2-1',
      icon: 'donut',
      themeKey: 'candy',
      rowSpan: 2,
      colSpan: 2,
      splitAxis: 'h',
    });
    placeGroup(board, 0, 2, {
      id: 'pair2x2-2',
      icon: 'donut',
      themeKey: 'candy',
      rowSpan: 2,
      colSpan: 2,
      splitAxis: 'h',
    });
    placeGroup(board, 3, 0, make1x1('s1', 'candy'));
    placeGroup(board, 3, 1, make1x1('s2', 'candy'));

    const outcome = clearMatchedGroups(board, { r: 0, c: 0 }, { r: 0, c: 2 });
    expect(outcome.action).toBe('split');
    expect(outcome.splitCount).toBe(2);
    expect(outcome.spawnedSplits.map((s) => s.id)).toEqual([
      'pair2x2-1-a',
      'pair2x2-1-b',
      'pair2x2-2-a',
      'pair2x2-2-b',
    ]);
    const topLeft = outcome.board[0][0];
    expect(topLeft && 'icon' in topLeft ? topLeft.id : '').toBe('pair2x2-1-a');
    expect(topLeft && 'rowSpan' in topLeft ? topLeft.rowSpan : 0).toBe(1);
    expect(topLeft && 'colSpan' in topLeft ? topLeft.colSpan : 0).toBe(2);
    const secondChild = outcome.board[1][0];
    expect(secondChild && 'icon' in secondChild ? secondChild.id : '').toBe('pair2x2-1-b');

    // Apply downward gravity -> remaining 1x2 tiles stay on row 0? No, row 1 & 2 below them are null,
    // so they fall cleanly without breaking their 1x2 slave linkage!
    const grav = applyGravity(outcome.board, 'down', 0);
    for (let r = 0; r < grav.board.length; r += 1) {
      for (let c = 0; c < grav.board[r].length; c += 1) {
        const cell = grav.board[r][c];
        if (cell && 'isSlave' in cell && cell.isSlave) {
          const master = grav.board[cell.masterR][cell.masterC];
          expect(master).not.toBeNull();
          expect(master && 'icon' in master).toBe(true);
        }
      }
    }

    // Snapshot roundtrip fidelity
    const snapshot = boardToSnapshot(grav.board);
    const restored = snapshotToBoard(snapshot);
    expect(boardToSnapshot(restored)).toEqual(snapshot);
    expect(restored[0][0]).toMatchObject({
      id: 'pair2x2-1-a',
      icon: 'donut',
      rowSpan: 1,
      colSpan: 2,
    });

    // Scoring math
    const s2x2 = computeMatchScore({ footprint: '2x2', currentCombo: 0, isComboActive: false });
    expect(s2x2.totalPoints).toBe(200);
    const s1x1Combo = computeMatchScore({ footprint: '1x1', currentCombo: 2, isComboActive: true });
    expect(s1x1Combo.totalPoints).toBe(100 + 2 * 15);
    expect(computeVictoryTimeBonus(12_800)).toBe(240);
    const finalRes = computeOnetFinalScore({
      isWinner: true,
      accumulatedScore: 1000,
      remainingTimeMs: 10_000,
      totalTimeMs: 100_000,
      mistakes: 0,
      totalBoostersUsed: 0,
    });
    expect(finalRes.score).toBe(1200);
  });
});
