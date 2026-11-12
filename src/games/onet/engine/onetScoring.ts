/**
 * Onet Pure Scoring, Star Evaluation & Persistence Snapshot Serialization.
 * Owned by @onet-eng.
 */

import { ONET_DEFAULT_STAR_THRESHOLDS, ONET_SCORING_CONFIG } from '@/config/onet.config';
import type { StarRating } from '@/types/game.types';
import type {
  OnetBoard,
  OnetFinalScoreResult,
  OnetMatchScoreBreakdown,
  OnetStarThresholds,
  OnetTileFootprint,
} from '@/types/onet.types';
import type { OnetTileCellSnapshot } from '@/types/persistence.types';
import { footprintFromSpan } from './boardGenerator';
import { groupSize, isBlockerCell, isMasterCell, isSlaveCell } from './pathfinding';

export interface ComputeMatchScoreInput {
  footprint: OnetTileFootprint;
  currentCombo: number;
  isComboActive: boolean;
}

export function computeMatchScore(input: ComputeMatchScoreInput): OnetMatchScoreBreakdown {
  const basePoints = ONET_SCORING_CONFIG.basePointsBySpan[input.footprint] ?? 100;
  const nextCombo = input.isComboActive ? Math.max(1, input.currentCombo + 1) : 1;
  const comboBonus = Math.max(0, nextCombo - 1) * ONET_SCORING_CONFIG.comboBonusPerChain;

  return {
    basePoints,
    comboBonus,
    totalPoints: basePoints + comboBonus,
    nextCombo,
  };
}

export function computeVictoryTimeBonus(remainingTimeMs: number): number {
  const remainingWholeSec = Math.max(0, Math.floor(remainingTimeMs / 1000));
  return remainingWholeSec * ONET_SCORING_CONFIG.timeBonusPerRemainingSec;
}

export interface ComputeOnetFinalScoreInput {
  isWinner: boolean;
  accumulatedScore: number;
  remainingTimeMs: number;
  totalTimeMs: number;
  mistakes: number;
  totalBoostersUsed: number;
  thresholds?: OnetStarThresholds;
}

export function computeOnetFinalScore(
  input: ComputeOnetFinalScoreInput,
): OnetFinalScoreResult {
  if (!input.isWinner) {
    return {
      score: Math.max(0, Math.floor(input.accumulatedScore)),
      timeBonus: 0,
      stars: 0,
      isFlawless: false,
    };
  }

  const thresholds = input.thresholds ?? ONET_DEFAULT_STAR_THRESHOLDS;
  const timeBonus = computeVictoryTimeBonus(input.remainingTimeMs);
  const totalScore = Math.max(0, Math.floor(input.accumulatedScore + timeBonus));
  const safeTotalMs = Math.max(1, input.totalTimeMs);
  const remainingRatio = Math.max(0, input.remainingTimeMs) / safeTotalMs;
  const isFlawless = input.mistakes === 0 && input.totalBoostersUsed === 0;

  let stars: StarRating = 1;
  if (
    remainingRatio >= thresholds.threeStarMinRatioRemainingTime &&
    input.mistakes <= thresholds.threeStarMaxMistakes &&
    input.totalBoostersUsed <= thresholds.threeStarMaxBoosters
  ) {
    stars = 3;
  } else if (
    remainingRatio >= thresholds.twoStarMinRatioRemainingTime ||
    isFlawless
  ) {
    stars = 2;
  }

  return {
    score: totalScore,
    timeBonus,
    stars,
    isFlawless,
  };
}

const BLOCKER_SNAPSHOT_ICON = '__BLOCKER__';

export function boardToSnapshot(board: OnetBoard): (OnetTileCellSnapshot | null)[][] {
  return board.map((row) =>
    row.map((cell): OnetTileCellSnapshot | null => {
      if (!cell) return null;
      if (isBlockerCell(cell)) {
        return {
          id: cell.id,
          icon: BLOCKER_SNAPSHOT_ICON,
          footprint: '1x1',
          obstacleType: 'locked',
        };
      }
      if (isSlaveCell(cell)) {
        return {
          id: cell.id,
          icon: '',
          footprint: '1x1',
          isSlave: true,
          masterR: cell.masterR,
          masterC: cell.masterC,
        };
      }
      if (isMasterCell(cell)) {
        const { rowSpan, colSpan } = groupSize(cell);
        return {
          id: cell.id,
          icon: cell.icon,
          footprint: footprintFromSpan(rowSpan, colSpan),
          shiftDirection: cell.openSide ?? 'none',
          obstacleType: 'none',
        };
      }
      return null;
    }),
  );
}

function spanFromFootprint(footprint: OnetTileCellSnapshot['footprint']): {
  rowSpan: 1 | 2;
  colSpan: 1 | 2;
} {
  switch (footprint) {
    case '2x2':
      return { rowSpan: 2, colSpan: 2 };
    case '1x2':
      return { rowSpan: 1, colSpan: 2 };
    case '2x1':
      return { rowSpan: 2, colSpan: 1 };
    default:
      return { rowSpan: 1, colSpan: 1 };
  }
}

export function snapshotToBoard(
  snapshot: (OnetTileCellSnapshot | null)[][],
  activeThemeKey = 'candy',
): OnetBoard {
  return snapshot.map((row) =>
    row.map((cell) => {
      if (!cell) return null;
      if (cell.icon === BLOCKER_SNAPSHOT_ICON || cell.obstacleType === 'locked') {
        return {
          id: cell.id,
          isBlocker: true,
          obstacleType: 'stone',
        };
      }
      if (cell.isSlave && typeof cell.masterR === 'number' && typeof cell.masterC === 'number') {
        return {
          id: cell.id,
          isSlave: true,
          masterR: cell.masterR,
          masterC: cell.masterC,
        };
      }
      const { rowSpan, colSpan } = spanFromFootprint(cell.footprint);
      const openSide =
        cell.shiftDirection && cell.shiftDirection !== 'none' ? cell.shiftDirection : null;
      return {
        id: cell.id,
        icon: cell.icon,
        themeKey: activeThemeKey,
        rowSpan,
        colSpan,
        openSide,
        splitAxis: 'h',
        footprint: cell.footprint,
      };
    }),
  );
}
