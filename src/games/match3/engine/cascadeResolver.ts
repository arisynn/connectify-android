/**
 * Pure Match 3 Cascade Resolver, Gravity, Diagonal Slip, Refill & Booster Impact Engine.
 * Zero React/DOM/Storage dependencies.
 * Owned by @match3-eng.
 */

import { MATCH3_SCORING_CONFIG } from '@/config/match3.config';
import type { GridCoord } from '@/types/game.types';
import type {
  CascadeWaveSnapshot,
  Match3Board,
  Match3Cell,
  Match3Tile,
  MatchGroup,
  ObstacleDamageEvent,
  ObstacleType,
  SpecialTileType,
  SwapResolutionResult,
} from '@/types/match3.types';
import type { RngFn } from '@/utils/random';
import {
  cloneBoard,
  findAllMatches,
  isInBounds,
  isSolidBlocker,
  validateSwap,
} from './matchDetector';
import { getCascadeMultiplier } from './match3Scoring';
import {
  expandSpecialChain,
  findMostPopulousColor,
  resolveSpecialSwapCombo,
  type SpecialBlastPlan,
} from './specialTiles';

const ORTHO_DIRS: readonly GridCoord[] = [
  { r: -1, c: 0 },
  { r: 1, c: 0 },
  { r: 0, c: -1 },
  { r: 0, c: 1 },
];

export type TileUidFactory = () => string;

export function createTileUidFactory(prefix = 'm3'): TileUidFactory {
  let counter = 1;
  return () => `${prefix}_${counter++}`;
}

function keyOf(r: number, c: number): string {
  return `${r}:${c}`;
}

function createEmptyResult(board: Match3Board): SwapResolutionResult {
  return {
    valid: false,
    isSpecialCombo: false,
    waves: [],
    finalBoard: cloneBoard(board),
    totalScoreDelta: 0,
    totalTilesCleared: 0,
    totalSpecialsCreated: 0,
    totalSpecialCombosTriggered: 0,
    totalObstaclesDestroyed: 0,
    totalGemsCollected: 0,
    colorClearedCounts: {},
    iceDestroyed: 0,
    woodDestroyed: 0,
    metalDestroyed: 0,
    cascadeCount: 0,
    maxComboMultiplier: 1,
  };
}

interface DamageTally {
  events: ObstacleDamageEvent[];
  iceDestroyed: number;
  woodDestroyed: number;
  metalDestroyed: number;
  obstaclesDestroyed: number;
  gemsCollected: number;
  gemsCollectedCoords: GridCoord[];
  bonusScore: number;
}

function applySingleObstacleHit(
  cell: Match3Cell,
  isDirectSpecialOrMatch: boolean,
  tally: DamageTally,
): void {
  const obs = cell.obstacle;
  if (!obs) return;

  if (obs === 'ice' && isDirectSpecialOrMatch) {
    cell.obstacle = '';
    tally.events.push({ coord: { r: cell.r, c: cell.c }, from: 'ice', to: '' });
    tally.iceDestroyed += 1;
    tally.obstaclesDestroyed += 1;
    tally.bonusScore += 25;
  } else if (obs === 'wood') {
    cell.obstacle = '';
    tally.events.push({ coord: { r: cell.r, c: cell.c }, from: 'wood', to: '' });
    tally.woodDestroyed += 1;
    tally.obstaclesDestroyed += 1;
    tally.bonusScore += 35;
  } else if (obs === 'metal-2') {
    cell.obstacle = 'metal-1';
    tally.events.push({ coord: { r: cell.r, c: cell.c }, from: 'metal-2', to: 'metal-1' });
    tally.bonusScore += 50;
  } else if (obs === 'metal-1') {
    cell.obstacle = '';
    tally.events.push({ coord: { r: cell.r, c: cell.c }, from: 'metal-1', to: '' });
    tally.metalDestroyed += 1;
    tally.obstaclesDestroyed += 1;
    tally.bonusScore += 75;
  } else if (obs === 'stone' && isDirectSpecialOrMatch) {
    cell.obstacle = '';
    tally.events.push({ coord: { r: cell.r, c: cell.c }, from: 'stone', to: '' });
    tally.obstaclesDestroyed += 1;
    tally.bonusScore += 100;
  } else if (obs === 'gem' && isDirectSpecialOrMatch) {
    cell.obstacle = '';
    cell.tile = null;
    tally.events.push({ coord: { r: cell.r, c: cell.c }, from: 'gem', to: '' });
    tally.gemsCollected += 1;
    tally.gemsCollectedCoords.push({ r: cell.r, c: cell.c });
    tally.bonusScore += MATCH3_SCORING_CONFIG.gemCollectedBonus;
  }
}

function isCellMovable(cell: Match3Cell | undefined): boolean {
  if (!cell || cell.isHole) return false;
  if (isSolidBlocker(cell.obstacle) || cell.obstacle === 'ice') return false;
  return cell.tile !== null;
}

function isCellEmptyPlayable(cell: Match3Cell | undefined): boolean {
  if (!cell || cell.isHole) return false;
  if (isSolidBlocker(cell.obstacle)) return false;
  return cell.tile === null;
}

function settleVerticalColumn(board: Match3Board, c: number): boolean {
  const rows = board.length;
  let movedAny = false;
  let writeRow = rows - 1;

  while (writeRow >= 0) {
    const dest = board[writeRow][c];
    if (dest.isHole || isSolidBlocker(dest.obstacle) || dest.obstacle === 'ice' || dest.tile !== null) {
      writeRow--;
      continue;
    }

    // Find nearest movable tile directly above within the same open vertical segment
    let srcRow = writeRow - 1;
    let blockedByBarrier = false;
    while (srcRow >= 0) {
      const src = board[srcRow][c];
      if (src.isHole || isSolidBlocker(src.obstacle) || src.obstacle === 'ice') {
        blockedByBarrier = true;
        break;
      }
      if (src.tile !== null) {
        break;
      }
      srcRow--;
    }

    if (blockedByBarrier || srcRow < 0) {
      writeRow = srcRow - 1;
      continue;
    }

    const srcCell = board[srcRow][c];
    const movingTile = srcCell.tile!;
    const dropDist = writeRow - srcRow;
    dest.tile = {
      ...movingTile,
      dropRows: movingTile.dropRows + dropDist,
    };
    if (srcCell.obstacle === 'gem') {
      dest.obstacle = 'gem';
      srcCell.obstacle = '';
    }
    srcCell.tile = null;
    movedAny = true;
    writeRow--;
  }

  return movedAny;
}

/**
 * Collects any gems resting on the bottom-most non-hole row of each column.
 */
function collectBottomRowGems(board: Match3Board): GridCoord[] {
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const collected: GridCoord[] = [];

  for (let c = 0; c < cols; c++) {
    let bottomPlayableRow = -1;
    for (let r = rows - 1; r >= 0; r--) {
      if (!board[r][c].isHole) {
        bottomPlayableRow = r;
        break;
      }
    }
    if (bottomPlayableRow >= 0) {
      const cell = board[bottomPlayableRow][c];
      if (cell.obstacle === 'gem') {
        cell.obstacle = '';
        cell.tile = null;
        collected.push({ r: bottomPlayableRow, c });
      }
    }
  }

  return collected;
}

export interface GravityRefillResult {
  board: Match3Board;
  gemsCollectedCoords: GridCoord[];
}

/**
 * Applies vertical gravity (anchored around holes and solid blockers), diagonal slip
 * beneath overhangs, top refill, and bottom-row gem collection.
 * Guarantees zero empty playable cells remain on the returned board.
 */
export function applyGravityAndRefill(
  board: Match3Board,
  tileColorCount: 4 | 5 | 6,
  rng: RngFn = Math.random,
  uidGen: TileUidFactory = createTileUidFactory('refill'),
): GravityRefillResult {
  const next = cloneBoard(board);
  const rows = next.length;
  const cols = next[0]?.length ?? 0;
  const allCollectedGems: GridCoord[] = [];

  // Reset transient per-wave drop animations on surviving tiles before computing new drops
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const t = next[r][c].tile;
      if (t) {
        t.dropRows = 0;
        t.isNewSpawn = false;
      }
    }
  }

  const settleAndCollect = () => {
    // 1. Initial vertical settle
    for (let c = 0; c < cols; c++) {
      settleVerticalColumn(next, c);
    }

    // 2. Diagonal slip into pockets sheltered under solid blockers or holes
    const maxPasses = rows * cols;
    for (let pass = 0; pass < maxPasses; pass++) {
      let slipped = false;

      for (let r = rows - 1; r >= 1; r--) {
        for (let c = 0; c < cols; c++) {
          if (!isCellEmptyPlayable(next[r][c])) continue;

          // Only slip diagonally if directly above (r-1, c) is blocked by a shelf/hole
          const above = next[r - 1][c];
          const aboveBlocked =
            above.isHole || isSolidBlocker(above.obstacle) || above.obstacle === 'ice';
          if (!aboveBlocked) continue;

          const diagOffsets = rng() < 0.5 ? [-1, 1] : [1, -1];
          for (const dc of diagOffsets) {
            const sc = c + dc;
            if (sc < 0 || sc >= cols) continue;
            const diagCell = next[r - 1][sc];
            if (isCellMovable(diagCell)) {
              const moving = diagCell.tile!;
              next[r][c].tile = {
                ...moving,
                dropRows: moving.dropRows + 1,
              };
              if (diagCell.obstacle === 'gem') {
                next[r][c].obstacle = 'gem';
                diagCell.obstacle = '';
              }
              diagCell.tile = null;
              settleVerticalColumn(next, sc);
              settleVerticalColumn(next, c);
              slipped = true;
              break;
            }
          }
        }
      }

      if (!slipped) break;
    }

    // 3. Refill open chutes from top, plus fallback fill for completely walled-off pockets
    for (let c = 0; c < cols; c++) {
      // Count contiguous top empty playable cells above any first stationary barrier
      let topEmptyCount = 0;
      for (let r = 0; r < rows; r++) {
        const cell = next[r][c];
        if (cell.isHole || isSolidBlocker(cell.obstacle) || cell.obstacle === 'ice') break;
        if (cell.tile === null) {
          topEmptyCount++;
        } else {
          break;
        }
      }

      for (let r = 0; r < rows; r++) {
        const cell = next[r][c];
        if (!isCellEmptyPlayable(cell)) continue;
        const dropRows = r < topEmptyCount ? Math.max(1, topEmptyCount) : 1;
        const newTile: Match3Tile = {
          uid: uidGen(),
          colorIndex: Math.floor(rng() * tileColorCount),
          special: 'none',
          dropRows,
          isNewSpawn: true,
        };
        cell.tile = newTile;
      }
    }
  };

  settleAndCollect();

  // 4. Collect gems sitting at the bottom-most non-hole row, then refill any vacated bottom slot
  for (let gemPass = 0; gemPass < rows; gemPass++) {
    const newlyCollected = collectBottomRowGems(next);
    if (newlyCollected.length === 0) break;
    allCollectedGems.push(...newlyCollected);
    settleAndCollect();
  }

  return {
    board: next,
    gemsCollectedCoords: allCollectedGems,
  };
}

interface WaveExecutionOutput {
  wave: CascadeWaveSnapshot;
  nextBoard: Match3Board;
  iceDestroyed: number;
  woodDestroyed: number;
  metalDestroyed: number;
  obstaclesDestroyed: number;
  gemsCollected: number;
  specialsCreated: number;
}

function executeClearAndCascadeWave(
  boardBeforeWave: Match3Board,
  stepIndex: number,
  matches: MatchGroup[],
  explicitBlastPlan: SpecialBlastPlan | null,
  tileColorCount: 4 | 5 | 6,
  rng: RngFn,
  uidGen: TileUidFactory,
): WaveExecutionOutput {
  const working = cloneBoard(boardBeforeWave);
  const multiplier = getCascadeMultiplier(stepIndex);

  const normalMatchMap = new Map<string, GridCoord>();
  const spawnedSpecials: { coord: GridCoord; type: SpecialTileType; colorIndex: number }[] = [];
  const skipTriggerKeys = new Set<string>();
  let specialCreationScore = 0;

  for (const group of matches) {
    for (const pt of group.cells) {
      normalMatchMap.set(keyOf(pt.r, pt.c), pt);
    }
    if (group.spawnSpecialAt && group.spawnSpecialType !== 'none') {
      spawnedSpecials.push({
        coord: group.spawnSpecialAt,
        type: group.spawnSpecialType,
        colorIndex: group.spawnSpecialType === 'rainbow' ? -1 : group.colorIndex,
      });
      skipTriggerKeys.add(keyOf(group.spawnSpecialAt.r, group.spawnSpecialAt.c));
      specialCreationScore += MATCH3_SCORING_CONFIG.specialCreationBonus[group.spawnSpecialType];
    }
  }

  // Collect any existing special tiles located inside normal matches
  const matchTriggeredSeeds: { coord: GridCoord; type: SpecialTileType; rainbowColor?: number }[] =
    [];
  for (const pt of normalMatchMap.values()) {
    const cell = working[pt.r][pt.c];
    if (cell.tile && cell.tile.special !== 'none') {
      matchTriggeredSeeds.push({
        coord: pt,
        type: cell.tile.special,
        rainbowColor:
          cell.tile.special === 'rainbow' ? findMostPopulousColor(working) : undefined,
      });
    }
  }

  const blastPlan: SpecialBlastPlan = explicitBlastPlan
    ? explicitBlastPlan
    : matchTriggeredSeeds.length > 0
      ? expandSpecialChain(working, matchTriggeredSeeds, skipTriggerKeys)
      : {
          affectedCoords: [],
          doubleDamageCoords: [],
          triggeredSpecials: [],
          bonusScore: 0,
          comboKey: null,
          rainbowTargets: [],
          rainbowOrigin: null,
        };

  const blastedMap = new Map<string, GridCoord>();
  for (const pt of blastPlan.affectedCoords) {
    blastedMap.set(keyOf(pt.r, pt.c), pt);
  }
  const doubleDamageKeys = new Set(blastPlan.doubleDamageCoords.map((pt) => keyOf(pt.r, pt.c)));

  const damageTally: DamageTally = {
    events: [],
    iceDestroyed: 0,
    woodDestroyed: 0,
    metalDestroyed: 0,
    obstaclesDestroyed: 0,
    gemsCollected: 0,
    gemsCollectedCoords: [],
    bonusScore: 0,
  };

  const allClearedMap = new Map<string, GridCoord>();
  const colorClearedCounts: Record<number, number> = {};
  let normalTilesCleared = 0;
  let blastedOnlyTilesCleared = 0;

  for (const [k, pt] of normalMatchMap.entries()) {
    allClearedMap.set(k, pt);
  }
  for (const [k, pt] of blastedMap.entries()) {
    allClearedMap.set(k, pt);
  }

  // Adjacent obstacle damage from normal matches (wood, metal-2, metal-1; stone is immune)
  const adjacentDamagedKeys = new Set<string>();
  for (const pt of normalMatchMap.values()) {
    for (const dir of ORTHO_DIRS) {
      const nr = pt.r + dir.r;
      const nc = pt.c + dir.c;
      if (!isInBounds(working, nr, nc)) continue;
      const nk = keyOf(nr, nc);
      if (adjacentDamagedKeys.has(nk) || allClearedMap.has(nk)) continue;
      const adjCell = working[nr][nc];
      if (adjCell.obstacle === 'wood' || adjCell.obstacle === 'metal-2' || adjCell.obstacle === 'metal-1') {
        adjacentDamagedKeys.add(nk);
        applySingleObstacleHit(adjCell, false, damageTally);
      }
    }
  }

  // Clear tiles and apply direct hits across matched + blasted cells
  for (const [k, pt] of allClearedMap.entries()) {
    const cell = working[pt.r][pt.c];
    if (cell.isHole) continue;

    const wasIce = cell.obstacle === 'ice';
    const wasSolid = isSolidBlocker(cell.obstacle);
    const wasGem = cell.obstacle === 'gem';

    if (cell.tile && !wasGem) {
      if (cell.tile.colorIndex >= 0) {
        colorClearedCounts[cell.tile.colorIndex] =
          (colorClearedCounts[cell.tile.colorIndex] ?? 0) + 1;
      }
      if (normalMatchMap.has(k)) {
        normalTilesCleared += 1;
      } else {
        blastedOnlyTilesCleared += 1;
      }
    }

    if (cell.obstacle) {
      applySingleObstacleHit(cell, true, damageTally);
      if (doubleDamageKeys.has(k)) {
        applySingleObstacleHit(cell, true, damageTally);
      }
    }

    // Clear playable tile if cell wasn't an intact metal/stone solid blocker or un-broken cell
    if (!wasSolid) {
      cell.tile = null;
    } else if (wasIce && cell.obstacle === '') {
      cell.tile = null;
    }
  }

  // Place newly synthesized special tiles (and remove any ice that sat under the match)
  for (const spawned of spawnedSpecials) {
    const cell = working[spawned.coord.r][spawned.coord.c];
    if (!cell.isHole && !isSolidBlocker(cell.obstacle)) {
      cell.tile = {
        uid: uidGen(),
        colorIndex: spawned.colorIndex,
        special: spawned.type,
        dropRows: 0,
        isNewSpawn: false,
      };
    }
  }

  const boardAfterClear = cloneBoard(working);
  const gravityResult = applyGravityAndRefill(working, tileColorCount, rng, uidGen);

  const totalGemsThisWave = damageTally.gemsCollected + gravityResult.gemsCollectedCoords.length;
  const extraBottomGemScore =
    gravityResult.gemsCollectedCoords.length * MATCH3_SCORING_CONFIG.gemCollectedBonus;

  const rawWaveScore =
    normalTilesCleared * MATCH3_SCORING_CONFIG.baseTilePoints +
    blastedOnlyTilesCleared * MATCH3_SCORING_CONFIG.blastedTilePoints +
    specialCreationScore +
    blastPlan.bonusScore +
    damageTally.bonusScore +
    extraBottomGemScore +
    (stepIndex > 0 ? stepIndex * MATCH3_SCORING_CONFIG.moveStreakBonusPerChain : 0);

  const scoreDelta = Math.round(rawWaveScore * multiplier);
  const totalClearedTiles = normalTilesCleared + blastedOnlyTilesCleared;

  const wave: CascadeWaveSnapshot = {
    stepIndex,
    clearedCoords: Array.from(normalMatchMap.values()),
    blastedCoords: Array.from(blastedMap.values()),
    spawnedSpecials,
    triggeredSpecials: blastPlan.triggeredSpecials,
    obstaclesDamaged: damageTally.events,
    gemsCollectedCoords: [...damageTally.gemsCollectedCoords, ...gravityResult.gemsCollectedCoords],
    scoreDelta,
    comboMultiplier: multiplier,
    tilesClearedCount: totalClearedTiles,
    colorClearedCounts,
    boardAfterClear,
    boardAfterGravity: cloneBoard(gravityResult.board),
  };

  return {
    wave,
    nextBoard: gravityResult.board,
    iceDestroyed: damageTally.iceDestroyed,
    woodDestroyed: damageTally.woodDestroyed,
    metalDestroyed: damageTally.metalDestroyed,
    obstaclesDestroyed: damageTally.obstaclesDestroyed,
    gemsCollected: totalGemsThisWave,
    specialsCreated: spawnedSpecials.length,
  };
}

function runCascadeLoop(
  initialBoard: Match3Board,
  initialWave: WaveExecutionOutput | null,
  isSpecialCombo: boolean,
  tileColorCount: 4 | 5 | 6,
  rng: RngFn,
  uidGen: TileUidFactory,
): SwapResolutionResult {
  let workingBoard = initialWave ? initialWave.nextBoard : cloneBoard(initialBoard);
  const waves: CascadeWaveSnapshot[] = [];

  let totalScoreDelta = 0;
  let totalTilesCleared = 0;
  let totalSpecialsCreated = 0;
  let totalObstaclesDestroyed = 0;
  let totalGemsCollected = 0;
  let iceDestroyed = 0;
  let woodDestroyed = 0;
  let metalDestroyed = 0;
  let maxComboMultiplier = 1;
  const colorClearedCounts: Record<number, number> = {};

  const accumulateWave = (out: WaveExecutionOutput) => {
    waves.push(out.wave);
    totalScoreDelta += out.wave.scoreDelta;
    totalTilesCleared += out.wave.tilesClearedCount;
    totalSpecialsCreated += out.specialsCreated;
    totalObstaclesDestroyed += out.obstaclesDestroyed;
    totalGemsCollected += out.gemsCollected;
    iceDestroyed += out.iceDestroyed;
    woodDestroyed += out.woodDestroyed;
    metalDestroyed += out.metalDestroyed;
    maxComboMultiplier = Math.max(maxComboMultiplier, out.wave.comboMultiplier);
    for (const [colorKey, count] of Object.entries(out.wave.colorClearedCounts)) {
      const idx = Number(colorKey);
      colorClearedCounts[idx] = (colorClearedCounts[idx] ?? 0) + count;
    }
  };

  if (initialWave) {
    accumulateWave(initialWave);
  }

  let stepIndex = initialWave ? 1 : 0;
  while (stepIndex < MATCH3_SCORING_CONFIG.maxCascadeIterations) {
    const matches = findAllMatches(workingBoard);
    if (matches.length === 0) break;

    const out = executeClearAndCascadeWave(
      workingBoard,
      stepIndex,
      matches,
      null,
      tileColorCount,
      rng,
      uidGen,
    );
    accumulateWave(out);
    workingBoard = out.nextBoard;
    stepIndex++;
  }

  return {
    valid: true,
    isSpecialCombo,
    waves,
    finalBoard: workingBoard,
    totalScoreDelta,
    totalTilesCleared,
    totalSpecialsCreated,
    totalSpecialCombosTriggered: isSpecialCombo ? 1 : 0,
    totalObstaclesDestroyed,
    totalGemsCollected,
    colorClearedCounts,
    iceDestroyed,
    woodDestroyed,
    metalDestroyed,
    cascadeCount: waves.length,
    maxComboMultiplier,
  };
}

/**
 * Resolves a player swap between two orthogonally adjacent cells, including special combos,
 * obstacle damage, gravity, diagonal slip, refill, and up to 25 cascading match waves.
 * Never mutates the input board.
 */
export function resolveSwap(
  board: Match3Board,
  from: GridCoord,
  to: GridCoord,
  tileColorCount: 4 | 5 | 6,
  rng: RngFn = Math.random,
  uidGen: TileUidFactory = createTileUidFactory('swap'),
): SwapResolutionResult {
  const validation = validateSwap(board, from, to);
  if (!validation.valid) {
    return createEmptyResult(board);
  }

  const swapped = cloneBoard(board);
  const cellA = swapped[from.r][from.c];
  const cellB = swapped[to.r][to.c];

  const tempTile = cellA.tile;
  cellA.tile = cellB.tile;
  cellB.tile = tempTile;

  // Keep gem carrier obstacle paired with its tile
  const tempObs: ObstacleType = cellA.obstacle === 'gem' ? 'gem' : '';
  if (cellB.obstacle === 'gem') {
    cellA.obstacle = 'gem';
  } else if (cellA.obstacle === 'gem') {
    cellA.obstacle = '';
  }
  if (tempObs === 'gem') {
    cellB.obstacle = 'gem';
  }

  if (validation.isSpecialCombo) {
    const blastPlan = resolveSpecialSwapCombo(swapped, from, to);
    const wave0 = executeClearAndCascadeWave(
      swapped,
      0,
      [],
      blastPlan,
      tileColorCount,
      rng,
      uidGen,
    );
    return runCascadeLoop(swapped, wave0, true, tileColorCount, rng, uidGen);
  }

  const initialMatches = findAllMatches(swapped, [to, from]);
  const wave0 = executeClearAndCascadeWave(
    swapped,
    0,
    initialMatches,
    null,
    tileColorCount,
    rng,
    uidGen,
  );
  return runCascadeLoop(swapped, wave0, false, tileColorCount, rng, uidGen);
}

/**
 * Resolves a targeted Hammer (1x1) or Bomb (3x3) booster strike on the board,
 * triggering any special tiles inside the impact footprint and running full follow-up cascades.
 */
export function resolveBoosterImpact(
  board: Match3Board,
  target: GridCoord,
  boosterType: 'hammer' | 'bomb',
  tileColorCount: 4 | 5 | 6,
  rng: RngFn = Math.random,
  uidGen: TileUidFactory = createTileUidFactory('booster'),
): SwapResolutionResult {
  if (!isInBounds(board, target.r, target.c) || board[target.r][target.c].isHole) {
    return createEmptyResult(board);
  }

  const working = cloneBoard(board);
  const directCoords: GridCoord[] = [];
  const seeds: { coord: GridCoord; type: SpecialTileType; rainbowColor?: number }[] = [];

  if (boosterType === 'hammer') {
    directCoords.push({ r: target.r, c: target.c });
  } else {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = target.r + dr;
        const nc = target.c + dc;
        if (isInBounds(working, nr, nc) && !working[nr][nc].isHole) {
          directCoords.push({ r: nr, c: nc });
        }
      }
    }
  }

  for (const pt of directCoords) {
    const cell = working[pt.r][pt.c];
    if (cell.tile && cell.tile.special !== 'none') {
      seeds.push({
        coord: pt,
        type: cell.tile.special,
        rainbowColor:
          cell.tile.special === 'rainbow' ? findMostPopulousColor(working) : undefined,
      });
    }
  }

  const chainPlan =
    seeds.length > 0
      ? expandSpecialChain(working, seeds)
      : {
          affectedCoords: [],
          doubleDamageCoords: [],
          triggeredSpecials: [],
          bonusScore: 0,
          comboKey: null,
          rainbowTargets: [],
          rainbowOrigin: null,
        };

  const affectedMap = new Map<string, GridCoord>();
  for (const pt of directCoords) affectedMap.set(keyOf(pt.r, pt.c), pt);
  for (const pt of chainPlan.affectedCoords) affectedMap.set(keyOf(pt.r, pt.c), pt);

  const blastPlan: SpecialBlastPlan = {
    affectedCoords: Array.from(affectedMap.values()),
    doubleDamageCoords: chainPlan.doubleDamageCoords,
    triggeredSpecials: chainPlan.triggeredSpecials,
    bonusScore: chainPlan.bonusScore + (boosterType === 'bomb' ? 150 : 75),
    comboKey: null,
    rainbowTargets: chainPlan.rainbowTargets,
    rainbowOrigin: chainPlan.rainbowOrigin,
  };

  const wave0 = executeClearAndCascadeWave(
    working,
    0,
    [],
    blastPlan,
    tileColorCount,
    rng,
    uidGen,
  );
  return runCascadeLoop(working, wave0, false, tileColorCount, rng, uidGen);
}
