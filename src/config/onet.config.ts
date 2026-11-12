/**
 * Onet Gameplay Configuration, 4-Band Sawtooth Difficulty Curve & Daily Sprint Settings.
 * Owned by @onet-eng.
 */

import type { DdaBracket, DifficultyBand, GameMode, StarRating } from '@/types/game.types';
import type { OnetGravityMode, OnetLevelConfig, OnetStarThresholds } from '@/types/onet.types';

export const ONET_SCORING_CONFIG = {
  basePointsBySpan: {
    '1x1': 100,
    '1x2': 150,
    '2x1': 150,
    '2x2': 200,
  } as const,
  comboWindowMs: 4000,
  comboBonusPerChain: 15,
  timeBonusPerRemainingSec: 20,
  extraTimeBoosterSec: 15,
  lowTimeWarningThresholdSec: 15,
  idleHintPromptSec: 10,
} as const;

export const ONET_DEFAULT_STAR_THRESHOLDS: OnetStarThresholds = {
  oneStarMin: 1,
  twoStarMinRatioRemainingTime: 0.25,
  threeStarMinRatioRemainingTime: 0.45,
  threeStarMaxMistakes: 1,
  threeStarMaxBoosters: 0,
};

export const ONET_BOSS_STAR_THRESHOLDS: OnetStarThresholds = {
  oneStarMin: 1,
  twoStarMinRatioRemainingTime: 0.2,
  threeStarMinRatioRemainingTime: 0.35,
  threeStarMaxMistakes: 2,
  threeStarMaxBoosters: 0,
};

/**
 * Fallback tile icon pool matching bundled `/public/art/candy/{0..15}.webp`
 * when ThemeContext is absent in pure unit tests or pre-mount renders.
 */
export const ONET_FALLBACK_TILE_POOL: readonly string[] = Array.from(
  { length: 16 },
  (_, index) => `/art/candy/${index}.webp`,
);

export function resolveOnetDifficultyBand(level: number): DifficultyBand {
  const safeLevel = Math.max(1, Math.floor(level));
  if (safeLevel <= 5) return 'onboarding';
  if (safeLevel <= 15) return 'intermediate';
  if (safeLevel <= 35) return 'advanced';
  return 'expert';
}

export function resolveOnetDdaBracket(
  skillRating: number,
  consecutiveFailures: number,
): DdaBracket {
  if (consecutiveFailures >= 3) return 'pity';
  if (skillRating < 38) return 'easy';
  if (skillRating > 72) return 'hard';
  return 'normal';
}

function resolveGridForLevel(level: number): { rows: number; cols: number } {
  if (level <= 2) return { rows: 6, cols: 4 }; // 24 cells — brisk tutorial intro
  if (level <= 5) return { rows: 6, cols: 6 }; // 36 cells — onboarding expansion
  if (level <= 10) return { rows: 8, cols: 6 }; // 48 cells — intermediate portrait grid
  return { rows: 10, cols: 6 }; // 60 cells — full portrait challenge grid
}

function resolveGravityForLevel(
  level: number,
  isBoss: boolean,
  isBreather: boolean,
): OnetGravityMode {
  if (isBreather) return level >= 20 ? 'down' : 'none';
  if (isBoss) return level >= 20 ? 'alternating' : 'inward';
  if (level <= 6) return 'none';
  if (level <= 10) return level % 2 === 1 ? 'down' : 'left';
  if (level <= 20) {
    const cycle: OnetGravityMode[] = ['down', 'left', 'inward', 'up'];
    return cycle[level % cycle.length];
  }
  const cycle: OnetGravityMode[] = [
    'down',
    'left',
    'right',
    'inward',
    'split_horizontal',
    'alternating',
  ];
  return cycle[level % cycle.length];
}

export interface BuildOnetLevelOptions {
  mode?: GameMode;
  skillRating?: number;
  consecutiveFailures?: number;
  seed?: number;
  dailyDateKey?: string;
}

/**
 * Deterministic daily seed hash from `YYYY-MM-DD`.
 */
export function hashDailyOnetSeed(dateKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Builds an OnetLevelConfig for either Campaign (`mode: 'normal'`) or Daily Challenge Sprint (`mode: 'daily'`).
 * Enforces the 4-band sawtooth curve, Boss (`L % 10 === 0`), Breather (`L > 5 && L % 5 === 1`),
 * and DDA adjustments (`pity` / `easy` / `normal` / `hard`).
 */
export function getOnetLevelConfig(
  level: number,
  options: BuildOnetLevelOptions = {},
): OnetLevelConfig {
  const mode: GameMode = options.mode ?? 'normal';
  const safeLevel = Math.max(1, Math.floor(level));

  if (mode === 'daily') {
    const dailySeed =
      options.seed ?? (options.dailyDateKey ? hashDailyOnetSeed(options.dailyDateKey) : 90_210);
    return {
      level: safeLevel,
      mode: 'daily',
      band: 'intermediate',
      isBoss: false,
      isBreather: false,
      ddaBracket: 'normal',
      rows: 8,
      cols: 6,
      tileVariety: 12,
      baseTimeLimitSec: 90,
      timeLimitSec: 90,
      multiGroups: {
        count2x2: 1,
        count1x2: 1,
        count2x1: 0,
      },
      arrowPairCount: 2,
      gravityMode: 'down',
      blockerCount: 0,
      stars: ONET_DEFAULT_STAR_THRESHOLDS,
      seed: dailySeed,
    };
  }

  const band = resolveOnetDifficultyBand(safeLevel);
  const isBoss = safeLevel >= 10 && safeLevel % 10 === 0;
  const isBreather = !isBoss && safeLevel > 5 && safeLevel % 5 === 1;
  const ddaBracket = resolveOnetDdaBracket(
    options.skillRating ?? 50,
    options.consecutiveFailures ?? 0,
  );
  const { rows, cols } = resolveGridForLevel(safeLevel);
  const totalCells = rows * cols;

  // Base tile variety (always <= 16 bundled icons per theme)
  let tileVariety = 6;
  if (safeLevel <= 2) tileVariety = 6;
  else if (safeLevel <= 5) tileVariety = 7 + (safeLevel >= 4 ? 1 : 0);
  else if (safeLevel <= 15) tileVariety = Math.min(12, 8 + Math.floor((safeLevel - 5) / 2));
  else if (safeLevel <= 35) tileVariety = Math.min(15, 11 + Math.floor((safeLevel - 15) / 5));
  else tileVariety = Math.min(16, 14 + Math.floor((safeLevel - 36) / 10));

  // Base timer sawtooth (150s -> 80s baseline before boss/breather/DDA)
  let baseTimeLimitSec = 150;
  if (safeLevel <= 5) {
    baseTimeLimitSec = 150 - (safeLevel - 1) * 6; // 150 -> 126
  } else if (safeLevel <= 15) {
    baseTimeLimitSec = 125 - (safeLevel - 6) * 2; // 125 -> 107
  } else if (safeLevel <= 35) {
    baseTimeLimitSec = 108 - Math.floor((safeLevel - 16) * 1.1); // 108 -> 86
  } else {
    baseTimeLimitSec = Math.max(78, 92 - Math.floor((safeLevel - 36) * 0.4));
  }

  // Multi-cell split counts — capped by grid area so pair generation stays roomy
  let count2x2 = 0;
  let count1x2 = 0;
  let count2x1 = 0;
  if (safeLevel === 3) {
    count1x2 = 1;
  } else if (safeLevel <= 5) {
    count2x2 = 1;
    count1x2 = 1;
  } else if (safeLevel <= 15) {
    count2x2 = safeLevel >= 10 ? 2 : 1;
    count1x2 = 1;
    count2x1 = safeLevel >= 12 ? 1 : 0;
  } else if (safeLevel <= 35) {
    count2x2 = 2;
    count1x2 = 2;
    count2x1 = 1;
  } else {
    count2x2 = 2;
    count1x2 = 2;
    count2x1 = 2;
  }

  // Arrow-gated tile pairs
  let arrowPairCount = 0;
  if (safeLevel >= 8 && safeLevel <= 15) {
    arrowPairCount = safeLevel >= 12 ? 2 : 1;
  } else if (safeLevel >= 16 && safeLevel <= 35) {
    arrowPairCount = Math.min(4, 2 + Math.floor((safeLevel - 16) / 8));
  } else if (safeLevel >= 36) {
    arrowPairCount = Math.min(6, 4 + Math.floor((safeLevel - 36) / 12));
  }

  // Symmetric static blockers (always even so remaining playable cells stay even)
  let blockerCount = 0;
  if (totalCells >= 60) {
    if (isBoss) blockerCount = 4;
    else if (safeLevel >= 18 && safeLevel % 4 === 0) blockerCount = 2;
    else if (safeLevel >= 38 && safeLevel % 3 === 0) blockerCount = 4;
  }

  // Boss & Breather sawtooth overrides
  if (isBoss) {
    baseTimeLimitSec = Math.max(75, Math.round(baseTimeLimitSec * 0.9));
    arrowPairCount = Math.min(6, arrowPairCount + 1);
    tileVariety = Math.min(16, tileVariety + 1);
  } else if (isBreather) {
    baseTimeLimitSec += 20;
    tileVariety = Math.max(6, tileVariety - 2);
    blockerCount = 0;
    arrowPairCount = Math.max(0, arrowPairCount - 1);
    count2x2 = Math.min(1, count2x2);
  }

  // DDA adjustments
  let timeLimitSec = baseTimeLimitSec;
  if (ddaBracket === 'pity') {
    timeLimitSec += 20;
    tileVariety = Math.max(6, tileVariety - 2);
    blockerCount = 0;
    arrowPairCount = Math.max(0, arrowPairCount - 1);
  } else if (ddaBracket === 'easy') {
    timeLimitSec += 12;
    tileVariety = Math.max(6, tileVariety - 1);
  } else if (ddaBracket === 'hard') {
    timeLimitSec = Math.max(75, timeLimitSec - 6);
  }

  // Clamp variety to max feasible distinct pairs given playable cells
  const playableCells = totalCells - blockerCount;
  const maxPairs = Math.floor(playableCells / 2);
  tileVariety = Math.max(4, Math.min(tileVariety, maxPairs));

  return {
    level: safeLevel,
    mode,
    band,
    isBoss,
    isBreather,
    ddaBracket,
    rows,
    cols,
    tileVariety,
    baseTimeLimitSec,
    timeLimitSec,
    multiGroups: {
      count2x2,
      count1x2,
      count2x1,
    },
    arrowPairCount,
    gravityMode: resolveGravityForLevel(safeLevel, isBoss, isBreather),
    blockerCount,
    stars: isBoss ? ONET_BOSS_STAR_THRESHOLDS : ONET_DEFAULT_STAR_THRESHOLDS,
    seed: options.seed,
  };
}

export function clampStarRating(value: number): StarRating {
  if (value >= 3) return 3;
  if (value === 2) return 2;
  if (value === 1) return 1;
  return 0;
}
