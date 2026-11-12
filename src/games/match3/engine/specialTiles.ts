/**
 * Special Tile Activation, BFS Chain-Reaction Detonation & 7-Pair Combo Fusion Engine.
 * Zero React/DOM/Storage dependencies.
 * Owned by @match3-eng.
 */

import { MATCH3_SCORING_CONFIG } from '@/config/match3.config';
import type { GridCoord } from '@/types/game.types';
import type { Match3Board, SpecialTileType } from '@/types/match3.types';

export interface SpecialBlastPlan {
  /** All coordinates hit at least once by special waves (deduplicated) */
  affectedCoords: GridCoord[];
  /** Inner-core coordinates that receive 2 hits of obstacle damage (e.g., bomb+bomb inner 3x3) */
  doubleDamageCoords: GridCoord[];
  /** Every special tile that detonated during the BFS chain */
  triggeredSpecials: { coord: GridCoord; type: SpecialTileType }[];
  /** Extra bonus points from special activations / combos */
  bonusScore: number;
  /** Semantic combo key if this came from a 2-special swap */
  comboKey:
    | 'line_line'
    | 'line_bomb'
    | 'bomb_bomb'
    | 'rainbow_color'
    | 'rainbow_line'
    | 'rainbow_bomb'
    | 'rainbow_rainbow'
    | null;
  /** Targets zapped by a rainbow beam (for UI lightning FX) */
  rainbowTargets: GridCoord[];
  rainbowOrigin: GridCoord | null;
}

function keyOf(r: number, c: number): string {
  return `${r}:${c}`;
}

export function findMostPopulousColor(board: Match3Board): number {
  const counts = new Map<number, number>();
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < (board[r]?.length ?? 0); c++) {
      const cell = board[r][c];
      if (!cell.isHole && cell.tile && cell.tile.colorIndex >= 0) {
        counts.set(cell.tile.colorIndex, (counts.get(cell.tile.colorIndex) ?? 0) + 1);
      }
    }
  }
  let bestColor = 0;
  let bestCount = -1;
  for (const [color, count] of Array.from(counts.entries()).sort((a, b) => a[0] - b[0])) {
    if (count > bestCount) {
      bestCount = count;
      bestColor = color;
    }
  }
  return bestColor;
}

function addCoord(
  board: Match3Board,
  r: number,
  c: number,
  affectedMap: Map<string, GridCoord>,
): void {
  if (r < 0 || r >= board.length || c < 0 || c >= (board[0]?.length ?? 0)) return;
  if (board[r][c].isHole) return;
  const k = keyOf(r, c);
  if (!affectedMap.has(k)) {
    affectedMap.set(k, { r, c });
  }
}

function getSingleSpecialFootprint(
  board: Match3Board,
  origin: GridCoord,
  type: SpecialTileType,
  preferredRainbowColor?: number,
): GridCoord[] {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const targets: GridCoord[] = [];

  if (type === 'striped_h') {
    for (let c = 0; c < cols; c++) {
      if (!board[origin.r][c].isHole) targets.push({ r: origin.r, c });
    }
  } else if (type === 'striped_v') {
    for (let r = 0; r < rows; r++) {
      if (!board[r][origin.c].isHole) targets.push({ r, c: origin.c });
    }
  } else if (type === 'bomb_3x3') {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = origin.r + dr;
        const nc = origin.c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !board[nr][nc].isHole) {
          targets.push({ r: nr, c: nc });
        }
      }
    }
  } else if (type === 'rainbow') {
    const color =
      preferredRainbowColor !== undefined && preferredRainbowColor >= 0
        ? preferredRainbowColor
        : findMostPopulousColor(board);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        if (!cell.isHole && cell.tile && cell.tile.colorIndex === color) {
          targets.push({ r, c });
        }
      }
    }
    targets.push({ r: origin.r, c: origin.c });
  }

  return targets;
}

/**
 * Expands a set of initial triggered special tiles via deterministic BFS chain reaction.
 * `skipTriggerKeys` prevents newly synthesized specials created in the same match wave
 * from immediately self-detonating.
 */
export function expandSpecialChain(
  board: Match3Board,
  initialSeeds: { coord: GridCoord; type: SpecialTileType; rainbowColor?: number }[],
  skipTriggerKeys: ReadonlySet<string> = new Set(),
): SpecialBlastPlan {
  const affectedMap = new Map<string, GridCoord>();
  const visitedSpecials = new Set<string>();
  const triggeredSpecials: { coord: GridCoord; type: SpecialTileType }[] = [];
  const rainbowTargets: GridCoord[] = [];
  let rainbowOrigin: GridCoord | null = null;
  let bonusScore = 0;

  const queue: { coord: GridCoord; type: SpecialTileType; rainbowColor?: number }[] = [];
  for (const seed of initialSeeds) {
    if (seed.type === 'none') continue;
    const k = keyOf(seed.coord.r, seed.coord.c);
    if (!visitedSpecials.has(k) && !skipTriggerKeys.has(k)) {
      visitedSpecials.add(k);
      queue.push(seed);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    triggeredSpecials.push({ coord: current.coord, type: current.type });
    bonusScore += MATCH3_SCORING_CONFIG.specialDetonationBonus;

    const footprint = getSingleSpecialFootprint(
      board,
      current.coord,
      current.type,
      current.rainbowColor,
    );

    if (current.type === 'rainbow') {
      rainbowOrigin = current.coord;
      for (const pt of footprint) {
        if (pt.r !== current.coord.r || pt.c !== current.coord.c) {
          rainbowTargets.push(pt);
        }
      }
    }

    for (const pt of footprint) {
      addCoord(board, pt.r, pt.c, affectedMap);
      const cell = board[pt.r][pt.c];
      if (cell.tile && cell.tile.special !== 'none') {
        const pk = keyOf(pt.r, pt.c);
        if (!visitedSpecials.has(pk) && !skipTriggerKeys.has(pk)) {
          visitedSpecials.add(pk);
          queue.push({ coord: { r: pt.r, c: pt.c }, type: cell.tile.special });
        }
      }
    }
  }

  return {
    affectedCoords: Array.from(affectedMap.values()),
    doubleDamageCoords: [],
    triggeredSpecials,
    bonusScore,
    comboKey: null,
    rainbowTargets,
    rainbowOrigin,
  };
}

/**
 * Resolves all 7 Special+Special and Rainbow+Tile swap fusions,
 * then runs BFS chain reactions on any secondary special tiles caught in the blast.
 */
export function resolveSpecialSwapCombo(
  boardAfterSwap: Match3Board,
  from: GridCoord,
  to: GridCoord,
): SpecialBlastPlan {
  const tileA = boardAfterSwap[from.r][from.c].tile!;
  const tileB = boardAfterSwap[to.r][to.c].tile!;
  const sA = tileA.special;
  const sB = tileB.special;

  const rows = boardAfterSwap.length;
  const cols = boardAfterSwap[0]?.length ?? 0;

  const affectedMap = new Map<string, GridCoord>();
  const doubleDamageMap = new Map<string, GridCoord>();
  const visitedSpecials = new Set<string>([keyOf(from.r, from.c), keyOf(to.r, to.c)]);
  const triggeredSpecials: { coord: GridCoord; type: SpecialTileType }[] = [
    { coord: from, type: sA },
    { coord: to, type: sB },
  ].filter((x) => x.type !== 'none');

  const rainbowTargets: GridCoord[] = [];
  let rainbowOrigin: GridCoord | null = null;
  let bonusScore = 0;
  let comboKey: SpecialBlastPlan['comboKey'] = null;

  const secondarySeeds: { coord: GridCoord; type: SpecialTileType }[] = [];

  const enqueueSecondaryAt = (r: number, c: number) => {
    const cell = boardAfterSwap[r]?.[c];
    if (!cell || cell.isHole || !cell.tile || cell.tile.special === 'none') return;
    const k = keyOf(r, c);
    if (!visitedSpecials.has(k)) {
      secondarySeeds.push({ coord: { r, c }, type: cell.tile.special });
    }
  };

  // Case 1: Rainbow + Rainbow -> Supernova full-board wipe
  if (sA === 'rainbow' && sB === 'rainbow') {
    comboKey = 'rainbow_rainbow';
    bonusScore = MATCH3_SCORING_CONFIG.specialComboBonus.rainbow_rainbow;
    rainbowOrigin = to;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!boardAfterSwap[r][c].isHole) {
          addCoord(boardAfterSwap, r, c, affectedMap);
          rainbowTargets.push({ r, c });
        }
      }
    }
  } else if (sA === 'rainbow' || sB === 'rainbow') {
    const rainbowCoord = sA === 'rainbow' ? from : to;
    const otherTile = sA === 'rainbow' ? tileB : tileA;
    const otherCoord = sA === 'rainbow' ? to : from;
    const targetColor = otherTile.colorIndex >= 0 ? otherTile.colorIndex : findMostPopulousColor(boardAfterSwap);
    rainbowOrigin = rainbowCoord;
    addCoord(boardAfterSwap, rainbowCoord.r, rainbowCoord.c, affectedMap);
    addCoord(boardAfterSwap, otherCoord.r, otherCoord.c, affectedMap);

    const matchedColorCells: GridCoord[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = boardAfterSwap[r][c];
        if (!cell.isHole && cell.tile && cell.tile.colorIndex === targetColor) {
          matchedColorCells.push({ r, c });
        }
      }
    }

    if (otherTile.special === 'striped_h' || otherTile.special === 'striped_v') {
      comboKey = 'rainbow_line';
      bonusScore = MATCH3_SCORING_CONFIG.specialComboBonus.rainbow_line;
      matchedColorCells.forEach((pt, idx) => {
        const lineType: SpecialTileType = idx % 2 === 0 ? 'striped_h' : 'striped_v';
        rainbowTargets.push(pt);
        addCoord(boardAfterSwap, pt.r, pt.c, affectedMap);
        secondarySeeds.push({ coord: pt, type: lineType });
      });
    } else if (otherTile.special === 'bomb_3x3') {
      comboKey = 'rainbow_bomb';
      bonusScore = MATCH3_SCORING_CONFIG.specialComboBonus.rainbow_bomb;
      for (const pt of matchedColorCells) {
        rainbowTargets.push(pt);
        addCoord(boardAfterSwap, pt.r, pt.c, affectedMap);
        secondarySeeds.push({ coord: pt, type: 'bomb_3x3' });
      }
    } else {
      comboKey = 'rainbow_color';
      bonusScore = MATCH3_SCORING_CONFIG.specialComboBonus.rainbow_color;
      for (const pt of matchedColorCells) {
        rainbowTargets.push(pt);
        addCoord(boardAfterSwap, pt.r, pt.c, affectedMap);
        enqueueSecondaryAt(pt.r, pt.c);
      }
    }
  } else if (sA === 'bomb_3x3' && sB === 'bomb_3x3') {
    // Case 5: Bomb + Bomb -> 5x5 mega shockwave + double hit in inner 3x3
    comboKey = 'bomb_bomb';
    bonusScore = MATCH3_SCORING_CONFIG.specialComboBonus.bomb_bomb;
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const nr = to.r + dr;
        const nc = to.c + dc;
        addCoord(boardAfterSwap, nr, nc, affectedMap);
        enqueueSecondaryAt(nr, nc);
        if (Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && nr >= 0 && nr < rows && nc >= 0 && nc < cols && !boardAfterSwap[nr][nc].isHole) {
          doubleDamageMap.set(keyOf(nr, nc), { r: nr, c: nc });
        }
      }
    }
  } else if (sA === 'bomb_3x3' || sB === 'bomb_3x3') {
    // Case 6: Line + Bomb -> 3 full rows + 3 full cols
    comboKey = 'line_bomb';
    bonusScore = MATCH3_SCORING_CONFIG.specialComboBonus.line_bomb;
    for (let dr = -1; dr <= 1; dr++) {
      const rr = to.r + dr;
      if (rr < 0 || rr >= rows) continue;
      for (let c = 0; c < cols; c++) {
        addCoord(boardAfterSwap, rr, c, affectedMap);
        enqueueSecondaryAt(rr, c);
      }
    }
    for (let dc = -1; dc <= 1; dc++) {
      const cc = to.c + dc;
      if (cc < 0 || cc >= cols) continue;
      for (let r = 0; r < rows; r++) {
        addCoord(boardAfterSwap, r, cc, affectedMap);
        enqueueSecondaryAt(r, cc);
      }
    }
  } else {
    // Case 7: Line + Line -> Cross Laser (1 full row + 1 full col)
    comboKey = 'line_line';
    bonusScore = MATCH3_SCORING_CONFIG.specialComboBonus.line_line;
    for (let c = 0; c < cols; c++) {
      addCoord(boardAfterSwap, to.r, c, affectedMap);
      enqueueSecondaryAt(to.r, c);
    }
    for (let r = 0; r < rows; r++) {
      addCoord(boardAfterSwap, r, to.c, affectedMap);
      enqueueSecondaryAt(r, to.c);
    }
  }

  // Expand any secondary chain reactions caught in the initial combo blast
  if (secondarySeeds.length > 0 && comboKey !== 'rainbow_rainbow') {
    const chain = expandSpecialChain(boardAfterSwap, secondarySeeds, visitedSpecials);
    for (const pt of chain.affectedCoords) {
      addCoord(boardAfterSwap, pt.r, pt.c, affectedMap);
    }
    for (const sp of chain.triggeredSpecials) {
      triggeredSpecials.push(sp);
    }
    bonusScore += chain.bonusScore;
  }

  return {
    affectedCoords: Array.from(affectedMap.values()),
    doubleDamageCoords: Array.from(doubleDamageMap.values()),
    triggeredSpecials,
    bonusScore,
    comboKey,
    rainbowTargets,
    rainbowOrigin,
  };
}
