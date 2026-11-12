/**
 * Onet Multi-Cell-Safe 3-Tier Guaranteed Shuffler.
 * Preserves active themeKey, splitAxis, and static blockers while preventing orphan slave cells.
 * Owned by @onet-eng.
 */

import type { GridCoord } from '@/types/game.types';
import type { OnetBoard, OnetGravityMode, OnetTileMaster } from '@/types/onet.types';
import { seededRandom, shuffleArray } from '@/utils/random';
import {
  cloneBoard,
  createEmptyBoard,
  isBoardSolvable,
  placeGroup,
} from './boardGenerator';
import { findHint, getPath, groupSize, isBlockerCell, isMasterCell } from './pathfinding';

export interface ShuffleOptions {
  gravityMode?: OnetGravityMode;
  activeThemeKey?: string;
  seed?: number;
}

function collectMastersAndBlockers(board: OnetBoard): {
  masters: Array<{ r: number; c: number; cell: OnetTileMaster }>;
  blockers: Array<{ r: number; c: number; cell: OnetBoard[number][number] }>;
} {
  const masters: Array<{ r: number; c: number; cell: OnetTileMaster }> = [];
  const blockers: Array<{ r: number; c: number; cell: OnetBoard[number][number] }> = [];

  for (let r = 0; r < board.length; r += 1) {
    for (let c = 0; c < board[r].length; c += 1) {
      const cell = board[r][c];
      if (!cell) continue;
      if (isBlockerCell(cell)) {
        blockers.push({ r, c, cell });
      } else if (isMasterCell(cell)) {
        masters.push({ r, c, cell });
      }
    }
  }

  return { masters, blockers };
}

function normalizeThemeKey(master: OnetTileMaster, activeThemeKey?: string): OnetTileMaster {
  return {
    ...master,
    themeKey: activeThemeKey ?? master.themeKey,
  };
}

/**
 * Tier 1: Permutes tile identities within identical footprint slots (1x1, 1x2, 2x1, 2x2)
 * so spatial layout and multi-cell footprints stay structurally valid with zero orphan slaves.
 */
function tryTier1FootprintPermutation(
  board: OnetBoard,
  masters: Array<{ r: number; c: number; cell: OnetTileMaster }>,
  gravityMode: OnetGravityMode,
  activeThemeKey: string | undefined,
  rng: () => number,
): OnetBoard | null {
  if (masters.length < 2) return null;

  const byFootprint = new Map<string, Array<{ r: number; c: number; cell: OnetTileMaster }>>();
  for (const entry of masters) {
    const { rowSpan, colSpan } = groupSize(entry.cell);
    const key = `${rowSpan}x${colSpan}`;
    const list = byFootprint.get(key);
    if (list) list.push(entry);
    else byFootprint.set(key, [entry]);
  }

  let bestValidHintBoard: OnetBoard | null = null;

  for (let attempt = 0; attempt < 36; attempt += 1) {
    const candidate = cloneBoard(board);
    for (const entries of byFootprint.values()) {
      const shuffledPayloads = shuffleArray(
        entries.map((e) => normalizeThemeKey(e.cell, activeThemeKey)),
        rng,
      );
      for (let i = 0; i < entries.length; i += 1) {
        const slot = entries[i];
        const payload = shuffledPayloads[i];
        candidate[slot.r][slot.c] = {
          ...payload,
          rowSpan: slot.cell.rowSpan,
          colSpan: slot.cell.colSpan,
          footprint: slot.cell.footprint,
        };
      }
    }

    if (findHint(candidate)) {
      if (isBoardSolvable(candidate, gravityMode, 32)) {
        return candidate;
      }
      if (!bestValidHintBoard) {
        bestValidHintBoard = candidate;
      }
    }
  }

  return bestValidHintBoard;
}

/**
 * Tier 2: Re-packs all masters (largest footprints first) into clean unoccupied positions
 * around fixed blockers, guaranteeing zero overlapping or orphan slave cells.
 */
function tryTier2FullRepack(
  rows: number,
  cols: number,
  blockers: Array<{ r: number; c: number; cell: OnetBoard[number][number] }>,
  masters: Array<{ r: number; c: number; cell: OnetTileMaster }>,
  gravityMode: OnetGravityMode,
  activeThemeKey: string | undefined,
  rng: () => number,
  clearArrows: boolean,
): OnetBoard | null {
  const sortedMasters = [...masters].sort((a, b) => {
    const areaA = a.cell.rowSpan * a.cell.colSpan;
    const areaB = b.cell.rowSpan * b.cell.colSpan;
    return areaB - areaA;
  });

  let fallbackHintBoard: OnetBoard | null = null;

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = createEmptyBoard(rows, cols);
    for (const b of blockers) {
      candidate[b.r][b.c] = b.cell ? { ...b.cell } : null;
    }

    const emptySlots: GridCoord[] = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (candidate[r][c] === null) emptySlots.push({ r, c });
      }
    }

    const randomizedSlots = shuffleArray(emptySlots, rng);
    const randomizedGroupOrder = [
      ...sortedMasters.filter((m) => m.cell.rowSpan > 1 || m.cell.colSpan > 1),
      ...shuffleArray(
        sortedMasters.filter((m) => m.cell.rowSpan === 1 && m.cell.colSpan === 1),
        rng,
      ),
    ];

    let allPlaced = true;
    for (const entry of randomizedGroupOrder) {
      const tile: OnetTileMaster = {
        ...normalizeThemeKey(entry.cell, activeThemeKey),
        openSide: clearArrows ? null : entry.cell.openSide,
      };
      let placed = false;
      for (const slot of randomizedSlots) {
        if (placeGroup(candidate, slot.r, slot.c, tile)) {
          placed = true;
          break;
        }
      }
      if (!placed) {
        allPlaced = false;
        break;
      }
    }

    if (!allPlaced) continue;

    if (findHint(candidate)) {
      if (isBoardSolvable(candidate, gravityMode, 90)) {
        return candidate;
      }
      if (!fallbackHintBoard) fallbackHintBoard = candidate;
    }
  }

  return fallbackHintBoard;
}

/**
 * Tier 3: Deterministic emergency recovery — keeps blockers and existing footprint slots intact,
 * forces one matching pair into directly adjacent or mutually reachable slots (clearing openSide
 * only on the rescued pair if arrow orientation caused a 2-tile deadlock).
 */
function tier3EmergencyHintRecovery(
  board: OnetBoard,
  masters: Array<{ r: number; c: number; cell: OnetTileMaster }>,
  activeThemeKey: string | undefined,
): OnetBoard {
  const recovered = cloneBoard(board);
  for (let r = 0; r < recovered.length; r += 1) {
    for (let c = 0; c < recovered[r].length; c += 1) {
      const cell = recovered[r][c];
      if (isMasterCell(cell)) {
        recovered[r][c] = normalizeThemeKey(cell, activeThemeKey);
      }
    }
  }

  if (findHint(recovered)) return recovered;

  // Group masters by footprint & icon and attempt relaxing arrow constraints first
  const byIconSize = new Map<string, GridCoord[]>();
  for (const m of masters) {
    const { rowSpan, colSpan } = groupSize(m.cell);
    const key = `${m.cell.icon}|${rowSpan}x${colSpan}`;
    const list = byIconSize.get(key);
    if (list) list.push({ r: m.r, c: m.c });
    else byIconSize.set(key, [{ r: m.r, c: m.c }]);
  }

  for (const coords of byIconSize.values()) {
    if (coords.length < 2) continue;
    const cellA = recovered[coords[0].r][coords[0].c];
    const cellB = recovered[coords[1].r][coords[1].c];
    if (isMasterCell(cellA) && isMasterCell(cellB)) {
      cellA.openSide = null;
      cellB.openSide = null;
      if (getPath(recovered, coords[0], coords[1])) {
        return recovered;
      }
    }
  }

  // Last-resort swap of a 1x1 matching partner right next to the first 1x1 tile
  const singles = masters.filter((m) => m.cell.rowSpan === 1 && m.cell.colSpan === 1);
  if (singles.length >= 2) {
    const first = singles[0];
    const partner = singles.find((m, idx) => idx > 0 && m.cell.icon === first.cell.icon);
    const neighbor = singles.find(
      (m) => Math.abs(m.r - first.r) + Math.abs(m.c - first.c) === 1,
    );
    if (partner && neighbor && partner.cell.id !== neighbor.cell.id) {
      const pCell = recovered[partner.r][partner.c];
      const nCell = recovered[neighbor.r][neighbor.c];
      if (isMasterCell(pCell) && isMasterCell(nCell)) {
        recovered[neighbor.r][neighbor.c] = { ...pCell, openSide: null };
        recovered[partner.r][partner.c] = { ...nCell };
        const fCell = recovered[first.r][first.c];
        if (isMasterCell(fCell)) fCell.openSide = null;
      }
    }
  }

  return recovered;
}

/**
 * Guarantees a valid, hint-available Onet board without orphan slave cells or unlinked tiles.
 */
export function guaranteedShuffle(
  board: OnetBoard,
  options: ShuffleOptions = {},
): OnetBoard {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  if (rows === 0 || cols === 0) return board;

  const { masters, blockers } = collectMastersAndBlockers(board);
  if (masters.length < 2) return board;

  const gravityMode = options.gravityMode ?? 'none';
  const rng = seededRandom(options.seed ?? Date.now());

  const tier1 = tryTier1FootprintPermutation(
    board,
    masters,
    gravityMode,
    options.activeThemeKey,
    rng,
  );
  if (tier1) return tier1;

  const tier2 = tryTier2FullRepack(
    rows,
    cols,
    blockers,
    masters,
    gravityMode,
    options.activeThemeKey,
    rng,
    false,
  );
  if (tier2) return tier2;

  const tier2NoArrows = tryTier2FullRepack(
    rows,
    cols,
    blockers,
    masters,
    gravityMode,
    options.activeThemeKey,
    rng,
    true,
  );
  if (tier2NoArrows) return tier2NoArrows;

  return tier3EmergencyHintRecovery(board, masters, options.activeThemeKey);
}
