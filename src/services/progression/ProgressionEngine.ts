/**
 * Player Progression Engine — Global Account XP, Ranks & Independent Onet / Match 3 Level Trees
 * Owned by: @progression-designer
 */

import {
  getNextRankForLevel,
  getRankForLevel,
  ROUND_XP_CONFIG,
  XP_CURVE,
  type XpRankDefinition,
} from '../../config/progression.config';
import type { GameId, GameResultPayload, StarRating } from '../../types/game.types';
import type {
  ConnectifySaveDataV1,
  GameModeProgressionState,
  LevelMasteryRecord,
} from '../../types/persistence.types';

export interface AccountProgressSummary {
  xp: number;
  level: number;
  title: string;
  titleEn: string;
  badge: string;
  currentXpInLevel: number;
  xpNeededForNext: number;
  percent: number;
  nextRank: XpRankDefinition | null;
}

export interface ModeProgressionUpdateResult {
  isFirstClear: boolean;
  previousStars: StarRating;
  newStars: StarRating;
  starDelta: number;
  isNewBestScore: boolean;
  previousHighestUnlocked: number;
  newHighestUnlocked: number;
}

export function getAccountProgress(totalXp: number): AccountProgressSummary {
  const xp = Math.max(0, Math.floor(Number.isFinite(totalXp) ? totalXp : 0));
  const level = XP_CURVE.levelFromXp(xp);
  const floorXp = XP_CURVE.xpForLevel(level);
  const nextXp = XP_CURVE.xpForLevel(level + 1);
  const needed = Math.max(1, nextXp - floorXp);
  const current = Math.max(0, xp - floorXp);
  const rank = getRankForLevel(level);

  return {
    xp,
    level,
    title: rank.titleId,
    titleEn: rank.titleEn,
    badge: rank.badge,
    currentXpInLevel: current,
    xpNeededForNext: needed,
    percent: Math.min(100, Math.max(0, (current / needed) * 100)),
    nextRank: getNextRankForLevel(level),
  };
}

/**
 * Computes round XP with Onet vs Match 3 hourly parity (~1.014 ratio).
 */
export function computeRoundXp(payload: GameResultPayload, isFirstClear: boolean): number {
  const stars = Math.min(3, Math.max(0, Math.floor(payload.stars || 0))) as StarRating;

  if (payload.game === 'onet') {
    const cfg = ROUND_XP_CONFIG.onet;
    if (!payload.isWinner) {
      return Math.min(cfg.lossMaxXp, Math.max(0, Math.floor(payload.score / cfg.lossScoreDivisor)));
    }
    const totalTimeSec = Math.max(1, payload.totalTimeSec ?? 120);
    const remainingRatio = (payload.remainingTimeSec ?? 0) / totalTimeSec;
    const raw =
      cfg.baseWinXp +
      cfg.starBonusXp[stars] +
      (payload.isFlawless ? cfg.flawlessBonusXp : 0) +
      Math.min(cfg.maxComboXp, Math.max(0, payload.highestCombo) * cfg.comboXpPerChain) +
      (remainingRatio >= cfg.speedBonusMinTimeRatio ? cfg.speedBonusXp : 0) +
      (isFirstClear ? cfg.firstTimeClearBonusXp : 0) +
      (payload.isDailyChallenge ? ROUND_XP_CONFIG.dailyChallengeWinBonusXp : 0);

    return isFirstClear || payload.isDailyChallenge ? raw : Math.round(raw * cfg.replayMultiplier);
  }

  // Match 3
  const cfg = ROUND_XP_CONFIG.match3;
  if (!payload.isWinner) {
    return Math.min(cfg.lossMaxXp, Math.max(0, Math.floor(payload.score / cfg.lossScoreDivisor)));
  }
  const raw =
    cfg.baseWinXp +
    cfg.starBonusXp[stars] +
    Math.min(cfg.maxCascadeXp, Math.max(0, payload.highestCombo) * cfg.cascadeBonusXpPerChain) +
    Math.min(cfg.maxSpecialXp, Math.max(0, payload.specialsCreated ?? 0) * cfg.specialTileActivationXp) +
    (isFirstClear ? cfg.firstTimeClearBonusXp : 0) +
    (payload.isDailyChallenge ? ROUND_XP_CONFIG.dailyChallengeWinBonusXp : 0);

  return isFirstClear || payload.isDailyChallenge ? raw : Math.round(raw * cfg.replayMultiplier);
}

/**
 * Applies XP to profile draft and synchronizes derived level & rankTitle.
 */
export function applyAccountXp(draft: ConnectifySaveDataV1, xpDelta: number): {
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
} {
  const previousLevel = XP_CURVE.levelFromXp(draft.profile.xp);
  const safeDelta = Math.max(0, Math.floor(Number.isFinite(xpDelta) ? xpDelta : 0));
  draft.profile.xp = Math.max(0, draft.profile.xp + safeDelta);
  const summary = getAccountProgress(draft.profile.xp);
  draft.profile.level = summary.level;
  draft.profile.rankTitle = summary.title;
  return {
    previousLevel,
    newLevel: summary.level,
    leveledUp: summary.level > previousLevel,
  };
}

function updateDdaSkillEma(
  currentSkill: number,
  won: boolean,
  stars: StarRating,
  consecutiveFailures: number,
): number {
  let matchSkill = won ? 50 + stars * 10 : 15;
  matchSkill -= Math.min(25, consecutiveFailures * 5);
  const clampedMatch = Math.max(0, Math.min(100, matchSkill));
  return Math.round(clampedMatch * 0.3 + currentSkill * 0.7);
}

/**
 * Updates independent Onet or Match 3 progression tree.
 * Enforces non-downgrading stars & high scores and never locks either mode behind the other.
 */
export function updateGameModeProgression(
  draft: ConnectifySaveDataV1,
  payload: GameResultPayload,
  nowMs: number = Date.now(),
): ModeProgressionUpdateResult {
  const modeState: GameModeProgressionState = draft.progression[payload.game];
  const previousHighestUnlocked = Math.max(1, modeState.highestUnlockedLevel);

  // Daily challenge runs do not mutate normal level tree records
  if (payload.isDailyChallenge) {
    draft.profile.currentWinStreak = payload.isWinner ? draft.profile.currentWinStreak + 1 : 0;
    draft.profile.bestWinStreak = Math.max(draft.profile.bestWinStreak, draft.profile.currentWinStreak);
    return {
      isFirstClear: false,
      previousStars: 0,
      newStars: payload.stars,
      starDelta: 0,
      isNewBestScore: payload.score > modeState.allTimeHighScore,
      previousHighestUnlocked,
      newHighestUnlocked: previousHighestUnlocked,
    };
  }

  const level = Math.max(1, Math.floor(payload.level));
  const existing: LevelMasteryRecord = modeState.levels[level] ?? {
    level,
    completed: false,
    stars: 0,
    highScore: 0,
    bestTimeMs: null,
    bestMovesRemaining: null,
    attempts: 0,
    wins: 0,
    consecutiveFailures: 0,
    firstClearedAt: null,
    lastClearedAt: null,
  };

  const isFirstClear = payload.isWinner && !existing.completed;
  const previousStars = existing.stars;
  const earnedStars = payload.isWinner ? (Math.min(3, Math.max(1, payload.stars || 1)) as StarRating) : 0;
  const nextStars = Math.max(previousStars, earnedStars) as StarRating;
  const starDelta = Math.max(0, nextStars - previousStars);
  const isNewBestScore = payload.score > existing.highScore;

  const updatedRecord: LevelMasteryRecord = {
    level,
    completed: existing.completed || payload.isWinner,
    stars: nextStars,
    highScore: Math.max(existing.highScore, Math.max(0, Math.floor(payload.score))),
    bestTimeMs:
      payload.isWinner && payload.timeElapsedMs > 0
        ? existing.bestTimeMs === null
          ? payload.timeElapsedMs
          : Math.min(existing.bestTimeMs, payload.timeElapsedMs)
        : existing.bestTimeMs,
    bestMovesRemaining:
      payload.isWinner && payload.movesRemaining !== undefined
        ? existing.bestMovesRemaining === null
          ? payload.movesRemaining
          : Math.max(existing.bestMovesRemaining, payload.movesRemaining)
        : existing.bestMovesRemaining,
    attempts: existing.attempts + 1,
    wins: existing.wins + (payload.isWinner ? 1 : 0),
    consecutiveFailures: payload.isWinner ? 0 : existing.consecutiveFailures + 1,
    firstClearedAt: payload.isWinner ? (existing.firstClearedAt ?? nowMs) : existing.firstClearedAt,
    lastClearedAt: payload.isWinner ? nowMs : existing.lastClearedAt,
  };

  modeState.levels[level] = updatedRecord;
  modeState.allTimeHighScore = Math.max(modeState.allTimeHighScore, updatedRecord.highScore);
  modeState.totalStars = Object.values(modeState.levels).reduce((sum, rec) => sum + rec.stars, 0);
  modeState.skillRating = updateDdaSkillEma(
    modeState.skillRating,
    payload.isWinner,
    earnedStars,
    updatedRecord.consecutiveFailures,
  );

  if (payload.isWinner && level >= modeState.highestUnlockedLevel) {
    modeState.highestUnlockedLevel = level + 1;
    modeState.currentLevel = modeState.highestUnlockedLevel;
  }

  draft.profile.currentWinStreak = payload.isWinner ? draft.profile.currentWinStreak + 1 : 0;
  draft.profile.bestWinStreak = Math.max(draft.profile.bestWinStreak, draft.profile.currentWinStreak);

  return {
    isFirstClear,
    previousStars,
    newStars: nextStars,
    starDelta,
    isNewBestScore,
    previousHighestUnlocked,
    newHighestUnlocked: modeState.highestUnlockedLevel,
  };
}

/**
 * Updates global and mode-specific gameplay statistics on round completion.
 */
export function updateGameplayStatistics(draft: ConnectifySaveDataV1, payload: GameResultPayload): void {
  const s = draft.statistics;
  const safeScore = Math.max(0, Math.floor(payload.score));
  const safeTimeMs = Math.max(0, Math.floor(payload.timeElapsedMs));
  const safeCombo = Math.max(0, Math.floor(payload.highestCombo));

  s.totalGamesPlayed += 1;
  if (payload.isWinner) {
    s.totalWins += 1;
    if (payload.isFlawless) s.totalFlawlessWins += 1;
  } else {
    s.totalLosses += 1;
  }
  s.totalScore += safeScore;
  s.highestSingleScore = Math.max(s.highestSingleScore, safeScore);
  s.highestCombo = Math.max(s.highestCombo, safeCombo);
  s.totalPlayTimeMs += safeTimeMs;

  let roundBoosters = 0;
  for (const count of Object.values(payload.boostersUsed || {})) {
    roundBoosters += Math.max(0, Math.floor(count ?? 0));
  }
  s.totalBoostersUsed += roundBoosters;

  if (payload.game === 'onet') {
    const o = s.onet;
    o.gamesPlayed += 1;
    if (payload.isWinner) o.wins += 1;
    o.highScore = Math.max(o.highScore, safeScore);
    o.bestCombo = Math.max(o.bestCombo, safeCombo);
    o.totalPairsMatched += Math.max(0, Math.floor(payload.matches));
    o.totalSplits += Math.max(0, Math.floor(payload.splits ?? 0));
    o.totalPlayTimeMs += safeTimeMs;
    o.hintsUsed += Math.max(0, Math.floor(payload.boostersUsed?.hint ?? 0));
    o.shufflesUsed += Math.max(0, Math.floor(payload.boostersUsed?.shuffle ?? 0));

    if (payload.isWinner) {
      if (safeTimeMs > 0 && safeTimeMs < 45_000) o.speedrunWinsUnder45s += 1;
      const totalSec = Math.max(1, payload.totalTimeSec ?? 120);
      const remSec = Math.max(0, payload.remainingTimeSec ?? 0);
      if (remSec / totalSec >= 0.5) o.survivorWinsOver50PctTime += 1;
      if (remSec > 0 && remSec <= 1) o.nearDeathWinsUnder1s += 1;
    }
  } else {
    const m = s.match3;
    m.gamesPlayed += 1;
    if (payload.isWinner) m.wins += 1;
    m.highScore = Math.max(m.highScore, safeScore);
    m.bestCombo = Math.max(m.bestCombo, safeCombo);
    m.totalTilesCleared += Math.max(0, Math.floor(payload.tilesCleared ?? payload.matches * 3));
    m.totalCascades += Math.max(0, Math.floor(payload.matches));
    m.specialTilesCreated += Math.max(0, Math.floor(payload.specialsCreated ?? 0));
    m.blockersCleared += Math.max(0, Math.floor(payload.obstaclesDestroyed ?? 0));
    m.totalPlayTimeMs += safeTimeMs;
    m.boostersUsed += roundBoosters;
  }
}

export function selectGameLevel(draft: ConnectifySaveDataV1, game: GameId, level: number): boolean {
  const prog = draft.progression[game];
  const target = Math.floor(level);
  if (!Number.isInteger(target) || target < 1 || target > prog.highestUnlockedLevel) {
    return false;
  }
  prog.currentLevel = target;
  return true;
}
