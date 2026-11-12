/**
 * Pure Match 3 Scoring, Cascade Multiplier, Mission Evaluation & Result Payload Helpers.
 * Zero React/DOM/Storage dependencies.
 * Owned by @match3-eng.
 */

import { MATCH3_DDA_CONFIG, MATCH3_SCORING_CONFIG } from '@/config/match3.config';
import type {
  BoosterId,
  GameResultPayload,
  Match3BoosterId,
  StarRating,
} from '@/types/game.types';
import type {
  Match3LevelConfig,
  Match3Objective,
  Match3ProgressCounters,
} from '@/types/match3.types';

export interface ObjectiveEvaluation {
  current: number;
  target: number;
  completed: boolean;
}

/**
 * Computes cascade multiplier for 0-based wave index `stepIndex`:
 * Wave 0 -> 1.00x, Wave 1 -> 1.25x, Wave 2 -> 1.50x ... capped at 4.00x.
 */
export function getCascadeMultiplier(stepIndex: number): number {
  const safeStep = Math.max(0, Math.floor(stepIndex));
  const raw = 1 + safeStep * MATCH3_SCORING_CONFIG.cascadeMultiplierStep;
  return Math.min(MATCH3_SCORING_CONFIG.cascadeMultiplierMax, Number(raw.toFixed(2)));
}

/**
 * Evaluates current progress against a single Match 3 level objective.
 */
export function evaluateObjectiveProgress(
  objective: Match3Objective,
  progress: Match3ProgressCounters,
): ObjectiveEvaluation {
  const target = Math.max(1, objective.target);

  switch (objective.type) {
    case 'score':
      return {
        current: progress.score,
        target,
        completed: progress.score >= target,
      };
    case 'clear_tiles':
      return {
        current: progress.tilesCleared,
        target,
        completed: progress.tilesCleared >= target,
      };
    case 'collect_color': {
      const colorIdx = objective.colorIndex ?? 0;
      const count = progress.colorCollected[colorIdx] ?? 0;
      return {
        current: count,
        target,
        completed: count >= target,
      };
    }
    case 'destroy_ice':
      return {
        current: progress.iceDestroyed,
        target,
        completed: progress.iceDestroyed >= target,
      };
    case 'destroy_wood':
      return {
        current: progress.woodDestroyed,
        target,
        completed: progress.woodDestroyed >= target,
      };
    case 'destroy_metal':
      return {
        current: progress.metalDestroyed,
        target,
        completed: progress.metalDestroyed >= target,
      };
    case 'collect_gems':
      return {
        current: progress.gemsCollected,
        target,
        completed: progress.gemsCollected >= target,
      };
    case 'create_specials':
      return {
        current: progress.specialsCreated,
        target,
        completed: progress.specialsCreated >= target,
      };
    case 'max_moves':
      return {
        current: progress.movesUsed,
        target,
        completed: progress.movesUsed <= target,
      };
    default:
      return {
        current: 0,
        target,
        completed: false,
      };
  }
}

/**
 * Evaluates all 3 mission objectives for a Match 3 level.
 * Note: mission[0] is always the primary victory objective.
 */
export function evaluateMissions(
  missions: [Match3Objective, Match3Objective, Match3Objective],
  progress: Match3ProgressCounters,
): [boolean, boolean, boolean] {
  return [
    evaluateObjectiveProgress(missions[0], progress).completed,
    evaluateObjectiveProgress(missions[1], progress).completed,
    evaluateObjectiveProgress(missions[2], progress).completed,
  ];
}

/**
 * Computes Match 3 star rating on completion from score thresholds and optional bonus missions.
 * Any victory grants at least 1 star.
 */
export function evaluateMatch3Stars(
  score: number,
  thresholds: [number, number, number],
  isWinner: boolean,
  missionResults?: [boolean, boolean, boolean],
): StarRating {
  if (!isWinner) return 0;

  let stars: StarRating = 1;
  if (score >= thresholds[2] || (missionResults?.[1] && missionResults?.[2] && score >= thresholds[1])) {
    stars = 3;
  } else if (score >= thresholds[1] || missionResults?.[1]) {
    stars = 2;
  }
  return stars;
}

/**
 * Updates the Match 3 DDA skill EMA (alpha = 0.3, clamped 0..100).
 */
export function calculateMatch3SkillEma(
  previousEma: number,
  stars: StarRating,
  movesRemaining: number,
  maxMoves: number,
  isWinner: boolean,
): number {
  const safeMaxMoves = Math.max(1, maxMoves);
  const ratioRemaining = Math.max(0, Math.min(1, movesRemaining / safeMaxMoves));
  const roundPerformance = isWinner
    ? 50 + Math.max(0, stars - 1) * 15 + Math.round(ratioRemaining * 20)
    : 20;

  const alpha = MATCH3_DDA_CONFIG.skillEmaAlpha;
  const updated = previousEma * (1 - alpha) + roundPerformance * alpha;
  return Math.max(0, Math.min(100, Math.round(updated)));
}

export interface BuildMatch3ResultParams {
  runId: string;
  config: Match3LevelConfig;
  isWinner: boolean;
  score: number;
  timeElapsedMs: number;
  movesUsed: number;
  movesRemaining: number;
  matches: number;
  highestCombo: number;
  mistakes: number;
  progress: Match3ProgressCounters;
  missionResults: [boolean, boolean, boolean];
  boostersUsed: Partial<Record<Match3BoosterId, number>>;
  isDailyChallenge: boolean;
  dailyDateKey: string | null;
}

/**
 * Builds the canonical `GameResultPayload` expected by `RewardEngine.commitRoundResult`.
 */
export function buildMatch3ResultPayload(params: BuildMatch3ResultParams): GameResultPayload {
  const stars = evaluateMatch3Stars(
    params.score,
    params.config.starScoreThresholds,
    params.isWinner,
    params.missionResults,
  );
  const boosterMap: Partial<Record<BoosterId, number>> = { ...params.boostersUsed };
  const totalBoostersUsed = Object.values(boosterMap).reduce<number>(
    (sum, n) => sum + (typeof n === 'number' ? n : 0),
    0,
  );

  return {
    game: 'match3',
    runId: params.runId,
    level: params.config.level,
    isWinner: params.isWinner,
    isFlawless: params.isWinner && params.mistakes === 0 && totalBoostersUsed === 0 && stars === 3,
    stars,
    score: Math.max(0, Math.round(params.score)),
    timeElapsedMs: Math.max(0, Math.round(params.timeElapsedMs)),
    movesUsed: Math.max(0, params.movesUsed),
    movesRemaining: Math.max(0, params.movesRemaining),
    matches: Math.max(0, params.matches),
    tilesCleared: Math.max(0, params.progress.tilesCleared),
    specialsCreated: Math.max(0, params.progress.specialsCreated),
    obstaclesDestroyed: Math.max(0, params.progress.obstaclesDestroyed),
    highestCombo: Math.max(0, params.highestCombo),
    mistakes: Math.max(0, params.mistakes),
    boostersUsed: boosterMap,
    isDailyChallenge: params.isDailyChallenge,
    dailyDateKey: params.dailyDateKey,
  };
}
