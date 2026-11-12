/**
 * Pure Match 3 Swap Validation & Match-3/4/5/L/T Pattern Classifier.
 * Zero React/DOM/Storage dependencies.
 * Owned by @match3-eng.
 */

import type { GridCoord } from '@/types/game.types';
import type {
  Match3Board,
  Match3Cell,
  Match3Phase,
  MatchGroup,
  MatchShapeType,
  ObstacleType,
  SpecialTileType,
} from '@/types/match3.types';

export type SwapRejectReason =
  | 'INPUT_LOCKED'
  | 'OUT_OF_BOUNDS'
  | 'NOT_ADJACENT'
  | 'BLOCKED_CELL'
  | 'IMMOVABLE_TILE'
  | 'NO_MATCH';

export interface SwapValidationResult {
  valid: boolean;
  reason?: SwapRejectReason;
  isSpecialCombo?: boolean;
  specialComboType?: string;
  matches?: MatchGroup[];
}

interface LineRun {
  orientation: 'h' | 'v';
  colorIndex: number;
  cells: GridCoord[];
}

export const SOLID_BLOCKERS: ReadonlySet<ObstacleType> = new Set([
  'wood',
  'metal-2',
  'metal-1',
  'stone',
]);

export function isSolidBlocker(obstacle: ObstacleType): boolean {
  return SOLID_BLOCKERS.has(obstacle);
}

export function isCellSwappable(cell: Match3Cell | undefined): boolean {
  if (!cell || cell.isHole || !cell.tile) return false;
  if (cell.obstacle === 'ice' || isSolidBlocker(cell.obstacle)) return false;
  return true;
}

export function cloneBoard(board: Match3Board): Match3Board {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      tile: cell.tile ? { ...cell.tile } : null,
    })),
  );
}

export function isInBounds(board: Match3Board, r: number, c: number): boolean {
  return r >= 0 && r < board.length && c >= 0 && c < (board[0]?.length ?? 0);
}

function getSpecialComboLabel(a: SpecialTileType, b: SpecialTileType): string | null {
  if (a === 'rainbow' && b === 'rainbow') return 'rainbow_rainbow';
  if (a === 'rainbow' || b === 'rainbow') {
    const other = a === 'rainbow' ? b : a;
    if (other === 'bomb_3x3') return 'rainbow_bomb';
    if (other === 'striped_h' || other === 'striped_v') return 'rainbow_line';
    return 'rainbow_color';
  }
  if (a !== 'none' && b !== 'none') {
    if (a === 'bomb_3x3' && b === 'bomb_3x3') return 'bomb_bomb';
    if (a === 'bomb_3x3' || b === 'bomb_3x3') return 'line_bomb';
    return 'line_line';
  }
  return null;
}

/**
 * Scans all horizontal and vertical runs of >= 3 matching colorIndex tiles,
 * merges intersecting runs of the same color into connected MatchGroups,
 * and classifies each cluster into match_3 / match_4_h / match_4_v / match_L / match_T / match_5_line / match_5_cross.
 */
export function findAllMatches(
  board: Match3Board,
  focalCoords: GridCoord[] = [],
): MatchGroup[] {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  if (rows === 0 || cols === 0) return [];

  const runs: LineRun[] = [];

  // 1. Horizontal runs
  for (let r = 0; r < rows; r++) {
    let c = 0;
    while (c < cols) {
      const cell = board[r][c];
      const color = !cell.isHole && cell.tile && cell.tile.colorIndex >= 0 ? cell.tile.colorIndex : -1;
      if (color < 0) {
        c++;
        continue;
      }
      let end = c + 1;
      while (end < cols) {
        const next = board[r][end];
        const nextColor =
          !next.isHole && next.tile && next.tile.colorIndex >= 0 ? next.tile.colorIndex : -1;
        if (nextColor !== color) break;
        end++;
      }
      if (end - c >= 3) {
        const cells: GridCoord[] = [];
        for (let k = c; k < end; k++) cells.push({ r, c: k });
        runs.push({ orientation: 'h', colorIndex: color, cells });
      }
      c = end;
    }
  }

  // 2. Vertical runs
  for (let c = 0; c < cols; c++) {
    let r = 0;
    while (r < rows) {
      const cell = board[r][c];
      const color = !cell.isHole && cell.tile && cell.tile.colorIndex >= 0 ? cell.tile.colorIndex : -1;
      if (color < 0) {
        r++;
        continue;
      }
      let end = r + 1;
      while (end < rows) {
        const next = board[end][c];
        const nextColor =
          !next.isHole && next.tile && next.tile.colorIndex >= 0 ? next.tile.colorIndex : -1;
        if (nextColor !== color) break;
        end++;
      }
      if (end - r >= 3) {
        const cells: GridCoord[] = [];
        for (let k = r; k < end; k++) cells.push({ r: k, c });
        runs.push({ orientation: 'v', colorIndex: color, cells });
      }
      r = end;
    }
  }

  if (runs.length === 0) return [];

  // 3. Merge intersecting runs of the same color into connected clusters
  const runCellSets = runs.map((run) => new Set(run.cells.map((p) => `${p.r}:${p.c}`)));
  const visited = new Array<boolean>(runs.length).fill(false);
  const groups: MatchGroup[] = [];

  for (let i = 0; i < runs.length; i++) {
    if (visited[i]) continue;
    visited[i] = true;
    const queue = [i];
    const clusterRuns: LineRun[] = [];

    while (queue.length > 0) {
      const idx = queue.shift()!;
      const currentRun = runs[idx];
      clusterRuns.push(currentRun);

      for (let j = 0; j < runs.length; j++) {
        if (visited[j] || runs[j].colorIndex !== currentRun.colorIndex) continue;
        // Check if runs[i]/currentRun share any coordinate
        let sharesCell = false;
        for (const key of runCellSets[idx]) {
          if (runCellSets[j].has(key)) {
            sharesCell = true;
            break;
          }
        }
        if (sharesCell) {
          visited[j] = true;
          queue.push(j);
        }
      }
    }

    // Collect deduplicated cells and track H/V membership per cell
    const cellMap = new Map<string, GridCoord>();
    const hSet = new Set<string>();
    const vSet = new Set<string>();
    let maxH = 0;
    let maxV = 0;
    let longestRun: LineRun = clusterRuns[0];

    for (const run of clusterRuns) {
      if (run.cells.length > longestRun.cells.length) {
        longestRun = run;
      }
      if (run.orientation === 'h') {
        maxH = Math.max(maxH, run.cells.length);
        for (const pt of run.cells) {
          const k = `${pt.r}:${pt.c}`;
          cellMap.set(k, pt);
          hSet.add(k);
        }
      } else {
        maxV = Math.max(maxV, run.cells.length);
        for (const pt of run.cells) {
          const k = `${pt.r}:${pt.c}`;
          cellMap.set(k, pt);
          vSet.add(k);
        }
      }
    }

    const intersections: GridCoord[] = [];
    for (const [k, pt] of cellMap.entries()) {
      if (hSet.has(k) && vSet.has(k)) intersections.push(pt);
    }

    let shape: MatchShapeType = 'match_3';
    let spawnSpecialType: SpecialTileType = 'none';

    if (maxH >= 5 || maxV >= 5) {
      shape = intersections.length > 0 ? 'match_5_cross' : 'match_5_line';
      spawnSpecialType = 'rainbow';
    } else if (maxH >= 3 && maxV >= 3) {
      // Distinguish L vs T by whether the intersection sits at the end of both runs or interior of at least one
      const inter = intersections[0];
      const isCorner =
        inter !== undefined &&
        clusterRuns.every((run) => {
          const first = run.cells[0];
          const last = run.cells[run.cells.length - 1];
          return (
            (first.r === inter.r && first.c === inter.c) ||
            (last.r === inter.r && last.c === inter.c)
          );
        });
      shape = isCorner ? 'match_L' : 'match_T';
      spawnSpecialType = 'bomb_3x3';
    } else if (maxH === 4) {
      shape = 'match_4_h';
      spawnSpecialType = 'striped_v';
    } else if (maxV === 4) {
      shape = 'match_4_v';
      spawnSpecialType = 'striped_h';
    }

    let spawnSpecialAt: GridCoord | null = null;
    if (spawnSpecialType !== 'none') {
      // Prefer the player's swap focal coordinate if inside this cluster
      for (const focal of focalCoords) {
        if (cellMap.has(`${focal.r}:${focal.c}`)) {
          spawnSpecialAt = { r: focal.r, c: focal.c };
          break;
        }
      }
      if (!spawnSpecialAt) {
        if (intersections.length > 0) {
          spawnSpecialAt = { ...intersections[0] };
        } else {
          const midIdx = Math.floor((longestRun.cells.length - 1) / 2);
          spawnSpecialAt = { ...longestRun.cells[midIdx] };
        }
      }
    }

    groups.push({
      shape,
      colorIndex: clusterRuns[0].colorIndex,
      cells: Array.from(cellMap.values()),
      spawnSpecialAt,
      spawnSpecialType,
    });
  }

  return groups;
}

/**
 * Validates whether swapping `from` and `to` is legal under Match 3 rules.
 * Does NOT mutate the input board.
 */
export function validateSwap(
  board: Match3Board,
  from: GridCoord,
  to: GridCoord,
  phase?: Match3Phase,
): SwapValidationResult {
  if (phase !== undefined && phase !== 'idle') {
    return { valid: false, reason: 'INPUT_LOCKED' };
  }

  if (!isInBounds(board, from.r, from.c) || !isInBounds(board, to.r, to.c)) {
    return { valid: false, reason: 'OUT_OF_BOUNDS' };
  }

  const dist = Math.abs(from.r - to.r) + Math.abs(from.c - to.c);
  if (dist !== 1) {
    return { valid: false, reason: 'NOT_ADJACENT' };
  }

  const cellA = board[from.r][from.c];
  const cellB = board[to.r][to.c];

  if (cellA.isHole || cellB.isHole) {
    return { valid: false, reason: 'BLOCKED_CELL' };
  }

  if (
    cellA.obstacle === 'ice' ||
    cellB.obstacle === 'ice' ||
    isSolidBlocker(cellA.obstacle) ||
    isSolidBlocker(cellB.obstacle)
  ) {
    return { valid: false, reason: 'IMMOVABLE_TILE' };
  }

  if (!cellA.tile || !cellB.tile) {
    return { valid: false, reason: 'BLOCKED_CELL' };
  }

  // Check Special+Special or Rainbow+AnyTile bypass
  const comboLabel = getSpecialComboLabel(cellA.tile.special, cellB.tile.special);
  if (comboLabel) {
    // Rainbow swapped with a color-less gem has no color to purge unless gem is disallowed
    if (
      comboLabel === 'rainbow_color' &&
      ((cellA.tile.special === 'rainbow' && cellB.tile.colorIndex < 0) ||
        (cellB.tile.special === 'rainbow' && cellA.tile.colorIndex < 0))
    ) {
      return { valid: false, reason: 'NO_MATCH' };
    }
    return {
      valid: true,
      isSpecialCombo: true,
      specialComboType: comboLabel,
    };
  }

  // Temporarily swap tiles to test matches
  const tileA = cellA.tile;
  const tileB = cellB.tile;
  cellA.tile = tileB;
  cellB.tile = tileA;

  const matches = findAllMatches(board, [to, from]);

  // Restore original references immediately
  cellA.tile = tileA;
  cellB.tile = tileB;

  if (matches.length === 0) {
    return { valid: false, reason: 'NO_MATCH' };
  }

  return {
    valid: true,
    isSpecialCombo: false,
    matches,
  };
}
