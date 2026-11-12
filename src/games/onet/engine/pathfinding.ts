/**
 * Onet Pure Pathfinding Engine (<= 2-Turn / <= 3-Segment 3-Bucket BFS).
 * Fixes B1 (forbids stepping through own multi-cell siblings) and guarantees minimum-turn paths.
 * Owned by @onet-eng.
 */

import type { GridCoord } from '@/types/game.types';
import type {
  OnetBlockerCell,
  OnetBoard,
  OnetCell,
  OnetDirection,
  OnetHint,
  OnetPathResult,
  OnetTileMaster,
  OnetTileSlave,
} from '@/types/onet.types';

interface DirDelta {
  dr: number;
  dc: number;
  exitSide: OnetDirection;
  entrySide: OnetDirection;
}

const DIRECTIONS: readonly DirDelta[] = [
  { dr: -1, dc: 0, exitSide: 'up', entrySide: 'down' },
  { dr: 1, dc: 0, exitSide: 'down', entrySide: 'up' },
  { dr: 0, dc: -1, exitSide: 'left', entrySide: 'right' },
  { dr: 0, dc: 1, exitSide: 'right', entrySide: 'left' },
];

export function isBlockerCell(cell: OnetCell | undefined): cell is OnetBlockerCell {
  return Boolean(cell && 'isBlocker' in cell && cell.isBlocker === true);
}

export function isSlaveCell(cell: OnetCell | undefined): cell is OnetTileSlave {
  return Boolean(cell && 'isSlave' in cell && cell.isSlave === true);
}

export function isMasterCell(cell: OnetCell | undefined): cell is OnetTileMaster {
  return Boolean(cell && !isSlaveCell(cell) && !isBlockerCell(cell));
}

export function resolveMasterCoord(board: OnetBoard, r: number, c: number): GridCoord | null {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  if (r < 0 || r >= rows || c < 0 || c >= cols) return null;
  const cell = board[r][c];
  if (!cell || isBlockerCell(cell)) return null;
  if (isSlaveCell(cell)) {
    const master = board[cell.masterR]?.[cell.masterC];
    if (!isMasterCell(master)) return null;
    return { r: cell.masterR, c: cell.masterC };
  }
  return { r, c };
}

export function groupSize(master: OnetTileMaster): { rowSpan: 1 | 2; colSpan: 1 | 2 } {
  return {
    rowSpan: master.rowSpan === 2 ? 2 : 1,
    colSpan: master.colSpan === 2 ? 2 : 1,
  };
}

export function getTileCells(board: OnetBoard, coord: GridCoord): GridCoord[] {
  const masterCoord = resolveMasterCoord(board, coord.r, coord.c);
  if (!masterCoord) return [];
  const master = board[masterCoord.r]?.[masterCoord.c];
  if (!isMasterCell(master)) return [];

  const { rowSpan, colSpan } = groupSize(master);
  const cells: GridCoord[] = [];
  for (let dr = 0; dr < rowSpan; dr += 1) {
    for (let dc = 0; dc < colSpan; dc += 1) {
      const rr = masterCoord.r + dr;
      const cc = masterCoord.c + dc;
      if (rr >= 0 && rr < board.length && cc >= 0 && cc < (board[0]?.length ?? 0)) {
        cells.push({ r: rr, c: cc });
      }
    }
  }
  return cells;
}

export function canMatch(cellA: OnetCell | undefined, cellB: OnetCell | undefined): boolean {
  if (!isMasterCell(cellA) || !isMasterCell(cellB)) return false;
  if (cellA.id === cellB.id) return false;
  if (cellA.icon !== cellB.icon) return false;
  const sizeA = groupSize(cellA);
  const sizeB = groupSize(cellB);
  return sizeA.rowSpan === sizeB.rowSpan && sizeA.colSpan === sizeB.colSpan;
}

function canExitSide(master: OnetTileMaster, dir: DirDelta): boolean {
  return !master.openSide || master.openSide === dir.exitSide;
}

function canEnterSide(master: OnetTileMaster, dir: DirDelta): boolean {
  return !master.openSide || master.openSide === dir.entrySide;
}

function compressCornerPoints(rawPoints: GridCoord[]): GridCoord[] {
  if (rawPoints.length <= 2) return rawPoints;
  const result: GridCoord[] = [rawPoints[0]];
  for (let i = 1; i < rawPoints.length - 1; i += 1) {
    const prev = result[result.length - 1];
    const curr = rawPoints[i];
    const next = rawPoints[i + 1];
    const sameRow = prev.r === curr.r && curr.r === next.r;
    const sameCol = prev.c === curr.c && curr.c === next.c;
    if (!sameRow && !sameCol) {
      result.push(curr);
    }
  }
  result.push(rawPoints[rawPoints.length - 1]);
  return result;
}

interface BfsNode {
  r: number;
  c: number;
  dirIdx: number;
  turns: 0 | 1 | 2;
  parentIdx: number;
}

/**
 * Finds the minimum-turn Onet connecting path (0, 1, or 2 turns) between two tiles.
 * Supports 1x1, 1x2, 2x1, and 2x2 tiles, arrow openSide constraints, and static blockers.
 */
export function getPath(
  board: OnetBoard,
  coordA: GridCoord,
  coordB: GridCoord,
): OnetPathResult | null {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  if (rows === 0 || cols === 0) return null;

  const masterCoordA = resolveMasterCoord(board, coordA.r, coordA.c);
  const masterCoordB = resolveMasterCoord(board, coordB.r, coordB.c);
  if (!masterCoordA || !masterCoordB) return null;

  const masterA = board[masterCoordA.r][masterCoordA.c];
  const masterB = board[masterCoordB.r][masterCoordB.c];
  if (!isMasterCell(masterA) || !isMasterCell(masterB)) return null;
  if (!canMatch(masterA, masterB)) return null;

  const startCells = getTileCells(board, masterCoordA);
  const endCells = getTileCells(board, masterCoordB);
  if (startCells.length === 0 || endCells.length === 0) return null;

  const paddedRows = rows + 2;
  const paddedCols = cols + 2;
  const toKey = (r: number, c: number) => (r + 1) * paddedCols + (c + 1);

  const endSet = new Set<number>(endCells.map((pt) => toKey(pt.r, pt.c)));

  const isEmptyOrOuter = (r: number, c: number): boolean => {
    if (r < -1 || r > rows || c < -1 || c > cols) return false;
    if (r === -1 || r === rows || c === -1 || c === cols) return true;
    return board[r][c] === null;
  };

  // Minimum turns seen at [paddedKey * 4 + dirIdx]; 99 means unvisited.
  const visited = new Uint8Array(paddedRows * paddedCols * 4);
  visited.fill(99);

  const nodes: BfsNode[] = [];
  const buckets: [number[], number[], number[]] = [[], [], []];

  const reconstructPath = (nodeIdx: number, endR: number, endC: number): GridCoord[] => {
    const rev: GridCoord[] = [{ r: endR, c: endC }];
    let cursor = nodeIdx;
    while (cursor !== -1) {
      const node = nodes[cursor];
      rev.push({ r: node.r, c: node.c });
      cursor = node.parentIdx;
    }
    rev.reverse();
    return compressCornerPoints(rev);
  };

  // Seed step 0 from all cells of start tile (start cells themselves are NOT passable afterwards).
  for (const sc of startCells) {
    const startNodeIdx = nodes.length;
    nodes.push({
      r: sc.r,
      c: sc.c,
      dirIdx: -1,
      turns: 0,
      parentIdx: -1,
    });

    for (let dirIdx = 0; dirIdx < 4; dirIdx += 1) {
      const dir = DIRECTIONS[dirIdx];
      if (!canExitSide(masterA, dir)) continue;

      const nr = sc.r + dir.dr;
      const nc = sc.c + dir.dc;
      if (nr < -1 || nr > rows || nc < -1 || nc > cols) continue;

      const key = toKey(nr, nc);
      if (endSet.has(key)) {
        if (canEnterSide(masterB, dir)) {
          return {
            points: [
              { r: sc.r, c: sc.c },
              { r: nr, c: nc },
            ],
            turns: 0,
            length: 2,
          };
        }
        continue;
      }

      if (!isEmptyOrOuter(nr, nc)) continue;

      const vIdx = key * 4 + dirIdx;
      if (visited[vIdx] > 0) {
        visited[vIdx] = 0;
        const nextIdx = nodes.length;
        nodes.push({
          r: nr,
          c: nc,
          dirIdx,
          turns: 0,
          parentIdx: startNodeIdx,
        });
        buckets[0].push(nextIdx);
      }
    }
  }

  // Process 0-turn, then 1-turn, then 2-turn buckets in strict ascending turn order.
  for (let currentTurn = 0 as 0 | 1 | 2; currentTurn <= 2; currentTurn = (currentTurn + 1) as 0 | 1 | 2) {
    const queue = buckets[currentTurn];
    let head = 0;
    while (head < queue.length) {
      const nodeIdx = queue[head];
      head += 1;
      const node = nodes[nodeIdx];
      if (node.turns > currentTurn) continue;

      for (let dirIdx = 0; dirIdx < 4; dirIdx += 1) {
        const nextTurns = node.dirIdx === dirIdx ? node.turns : ((node.turns + 1) as 0 | 1 | 2 | 3);
        if (nextTurns > 2) continue;

        const dir = DIRECTIONS[dirIdx];
        const nr = node.r + dir.dr;
        const nc = node.c + dir.dc;
        if (nr < -1 || nr > rows || nc < -1 || nc > cols) continue;

        const key = toKey(nr, nc);
        if (endSet.has(key)) {
          if (canEnterSide(masterB, dir)) {
            const points = reconstructPath(nodeIdx, nr, nc);
            return {
              points,
              turns: nextTurns as 0 | 1 | 2,
              length: points.length,
            };
          }
          continue;
        }

        if (!isEmptyOrOuter(nr, nc)) continue;

        const vIdx = key * 4 + dirIdx;
        if (nextTurns < visited[vIdx]) {
          visited[vIdx] = nextTurns;
          const nextIdx = nodes.length;
          nodes.push({
            r: nr,
            c: nc,
            dirIdx,
            turns: nextTurns as 0 | 1 | 2,
            parentIdx: nodeIdx,
          });
          buckets[nextTurns as 0 | 1 | 2].push(nextIdx);
        }
      }
    }
  }

  return null;
}

/**
 * Finds a valid matchable pair on the board, preferring shorter/fewer-turn paths when available.
 */
export function findHint(board: OnetBoard): OnetHint | null {
  const buckets = new Map<string, GridCoord[]>();
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cell = board[r][c];
      if (!isMasterCell(cell)) continue;
      const { rowSpan, colSpan } = groupSize(cell);
      const bucketKey = `${cell.icon}|${rowSpan}x${colSpan}`;
      const list = buckets.get(bucketKey);
      if (list) {
        list.push({ r, c });
      } else {
        buckets.set(bucketKey, [{ r, c }]);
      }
    }
  }

  let bestHint: OnetHint | null = null;
  for (const coords of buckets.values()) {
    for (let i = 0; i < coords.length; i += 1) {
      for (let j = i + 1; j < coords.length; j += 1) {
        const pathResult = getPath(board, coords[i], coords[j]);
        if (!pathResult) continue;
        if (pathResult.turns === 0) {
          return {
            a: coords[i],
            b: coords[j],
            path: pathResult.points,
            turns: 0,
          };
        }
        if (!bestHint || pathResult.turns < bestHint.turns) {
          bestHint = {
            a: coords[i],
            b: coords[j],
            path: pathResult.points,
            turns: pathResult.turns,
          };
        }
      }
    }
  }

  return bestHint;
}

export function countRemainingMasters(board: OnetBoard): number {
  let count = 0;
  for (let r = 0; r < board.length; r += 1) {
    for (let c = 0; c < board[r].length; c += 1) {
      if (isMasterCell(board[r][c])) count += 1;
    }
  }
  return count;
}

export function countRemainingCells(board: OnetBoard): number {
  let count = 0;
  for (let r = 0; r < board.length; r += 1) {
    for (let c = 0; c < board[r].length; c += 1) {
      const cell = board[r][c];
      if (cell && !isBlockerCell(cell)) count += 1;
    }
  }
  return count;
}
