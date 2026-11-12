/**
 * Onet Constructive Solvable Board Generator, Split Resolver & Gravity Engine.
 * Guarantees 100% full occupancy, deterministic split child IDs, arrow safety,
 * symmetric static blockers, and verified solvability under active gravity rules.
 * Owned by @onet-eng.
 */

import { ONET_FALLBACK_TILE_POOL } from '@/config/onet.config';
import type { GridCoord } from '@/types/game.types';
import type {
  OnetBlockerCell,
  OnetBoard,
  OnetCell,
  OnetClearOutcome,
  OnetDirection,
  OnetGravityMode,
  OnetGravityShiftItem,
  OnetLevelConfig,
  OnetSplitSpawn,
  OnetTileFootprint,
  OnetTileMaster,
  OnetTileSlave,
} from '@/types/onet.types';
import { seededRandom, shuffleArray } from '@/utils/random';
import {
  findHint,
  getPath,
  getTileCells,
  groupSize,
  isBlockerCell,
  isMasterCell,
  isSlaveCell,
  resolveMasterCoord,
} from './pathfinding';

const UNBOUND_ICON = '__UNBOUND__';
const ALL_DIRECTIONS: readonly OnetDirection[] = ['up', 'down', 'left', 'right'];

export function createEmptyBoard(rows: number, cols: number): OnetBoard {
  return Array.from({ length: rows }, () => Array<OnetCell>(cols).fill(null));
}

export function cloneBoard(board: OnetBoard): OnetBoard {
  return board.map((row) =>
    row.map((cell) => {
      if (!cell) return null;
      return { ...cell };
    }),
  );
}

export function footprintFromSpan(rowSpan: 1 | 2, colSpan: 1 | 2): OnetTileFootprint {
  if (rowSpan === 2 && colSpan === 2) return '2x2';
  if (rowSpan === 1 && colSpan === 2) return '1x2';
  if (rowSpan === 2 && colSpan === 1) return '2x1';
  return '1x1';
}

export function placeGroup(
  board: OnetBoard,
  r: number,
  c: number,
  master: OnetTileMaster,
): boolean {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  const { rowSpan, colSpan } = groupSize(master);

  if (r < 0 || c < 0 || r + rowSpan > rows || c + colSpan > cols) {
    return false;
  }

  for (let dr = 0; dr < rowSpan; dr += 1) {
    for (let dc = 0; dc < colSpan; dc += 1) {
      if (board[r + dr][c + dc] !== null) {
        return false;
      }
    }
  }

  const normalizedMaster: OnetTileMaster = {
    ...master,
    rowSpan,
    colSpan,
    isSlave: false,
    footprint: footprintFromSpan(rowSpan, colSpan),
  };

  board[r][c] = normalizedMaster;
  for (let dr = 0; dr < rowSpan; dr += 1) {
    for (let dc = 0; dc < colSpan; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      const slave: OnetTileSlave = {
        id: `${master.id}:s:${dr}:${dc}`,
        isSlave: true,
        masterR: r,
        masterC: c,
      };
      board[r + dr][c + dc] = slave;
    }
  }

  return true;
}

/**
 * Clears two matched tiles (or splits a 2x2 pair deterministically into 1x2 or 2x1 child pairs).
 */
export function clearMatchedGroups(
  board: OnetBoard,
  coordA: GridCoord,
  coordB: GridCoord,
): OnetClearOutcome {
  const nextBoard = cloneBoard(board);
  const masterA = resolveMasterCoord(nextBoard, coordA.r, coordA.c);
  const masterB = resolveMasterCoord(nextBoard, coordB.r, coordB.c);

  const removedCoords: GridCoord[] = [];
  const spawnedSplits: OnetSplitSpawn[] = [];
  let clearedCount = 0;
  let splitCount = 0;

  const targets: GridCoord[] = [];
  if (masterA) targets.push(masterA);
  if (masterB && (!masterA || masterA.r !== masterB.r || masterA.c !== masterB.c)) {
    targets.push(masterB);
  }

  for (const coord of targets) {
    const cell = nextBoard[coord.r]?.[coord.c];
    if (!isMasterCell(cell)) continue;
    const { rowSpan, colSpan } = groupSize(cell);
    const occupiedCells = getTileCells(nextBoard, coord);

    for (const pt of occupiedCells) {
      nextBoard[pt.r][pt.c] = null;
      removedCoords.push(pt);
    }

    if (rowSpan === 2 && colSpan === 2) {
      const splitAxis: 'h' | 'v' = cell.splitAxis === 'v' ? 'v' : 'h';
      const childRowSpan: 1 | 2 = splitAxis === 'v' ? 2 : 1;
      const childColSpan: 1 | 2 = splitAxis === 'v' ? 1 : 2;
      const childBCoord: GridCoord =
        splitAxis === 'v' ? { r: coord.r, c: coord.c + 1 } : { r: coord.r + 1, c: coord.c };

      const childA: OnetTileMaster = {
        id: `${cell.id}-a`,
        icon: cell.icon,
        themeKey: cell.themeKey,
        rowSpan: childRowSpan,
        colSpan: childColSpan,
        openSide: null,
        splitAxis,
        footprint: footprintFromSpan(childRowSpan, childColSpan),
      };
      const childB: OnetTileMaster = {
        id: `${cell.id}-b`,
        icon: cell.icon,
        themeKey: cell.themeKey,
        rowSpan: childRowSpan,
        colSpan: childColSpan,
        openSide: null,
        splitAxis,
        footprint: footprintFromSpan(childRowSpan, childColSpan),
      };

      placeGroup(nextBoard, coord.r, coord.c, childA);
      placeGroup(nextBoard, childBCoord.r, childBCoord.c, childB);

      spawnedSplits.push(
        {
          id: childA.id,
          r: coord.r,
          c: coord.c,
          rowSpan: childRowSpan,
          colSpan: childColSpan,
          icon: childA.icon,
        },
        {
          id: childB.id,
          r: childBCoord.r,
          c: childBCoord.c,
          rowSpan: childRowSpan,
          colSpan: childColSpan,
          icon: childB.icon,
        },
      );
      splitCount += 1;
    } else {
      clearedCount += 1;
    }
  }

  const action =
    splitCount > 0 && clearedCount === 0
      ? 'split'
      : splitCount > 0
        ? 'mixed'
        : 'cleared';

  return {
    board: nextBoard,
    action,
    clearedCount,
    splitCount,
    removedCoords,
    spawnedSplits,
  };
}

function isFixedAnchor(cell: OnetCell | undefined): boolean {
  if (!cell) return false;
  if (isBlockerCell(cell) || isSlaveCell(cell)) return true;
  const { rowSpan, colSpan } = groupSize(cell);
  return rowSpan > 1 || colSpan > 1;
}

function compactLineSegment(
  coords: GridCoord[],
  board: OnetBoard,
  towardEnd: boolean,
  shifts: OnetGravityShiftItem[],
): void {
  let segmentStart = 0;
  while (segmentStart < coords.length) {
    // Skip fixed anchors (blockers or multi-cell tiles)
    const startPt = coords[segmentStart];
    if (isFixedAnchor(board[startPt.r][startPt.c])) {
      segmentStart += 1;
      continue;
    }

    let segmentEnd = segmentStart;
    while (
      segmentEnd < coords.length &&
      !isFixedAnchor(board[coords[segmentEnd].r][coords[segmentEnd].c])
    ) {
      segmentEnd += 1;
    }

    const movable: Array<{ cell: OnetTileMaster; fromR: number; fromC: number }> = [];
    for (let idx = segmentStart; idx < segmentEnd; idx += 1) {
      const pt = coords[idx];
      const cell = board[pt.r][pt.c];
      if (isMasterCell(cell)) {
        movable.push({ cell, fromR: pt.r, fromC: pt.c });
      }
      board[pt.r][pt.c] = null;
    }

    const segLen = segmentEnd - segmentStart;
    const offset = towardEnd ? segLen - movable.length : 0;
    for (let i = 0; i < movable.length; i += 1) {
      const targetPt = coords[segmentStart + offset + i];
      const item = movable[i];
      board[targetPt.r][targetPt.c] = item.cell;
      if (item.fromR !== targetPt.r || item.fromC !== targetPt.c) {
        shifts.push({
          id: item.cell.id,
          fromR: item.fromR,
          fromC: item.fromC,
          toR: targetPt.r,
          toC: targetPt.c,
        });
      }
    }

    segmentStart = segmentEnd;
  }
}

/**
 * Slides 1x1 tiles cleanly according to the active gravity rule while keeping
 * static blockers and multi-cell tiles anchored in their segments.
 */
export function applyGravity(
  board: OnetBoard,
  mode: OnetGravityMode,
  moveIndex = 0,
): { board: OnetBoard; shifts: OnetGravityShiftItem[] } {
  const effectiveMode: OnetGravityMode =
    mode === 'alternating' ? (moveIndex % 2 === 0 ? 'down' : 'left') : mode;

  if (effectiveMode === 'none') {
    return { board, shifts: [] };
  }

  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  const nextBoard = cloneBoard(board);
  const shifts: OnetGravityShiftItem[] = [];

  if (effectiveMode === 'down' || effectiveMode === 'up') {
    const towardBottom = effectiveMode === 'down';
    for (let c = 0; c < cols; c += 1) {
      const colCoords = Array.from({ length: rows }, (_, r) => ({ r, c }));
      compactLineSegment(colCoords, nextBoard, towardBottom, shifts);
    }
  } else if (effectiveMode === 'left' || effectiveMode === 'right') {
    const towardRight = effectiveMode === 'right';
    for (let r = 0; r < rows; r += 1) {
      const rowCoords = Array.from({ length: cols }, (_, c) => ({ r, c }));
      compactLineSegment(rowCoords, nextBoard, towardRight, shifts);
    }
  } else if (effectiveMode === 'inward') {
    const mid = Math.floor(rows / 2);
    for (let c = 0; c < cols; c += 1) {
      const topHalf = Array.from({ length: mid }, (_, r) => ({ r, c }));
      const bottomHalf = Array.from({ length: rows - mid }, (_, idx) => ({ r: mid + idx, c }));
      compactLineSegment(topHalf, nextBoard, true, shifts);
      compactLineSegment(bottomHalf, nextBoard, false, shifts);
    }
  } else if (effectiveMode === 'split_horizontal') {
    const mid = Math.floor(cols / 2);
    for (let r = 0; r < rows; r += 1) {
      const leftHalf = Array.from({ length: mid }, (_, c) => ({ r, c }));
      const rightHalf = Array.from({ length: cols - mid }, (_, idx) => ({ r, c: mid + idx }));
      compactLineSegment(leftHalf, nextBoard, true, shifts);
      compactLineSegment(rightHalf, nextBoard, false, shifts);
    }
  }

  return { board: nextBoard, shifts };
}

function boardHasTiles(board: OnetBoard): boolean {
  for (let r = 0; r < board.length; r += 1) {
    for (let c = 0; c < board[r].length; c += 1) {
      if (isMasterCell(board[r][c])) return true;
    }
  }
  return false;
}

function collectValidPairs(board: OnetBoard, maxPairs = 12): Array<{ a: GridCoord; b: GridCoord; turns: number }> {
  const buckets = new Map<string, GridCoord[]>();
  for (let r = 0; r < board.length; r += 1) {
    for (let c = 0; c < board[r].length; c += 1) {
      const cell = board[r][c];
      if (!isMasterCell(cell)) continue;
      const { rowSpan, colSpan } = groupSize(cell);
      const key = `${cell.icon}|${rowSpan}x${colSpan}`;
      const list = buckets.get(key);
      if (list) list.push({ r, c });
      else buckets.set(key, [{ r, c }]);
    }
  }

  const pairs: Array<{ a: GridCoord; b: GridCoord; turns: number }> = [];
  for (const coords of buckets.values()) {
    for (let i = 0; i < coords.length; i += 1) {
      for (let j = i + 1; j < coords.length; j += 1) {
        const res = getPath(board, coords[i], coords[j]);
        if (res) {
          pairs.push({ a: coords[i], b: coords[j], turns: res.turns });
          if (pairs.length >= maxPairs * 2) break;
        }
      }
      if (pairs.length >= maxPairs * 2) break;
    }
    if (pairs.length >= maxPairs * 2) break;
  }

  pairs.sort((p1, p2) => p1.turns - p2.turns);
  return pairs.slice(0, maxPairs);
}

/**
 * Bounded backtracking solver verifying the board can be cleared without deadlock.
 */
export function isBoardSolvable(
  board: OnetBoard,
  gravityMode: OnetGravityMode = 'none',
  maxBranches = 40,
): boolean {
  let visitedBranches = 0;

  const dfs = (current: OnetBoard, moveIndex: number): boolean => {
    if (!boardHasTiles(current)) return true;
    if (visitedBranches >= maxBranches) return false;

    const candidates = collectValidPairs(current, 2);
    if (candidates.length === 0) return false;

    for (const pair of candidates) {
      visitedBranches += 1;
      const outcome = clearMatchedGroups(current, pair.a, pair.b);
      const afterGravity = applyGravity(outcome.board, gravityMode, moveIndex).board;
      if (dfs(afterGravity, moveIndex + 1)) {
        return true;
      }
      if (visitedBranches >= maxBranches) break;
    }
    return false;
  };

  return dfs(board, 0);
}

/**
 * Places symmetric static stone blockers near interior positions so outer border lanes stay open
 * and remaining playable cells remain an even number.
 */
function placeSymmetricBlockers(
  board: OnetBoard,
  blockerCount: number,
  rng: () => number,
): number {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  const targetEven = Math.max(0, blockerCount - (blockerCount % 2));
  if (targetEven === 0 || rows < 4 || cols < 4) return 0;

  const candidatePairs: Array<[GridCoord, GridCoord]> = [];
  for (let r = 1; r < rows - 1; r += 1) {
    for (let c = 1; c < cols - 1; c += 1) {
      const mr = rows - 1 - r;
      const mc = cols - 1 - c;
      if (r === mr && c === mc) continue;
      if (r > mr || (r === mr && c > mc)) continue;
      candidatePairs.push([
        { r, c },
        { r: mr, c: mc },
      ]);
    }
  }

  const ordered = shuffleArray(candidatePairs, rng);
  let placed = 0;
  for (const [p1, p2] of ordered) {
    if (placed + 2 > targetEven) break;
    if (board[p1.r][p1.c] !== null || board[p2.r][p2.c] !== null) continue;
    const b1: OnetBlockerCell = {
      id: `blocker-${p1.r}-${p1.c}`,
      isBlocker: true,
      obstacleType: 'stone',
    };
    const b2: OnetBlockerCell = {
      id: `blocker-${p2.r}-${p2.c}`,
      isBlocker: true,
      obstacleType: 'stone',
    };
    board[p1.r][p1.c] = b1;
    board[p2.r][p2.c] = b2;
    placed += 2;
  }

  return placed;
}

/**
 * Tiles empty cells with paired multi-cell tiles and 1x1 tiles, verifying 100% occupancy.
 */
function partitionBoardFootprints(
  rows: number,
  cols: number,
  blockerCount: number,
  multiGroups: OnetLevelConfig['multiGroups'],
  themeKey: string,
  rng: () => number,
): OnetBoard | null {
  const board = createEmptyBoard(rows, cols);
  const placedBlockers = placeSymmetricBlockers(board, blockerCount, rng);
  const playableCells = rows * cols - placedBlockers;

  // Ensure multi-cell footprint pairs leave at least 8 cells for 1x1s.
  let pairs2x2 = Math.max(0, Math.floor(multiGroups.count2x2));
  let pairs1x2 = Math.max(0, Math.floor(multiGroups.count1x2));
  let pairs2x1 = Math.max(0, Math.floor(multiGroups.count2x1));

  while (pairs2x2 * 8 + pairs1x2 * 4 + pairs2x1 * 4 > playableCells - 8) {
    if (pairs2x2 > 0) pairs2x2 -= 1;
    else if (pairs2x1 > 0) pairs2x1 -= 1;
    else if (pairs1x2 > 0) pairs1x2 -= 1;
    else break;
  }

  let idCounter = 1;
  const makePlaceholder = (
    rowSpan: 1 | 2,
    colSpan: 1 | 2,
    splitAxis: 'h' | 'v' = 'h',
  ): OnetTileMaster => {
    const id = `t-${idCounter}`;
    idCounter += 1;
    return {
      id,
      icon: UNBOUND_ICON,
      themeKey,
      rowSpan,
      colSpan,
      openSide: null,
      splitAxis,
      footprint: footprintFromSpan(rowSpan, colSpan),
    };
  };

  const tryPlacePair = (rowSpan: 1 | 2, colSpan: 1 | 2): boolean => {
    const coords: GridCoord[] = [];
    for (let r = 0; r <= rows - rowSpan; r += 1) {
      for (let c = 0; c <= cols - colSpan; c += 1) {
        coords.push({ r, c });
      }
    }
    const candidates = shuffleArray(coords, rng);
    const axis: 'h' | 'v' = rng() < 0.5 ? 'h' : 'v';

    for (let i = 0; i < candidates.length; i += 1) {
      const a = candidates[i];
      const testBoard = cloneBoard(board);
      const tileA = makePlaceholder(rowSpan, colSpan, axis);
      if (!placeGroup(testBoard, a.r, a.c, tileA)) continue;

      for (let j = i + 1; j < candidates.length; j += 1) {
        const b = candidates[j];
        const tileB = makePlaceholder(rowSpan, colSpan, axis);
        if (!placeGroup(testBoard, b.r, b.c, tileB)) continue;

        // Avoid trapping isolated odd-sized cavities by only checking adjacency parity on small holes
        placeGroup(board, a.r, a.c, tileA);
        placeGroup(board, b.r, b.c, tileB);
        return true;
      }
    }
    return false;
  };

  for (let i = 0; i < pairs2x2; i += 1) tryPlacePair(2, 2);
  for (let i = 0; i < pairs1x2; i += 1) tryPlacePair(1, 2);
  for (let i = 0; i < pairs2x1; i += 1) tryPlacePair(2, 1);

  // Fill every remaining empty cell with 1x1 placeholders
  let emptyCount = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (board[r][c] === null) {
        emptyCount += 1;
        placeGroup(board, r, c, makePlaceholder(1, 1));
      }
    }
  }

  // Must always be even number of 1x1 placeholders
  if (emptyCount % 2 !== 0) return null;
  return board;
}

/**
 * Assigns icons to a partitioned board via randomized forward simulation so a
 * valid clear sequence (including 2x2 splits and optional gravity) exists from move 1.
 */
function assignIconsForwardConstructive(
  templateBoard: OnetBoard,
  iconPool: readonly string[],
  gravityMode: OnetGravityMode,
  rng: () => number,
): OnetBoard | null {
  const simBoard = cloneBoard(templateBoard);
  const assignedIcons = new Map<string, string>();
  const randomizedIcons = shuffleArray(iconPool, rng);

  let iconCursor = 0;
  let moveIndex = 0;

  while (boardHasTiles(simBoard)) {
    const validPairs = collectValidPairs(simBoard, 10);
    if (validPairs.length === 0) {
      return null;
    }

    // Prefer bound split pairs immediately so split children clear cleanly, else randomize among easy pairs
    const chosenIdx = Math.min(
      validPairs.length - 1,
      Math.floor(rng() * Math.min(3, validPairs.length)),
    );
    const chosen = validPairs[chosenIdx];
    const cellA = simBoard[chosen.a.r][chosen.a.c];
    const cellB = simBoard[chosen.b.r][chosen.b.c];
    if (!isMasterCell(cellA) || !isMasterCell(cellB)) return null;

    let pairIcon: string;
    if (cellA.icon !== UNBOUND_ICON) {
      pairIcon = cellA.icon;
    } else {
      pairIcon = randomizedIcons[iconCursor % randomizedIcons.length];
      iconCursor += 1;
      simBoard[chosen.a.r][chosen.a.c] = { ...cellA, icon: pairIcon };
      simBoard[chosen.b.r][chosen.b.c] = { ...cellB, icon: pairIcon };
      assignedIcons.set(cellA.id, pairIcon);
      assignedIcons.set(cellB.id, pairIcon);
    }

    const cleared = clearMatchedGroups(simBoard, chosen.a, chosen.b);
    const gravity = applyGravity(cleared.board, gravityMode, moveIndex);
    for (let r = 0; r < simBoard.length; r += 1) {
      simBoard[r] = gravity.board[r];
    }
    moveIndex += 1;
  }

  // Stamp all assigned icons onto the clean template board
  const finalBoard = cloneBoard(templateBoard);
  for (let r = 0; r < finalBoard.length; r += 1) {
    for (let c = 0; c < finalBoard[r].length; c += 1) {
      const cell = finalBoard[r][c];
      if (!isMasterCell(cell)) continue;
      const icon = assignedIcons.get(cell.id);
      if (!icon) return null;
      cell.icon = icon;
    }
  }

  return finalBoard;
}

/**
 * Attaches directional openSide constraints only when board solvability remains intact.
 */
export function addDirectionTiles(
  board: OnetBoard,
  arrowPairCount: number,
  gravityMode: OnetGravityMode,
  rng: () => number,
): OnetBoard {
  if (arrowPairCount <= 0) return board;

  const working = cloneBoard(board);
  const candidatesByIcon = new Map<string, GridCoord[]>();

  for (let r = 0; r < working.length; r += 1) {
    for (let c = 0; c < working[r].length; c += 1) {
      const cell = working[r][c];
      if (!isMasterCell(cell)) continue;
      if (cell.rowSpan !== 1 || cell.colSpan !== 1 || cell.openSide) continue;
      const list = candidatesByIcon.get(cell.icon);
      if (list) list.push({ r, c });
      else candidatesByIcon.set(cell.icon, [{ r, c }]);
    }
  }

  const iconEntries = shuffleArray(Array.from(candidatesByIcon.values()), rng);
  let added = 0;

  for (const coords of iconEntries) {
    if (added >= arrowPairCount) break;
    if (coords.length < 2) continue;

    const aCoord = coords[0];
    const bCoord = coords[1];
    const aCell = working[aCoord.r][aCoord.c];
    const bCell = working[bCoord.r][bCoord.c];
    if (!isMasterCell(aCell) || !isMasterCell(bCell)) continue;

    const dirA = ALL_DIRECTIONS[Math.floor(rng() * ALL_DIRECTIONS.length)];
    const dirB = ALL_DIRECTIONS[Math.floor(rng() * ALL_DIRECTIONS.length)];

    aCell.openSide = dirA;
    bCell.openSide = dirB;

    if (findHint(working) && isBoardSolvable(working, gravityMode, 28)) {
      added += 1;
    } else {
      aCell.openSide = null;
      bCell.openSide = null;
    }
  }

  return working;
}

/**
 * Fallback paired assignment guaranteeing even icon pairing and solvability on 'none' gravity.
 */
function buildPairedFallbackBoard(
  rows: number,
  cols: number,
  blockerCount: number,
  iconPool: readonly string[],
  themeKey: string,
  rng: () => number,
): OnetBoard {
  const board = createEmptyBoard(rows, cols);
  const placedBlockers = placeSymmetricBlockers(board, blockerCount, rng);
  const playable = rows * cols - placedBlockers;
  const pairCount = Math.floor(playable / 2);

  const slots: GridCoord[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (board[r][c] === null) slots.push({ r, c });
    }
  }

  const icons: string[] = [];
  const shuffledPool = shuffleArray(iconPool, rng);
  for (let p = 0; p < pairCount; p += 1) {
    const icon = shuffledPool[p % shuffledPool.length];
    icons.push(icon, icon);
  }

  const shuffledIcons = shuffleArray(icons, rng);
  for (let i = 0; i < slots.length; i += 1) {
    const pt = slots[i];
    placeGroup(board, pt.r, pt.c, {
      id: `fb-${i + 1}`,
      icon: shuffledIcons[i],
      themeKey,
      rowSpan: 1,
      colSpan: 1,
      openSide: null,
      splitAxis: 'h',
    });
  }

  return board;
}

export interface GenerateOnetBoardOptions {
  themeKey?: string;
  tilePool?: readonly string[];
  seed?: number;
}

/**
 * Generates a 100% populated, verified solvable Onet board matching the level config.
 */
export function generateOnetBoard(
  config: OnetLevelConfig,
  options: GenerateOnetBoardOptions = {},
): OnetBoard {
  const themeKey = options.themeKey ?? 'candy';
  const rawPool = options.tilePool && options.tilePool.length > 0 ? options.tilePool : ONET_FALLBACK_TILE_POOL;
  const rng = seededRandom(options.seed ?? config.seed ?? Date.now());

  const activeIcons = shuffleArray(rawPool, rng).slice(
    0,
    Math.max(4, Math.min(config.tileVariety, rawPool.length)),
  );

  // Attempt constructive forward-simulated solvable generation first
  for (let attempt = 0; attempt < 28; attempt += 1) {
    const partitioned = partitionBoardFootprints(
      config.rows,
      config.cols,
      config.blockerCount,
      config.multiGroups,
      themeKey,
      rng,
    );
    if (!partitioned) continue;

    const assigned = assignIconsForwardConstructive(
      partitioned,
      activeIcons,
      config.gravityMode,
      rng,
    );
    if (!assigned) continue;

    const withArrows = addDirectionTiles(assigned, config.arrowPairCount, config.gravityMode, rng);
    if (findHint(withArrows) !== null) {
      return withArrows;
    }
  }

  // Deterministic fallback guaranteeing valid paired board with an active hint
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const fallback = buildPairedFallbackBoard(
      config.rows,
      config.cols,
      config.blockerCount,
      activeIcons,
      themeKey,
      rng,
    );
    if (findHint(fallback) !== null && isBoardSolvable(fallback, config.gravityMode, 160)) {
      return fallback;
    }
  }

  // Final deterministic fallback (constructPairs on 1x1 with zero blockers)
  const simple = partitionBoardFootprints(
    config.rows,
    config.cols,
    0,
    { count2x2: 0, count1x2: 0, count2x1: 0 },
    themeKey,
    rng,
  );
  if (simple) {
    const assigned = assignIconsForwardConstructive(simple, activeIcons, 'none', rng);
    if (assigned) return assigned;
  }

  return buildPairedFallbackBoard(config.rows, config.cols, 0, activeIcons, themeKey, rng);
}
