/**
 * Pure Match 3 Valid-Move Scanner, Hint Ranker & Deadlock Auto-Shuffler.
 * Zero React/DOM/Storage dependencies.
 * Owned by @match3-eng.
 */

import type { GridCoord } from '@/types/game.types';
import type {
  Match3Board,
  Match3Tile,
  MatchShapeType,
  SpecialTileType,
  ValidSwapMove,
} from '@/types/match3.types';
import { shuffleArray, type RngFn } from '@/utils/random';
import { cloneBoard, findAllMatches, isCellSwappable, isInBounds, isSolidBlocker } from './matchDetector';

function isSpecialCombPair(a: SpecialTileType, b: SpecialTileType): boolean {
  if (a === 'rainbow' || b === 'rainbow') return true;
  return a !== 'none' && b !== 'none';
}

function swapTilesInPlace(board: Match3Board, a: GridCoord, b: GridCoord): void {
  const cellA = board[a.r][a.c];
  const cellB = board[b.r][b.c];
  const tmpTile = cellA.tile;
  cellA.tile = cellB.tile;
  cellB.tile = tmpTile;
}

interface LocalEval {
  hasMatch: boolean;
  shape: MatchShapeType;
  bonus: number;
}

function evaluateLocalMatchAt(board: Match3Board, pt: GridCoord): LocalEval {
  const cell = board[pt.r]?.[pt.c];
  if (!cell || cell.isHole || !cell.tile || cell.tile.colorIndex < 0) {
    return { hasMatch: false, shape: 'match_3', bonus: 0 };
  }

  const color = cell.tile.colorIndex;
  const rows = board.length;
  const cols = board[0]?.length ?? 0;

  // Horizontal span
  let hLeft = pt.c;
  while (hLeft - 1 >= 0) {
    const neighbor = board[pt.r][hLeft - 1];
    if (neighbor.isHole || !neighbor.tile || neighbor.tile.colorIndex !== color) break;
    hLeft--;
  }
  let hRight = pt.c;
  while (hRight + 1 < cols) {
    const neighbor = board[pt.r][hRight + 1];
    if (neighbor.isHole || !neighbor.tile || neighbor.tile.colorIndex !== color) break;
    hRight++;
  }
  const hLen = hRight - hLeft + 1;

  // Vertical span
  let vTop = pt.r;
  while (vTop - 1 >= 0) {
    const neighbor = board[vTop - 1][pt.c];
    if (neighbor.isHole || !neighbor.tile || neighbor.tile.colorIndex !== color) break;
    vTop--;
  }
  let vBottom = pt.r;
  while (vBottom + 1 < rows) {
    const neighbor = board[vBottom + 1][pt.c];
    if (neighbor.isHole || !neighbor.tile || neighbor.tile.colorIndex !== color) break;
    vBottom++;
  }
  const vLen = vBottom - vTop + 1;

  if (hLen < 3 && vLen < 3) {
    return { hasMatch: false, shape: 'match_3', bonus: 0 };
  }

  let shape: MatchShapeType = 'match_3';
  if (hLen >= 5 || vLen >= 5) {
    shape = hLen >= 3 && vLen >= 3 ? 'match_5_cross' : 'match_5_line';
  } else if (hLen >= 3 && vLen >= 3) {
    const isCorner = (pt.c === hLeft || pt.c === hRight) && (pt.r === vTop || pt.r === vBottom);
    shape = isCorner ? 'match_L' : 'match_T';
  } else if (hLen === 4) {
    shape = 'match_4_h';
  } else if (vLen === 4) {
    shape = 'match_4_v';
  }

  // Estimate tactical value (obstacles / existing specials nearby)
  let bonus = 0;
  const examineCell = (r: number, c: number) => {
    const target = board[r][c];
    if (target.obstacle === 'ice') bonus += 120;
    if (target.tile && target.tile.special !== 'none') bonus += 90;
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        const obs = board[nr][nc].obstacle;
        if (obs === 'wood' || obs === 'metal-2' || obs === 'metal-1') {
          bonus += 70;
        }
      }
    }
  };

  if (hLen >= 3) {
    for (let c = hLeft; c <= hRight; c++) examineCell(pt.r, c);
  }
  if (vLen >= 3) {
    for (let r = vTop; r <= vBottom; r++) {
      if (hLen >= 3 && r === pt.r) continue;
      examineCell(r, pt.c);
    }
  }

  return { hasMatch: true, shape, bonus };
}

function shapeScore(shape: MatchShapeType): number {
  switch (shape) {
    case 'special_combo':
      return 1200;
    case 'match_5_cross':
    case 'match_5_line':
      return 1000;
    case 'match_L':
    case 'match_T':
      return 750;
    case 'match_4_h':
    case 'match_4_v':
      return 500;
    case 'match_3':
    default:
      return 200;
  }
}

function evaluateSwapCandidate(
  working: Match3Board,
  from: GridCoord,
  to: GridCoord,
): ValidSwapMove | null {
  const cellA = working[from.r]?.[from.c];
  const cellB = working[to.r]?.[to.c];
  if (!isCellSwappable(cellA) || !isCellSwappable(cellB)) return null;

  const tileA = cellA.tile!;
  const tileB = cellB.tile!;

  if (isSpecialCombPair(tileA.special, tileB.special)) {
    const comboBonus =
      tileA.special === 'rainbow' && tileB.special === 'rainbow'
        ? 2000
        : tileA.special === 'rainbow' || tileB.special === 'rainbow'
          ? tileA.special !== 'none' && tileB.special !== 'none'
            ? 1500
            : 950
          : 1100;
    return {
      from,
      to,
      priorityScore: comboBonus,
      expectedShape: 'special_combo',
    };
  }

  // Same color or color-less gems cannot produce a new match
  if (tileA.colorIndex < 0 || tileB.colorIndex < 0 || tileA.colorIndex === tileB.colorIndex) {
    return null;
  }

  swapTilesInPlace(working, from, to);
  const evalA = evaluateLocalMatchAt(working, from);
  const evalB = evaluateLocalMatchAt(working, to);
  swapTilesInPlace(working, from, to);

  if (!evalA.hasMatch && !evalB.hasMatch) {
    return null;
  }

  const scoreA = evalA.hasMatch ? shapeScore(evalA.shape) + evalA.bonus : 0;
  const scoreB = evalB.hasMatch ? shapeScore(evalB.shape) + evalB.bonus : 0;
  const best = scoreA >= scoreB ? evalA : evalB;

  return {
    from,
    to,
    priorityScore: Math.max(scoreA, scoreB) + (evalA.hasMatch && evalB.hasMatch ? 120 : 0),
    expectedShape: best.shape,
  };
}

/**
 * Scans all horizontal & vertical swap pairs on the board in <1ms
 * and returns them sorted highest priority first (for Hint selection).
 */
export function findAllValidSwaps(board: Match3Board): ValidSwapMove[] {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const working = cloneBoard(board);
  const moves: ValidSwapMove[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols) {
        const rightMove = evaluateSwapCandidate(working, { r, c }, { r, c: c + 1 });
        if (rightMove) moves.push(rightMove);
      }
      if (r + 1 < rows) {
        const downMove = evaluateSwapCandidate(working, { r, c }, { r: r + 1, c });
        if (downMove) moves.push(downMove);
      }
    }
  }

  moves.sort((a, b) => b.priorityScore - a.priorityScore);
  return moves;
}

/**
 * Fast boolean check stopping at the first valid swap found.
 */
export function hasValidMoves(board: Match3Board): boolean {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const working = cloneBoard(board);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (c + 1 < cols && evaluateSwapCandidate(working, { r, c }, { r, c: c + 1 })) {
        return true;
      }
      if (r + 1 < rows && evaluateSwapCandidate(working, { r, c }, { r: r + 1, c })) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Attempts to surgically inject a guaranteed 1-swap match into a 2x3 or 3x2 patch
 * of normal unlocked cells without creating an immediate pre-match.
 */
export function injectGuaranteedValidSwap(
  board: Match3Board,
  tileColorCount: 4 | 5 | 6,
  rng: RngFn = Math.random,
): boolean {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;

  const canModify = (r: number, c: number) => {
    if (!isInBounds(board, r, c)) return false;
    const cell = board[r][c];
    return (
      !cell.isHole &&
      cell.obstacle === '' &&
      cell.tile !== null &&
      cell.tile.special === 'none' &&
      cell.tile.colorIndex >= 0
    );
  };

  // Candidate relative shapes: 3 matched target positions after swapping swapFrom -> swapTarget
  // Shape 1 (2x3): [ [A, A, B], [C, C, A] ] -> swapping (0,2) and (1,2) makes row 0 A-A-A
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 2; c++) {
      const patch = [
        { r, c },
        { r, c: c + 1 },
        { r, c: c + 2 },
        { r: r + 1, c: c + 2 },
      ];
      if (!patch.every((p) => canModify(p.r, p.c))) continue;

      const backup = patch.map((p) => board[p.r][p.c].tile!.colorIndex);
      for (let attempt = 0; attempt < tileColorCount; attempt++) {
        const targetColor = (Math.floor(rng() * tileColorCount) + attempt) % tileColorCount;
        const decoyColor = (targetColor + 1) % tileColorCount;

        board[r][c].tile!.colorIndex = targetColor;
        board[r][c + 1].tile!.colorIndex = targetColor;
        board[r][c + 2].tile!.colorIndex = decoyColor;
        board[r + 1][c + 2].tile!.colorIndex = targetColor;

        if (findAllMatches(board).length === 0 && hasValidMoves(board)) {
          return true;
        }
      }

      // Restore if all colors caused accidental adjacent match
      patch.forEach((p, idx) => {
        board[p.r][p.c].tile!.colorIndex = backup[idx];
      });
    }
  }

  // Shape 2 (3x2): [ [A, C], [A, C], [B, A] ] -> swapping (2,0) and (2,1) makes col 0 A-A-A
  for (let r = 0; r < rows - 2; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const patch = [
        { r, c },
        { r: r + 1, c },
        { r: r + 2, c },
        { r: r + 2, c: c + 1 },
      ];
      if (!patch.every((p) => canModify(p.r, p.c))) continue;

      const backup = patch.map((p) => board[p.r][p.c].tile!.colorIndex);
      for (let attempt = 0; attempt < tileColorCount; attempt++) {
        const targetColor = (Math.floor(rng() * tileColorCount) + attempt) % tileColorCount;
        const decoyColor = (targetColor + 1) % tileColorCount;

        board[r][c].tile!.colorIndex = targetColor;
        board[r + 1][c].tile!.colorIndex = targetColor;
        board[r + 2][c].tile!.colorIndex = decoyColor;
        board[r + 2][c + 1].tile!.colorIndex = targetColor;

        if (findAllMatches(board).length === 0 && hasValidMoves(board)) {
          return true;
        }
      }

      patch.forEach((p, idx) => {
        board[p.r][p.c].tile!.colorIndex = backup[idx];
      });
    }
  }

  return false;
}

/**
 * Eliminates any accidental 3-in-a-row runs on non-special normal tiles cleanly.
 */
function scrubInitialMatches(
  board: Match3Board,
  tileColorCount: 4 | 5 | 6,
  rng: RngFn,
): void {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;

  for (let pass = 0; pass < 12; pass++) {
    const matches = findAllMatches(board);
    if (matches.length === 0) return;

    for (const group of matches) {
      // Recolor one middle non-special, non-ice cell in the group
      const targetPt =
        group.cells.find((pt) => {
          const cell = board[pt.r][pt.c];
          return cell.obstacle === '' && cell.tile && cell.tile.special === 'none';
        }) ?? group.cells[Math.floor(group.cells.length / 2)];

      const cell = board[targetPt.r][targetPt.c];
      if (!cell.tile || cell.tile.colorIndex < 0) continue;

      const forbidden = new Set<number>([cell.tile.colorIndex]);
      const neighbors: GridCoord[] = [
        { r: targetPt.r - 1, c: targetPt.c },
        { r: targetPt.r + 1, c: targetPt.c },
        { r: targetPt.r, c: targetPt.c - 1 },
        { r: targetPt.r, c: targetPt.c + 1 },
      ];
      for (const n of neighbors) {
        if (n.r >= 0 && n.r < rows && n.c >= 0 && n.c < cols) {
          const nt = board[n.r][n.c].tile;
          if (nt && nt.colorIndex >= 0) forbidden.add(nt.colorIndex);
        }
      }

      const candidates: number[] = [];
      for (let color = 0; color < tileColorCount; color++) {
        if (!forbidden.has(color)) candidates.push(color);
      }

      if (candidates.length > 0) {
        cell.tile.colorIndex = candidates[Math.floor(rng() * candidates.length)];
      } else {
        cell.tile.colorIndex = (cell.tile.colorIndex + 1) % tileColorCount;
      }
    }
  }
}

/**
 * Shuffles all movable, non-frozen, non-gem tiles while preserving holes, obstacles,
 * gems, and special tiles, guaranteeing zero initial matches and >= 1 valid swap.
 */
export function shuffleMatch3Board(
  board: Match3Board,
  tileColorCount: 4 | 5 | 6,
  rng: RngFn = Math.random,
): Match3Board {
  const working = cloneBoard(board);
  const rows = working.length;
  const cols = working[0]?.length ?? 0;

  const slots: GridCoord[] = [];
  const movableTiles: Match3Tile[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = working[r][c];
      if (
        !cell.isHole &&
        !isSolidBlocker(cell.obstacle) &&
        cell.obstacle !== 'ice' &&
        cell.obstacle !== 'gem' &&
        cell.tile !== null
      ) {
        slots.push({ r, c });
        movableTiles.push({
          ...cell.tile,
          dropRows: 0,
          isNewSpawn: false,
        });
      }
    }
  }

  if (slots.length < 3) {
    return working;
  }

  for (let attempt = 0; attempt < 40; attempt++) {
    const shuffled = shuffleArray(movableTiles, rng);
    slots.forEach((pt, idx) => {
      working[pt.r][pt.c].tile = { ...shuffled[idx] };
    });

    scrubInitialMatches(working, tileColorCount, rng);

    if (findAllMatches(working).length === 0 && hasValidMoves(working)) {
      return working;
    }
  }

  // Fallback surgical swap injection if random shuffles lacked a valid move
  injectGuaranteedValidSwap(working, tileColorCount, rng);
  scrubInitialMatches(working, tileColorCount, rng);
  if (!hasValidMoves(working)) {
    injectGuaranteedValidSwap(working, tileColorCount, rng);
  }

  return working;
}
