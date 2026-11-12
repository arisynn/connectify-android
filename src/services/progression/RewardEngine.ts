/**
 * Unified Reward Engine — Coordinates Progression, Economy, Missions, Achievements & Login Streaks
 * Owned by: @progression-designer
 *
 * Guarantees:
 * - Atomic execution inside `LocalPersistenceEngine.executeTransaction`
 * - Zero double-counting of XP or Connect Coins
 * - Idempotent deduplication via `runId` / deterministic period keys
 */

import { getTodayKey } from '../../utils/time';
import type { GameResultPayload, RewardBreakdown, StarRating } from '../../types/game.types';
import type { ConnectifySaveDataV1, TransactionSourceType } from '../../types/persistence.types';
import { EconomyEngine } from '../economy/EconomyEngine';
import type { LocalPersistenceEngine } from '../persistence/LocalPersistenceEngine';
import {
  claimAchievementReward,
  evaluateAccountMilestones,
  getNewlyUnlockedAchievementIds,
  type AchievementClaimOutcome,
} from './AchievementEngine';
import { claimDailyLoginReward, type LoginStreakClaimOutcome } from './LoginStreakEngine';
import {
  claimMissionReward,
  ensureMissionsCurrent,
  updateMissionsFromResult,
  type MissionClaimOutcome,
} from './MissionEngine';
import {
  applyAccountXp,
  computeRoundXp,
  getAccountProgress,
  updateGameModeProgression,
  updateGameplayStatistics,
} from './ProgressionEngine';

export interface CommittedRoundResult {
  success: boolean;
  idempotent: boolean;
  breakdown: RewardBreakdown;
  error?: string;
}

export interface CommittedClaimResult<T> {
  success: boolean;
  idempotent: boolean;
  coinsEarned: number;
  xpEarned: number;
  milestoneCoinsEarned: number;
  newAccountLevel: number;
  leveledUp: boolean;
  outcome: T;
  error?: string;
}

function cloneSave(data: Readonly<ConnectifySaveDataV1>): ConnectifySaveDataV1 {
  return typeof structuredClone === 'function'
    ? structuredClone(data)
    : (JSON.parse(JSON.stringify(data)) as ConnectifySaveDataV1);
}

/**
 * Applies a completed or failed game round onto a mutable draft WITHOUT modifying `draft.profile.coins`
 * (since `LocalPersistenceEngine.executeTransaction` applies `coinsDelta` atomically).
 * Returns the computed `RewardBreakdown` and `coinsDelta` for the transaction engine.
 */
function mutateDraftForRound(
  draft: ConnectifySaveDataV1,
  payload: GameResultPayload,
  nowMs: number,
): { breakdown: RewardBreakdown; coinsDelta: number } {
  const beforeSnapshot = cloneSave(draft);
  const todayKey = getTodayKey(nowMs);

  if (draft.profile.dailyEconomy.dateKey !== todayKey) {
    draft.profile.dailyEconomy = {
      dateKey: todayKey,
      coinsEarnedToday: 0,
      levelCompletionCountsToday: {},
    };
  }

  const modeState = draft.progression[payload.game];
  const level = Math.max(1, Math.floor(payload.level));
  const prevRecord = modeState.levels[level];
  const levelKey = EconomyEngine.getLevelCompletionKey(payload.game, level);
  const sameDayClearCount = draft.profile.dailyEconomy.levelCompletionCountsToday[levelKey] ?? 0;

  // 1. Compute Connect Coins earned BEFORE mutating level record / daily counters
  const coinResult = EconomyEngine.calculateLevelCoins({
    game: payload.game,
    level,
    isWinner: payload.isWinner,
    isFlawless: payload.isFlawless,
    stars: payload.stars,
    previousBestStars: prevRecord?.stars ?? 0,
    highestUnlockedLevel: modeState.highestUnlockedLevel,
    timeElapsedMs: payload.timeElapsedMs,
    remainingTimeSec: payload.remainingTimeSec,
    movesRemaining: payload.movesRemaining,
    highestCombo: payload.highestCombo,
    cascadesTriggered: payload.game === 'match3' ? payload.highestCombo : undefined,
    specialCombosTriggered: payload.specialsCreated,
    sameDayClearCount,
    consecutiveFailuresBeforeAttempt: prevRecord?.consecutiveFailures ?? 0,
    dailyGameplayCoinsEarned: draft.profile.dailyEconomy.coinsEarnedToday,
    isDailyChallenge: payload.isDailyChallenge,
  });

  if (payload.isWinner && !payload.isDailyChallenge) {
    draft.profile.dailyEconomy.levelCompletionCountsToday[levelKey] = sameDayClearCount + 1;
  }

  // 2. Update independent Onet or Match 3 progression tree
  const modeOutcome = updateGameModeProgression(draft, payload, nowMs);

  // 3. Update global & mode statistics
  updateGameplayStatistics(draft, payload);

  // 4. Compute & apply Account XP + evaluate level milestones
  const xpEarned = computeRoundXp(payload, modeOutcome.isFirstClear);
  const xpOutcome = applyAccountXp(draft, xpEarned);
  const milestoneOutcome = evaluateAccountMilestones(draft);

  // 5. Update Daily & Weekly Missions + Daily Challenge flag
  const completedMissionIds = updateMissionsFromResult(draft, payload, nowMs);

  // 6. Detect newly claimable Achievements
  const unlockedAchievementIds = getNewlyUnlockedAchievementIds(beforeSnapshot, draft);

  // 7. Clear active session on terminal result
  if (payload.game === 'onet') {
    draft.activeSession.onet = null;
  } else {
    draft.activeSession.match3 = null;
  }

  const totalCoinsEarned = coinResult.coinsEarned + milestoneOutcome.coinsDelta;
  const breakdown: RewardBreakdown = {
    coinsEarned: totalCoinsEarned,
    xpEarned,
    starsEarned: (payload.isWinner ? Math.min(3, Math.max(1, payload.stars || 1)) : 0) as StarRating,
    isNewBestScore: modeOutcome.isNewBestScore,
    isFirstClear: modeOutcome.isFirstClear,
    diminishingFactor: coinResult.replayMultiplier * coinResult.dailyCapMultiplier,
    previousAccountLevel: xpOutcome.previousLevel,
    newAccountLevel: xpOutcome.newLevel,
    leveledUp: xpOutcome.leveledUp,
    newHighestUnlockedLevel: modeOutcome.newHighestUnlocked,
    completedMissionIds,
    unlockedAchievementIds,
  };

  return { breakdown, coinsDelta: totalCoinsEarned };
}

export const RewardEngine = {
  /**
   * Pure preview/simulation helper (non-persisting) that returns the updated state copy & RewardBreakdown.
   */
  previewRoundResult(
    state: Readonly<ConnectifySaveDataV1>,
    payload: GameResultPayload,
    nowMs: number = Date.now(),
  ): { nextState: ConnectifySaveDataV1; breakdown: RewardBreakdown } {
    const draft = cloneSave(state);
    const { breakdown, coinsDelta } = mutateDraftForRound(draft, payload, nowMs);
    draft.profile.coins = Math.max(0, draft.profile.coins + coinsDelta);
    if (coinsDelta > 0) {
      draft.profile.lifetimeCoinsEarned += coinsDelta;
      draft.profile.dailyEconomy.coinsEarnedToday += coinsDelta;
    }
    return { nextState: draft, breakdown };
  },

  /**
   * Atomically commits a completed or failed game round to LocalPersistenceEngine.
   * Deduplicated by `payload.runId`.
   */
  commitRoundResult(
    persistence: LocalPersistenceEngine,
    payload: GameResultPayload,
    nowMs: number = Date.now(),
  ): CommittedRoundResult {
    let capturedBreakdown: RewardBreakdown | null = null;
    const source: TransactionSourceType = payload.isDailyChallenge
      ? 'DAILY_CHALLENGE_REWARD'
      : 'LEVEL_WIN_REWARD';
    const label = payload.isDailyChallenge
      ? `Tantangan Harian ${payload.game === 'onet' ? 'Onet' : 'Match 3'}`
      : `${payload.game === 'onet' ? 'Onet' : 'Match 3'} Level ${payload.level}`;

    const txResult = persistence.executeTransaction({
      idempotencyKey: `run:${payload.runId}`,
      type: source,
      label,
      mutate: (draft) => {
        const res = mutateDraftForRound(draft, payload, nowMs);
        capturedBreakdown = res.breakdown;
        // XP is already applied inside mutateDraftForRound via applyAccountXp
        return { coinsDelta: res.coinsDelta };
      },
    });

    if (txResult.idempotent || !capturedBreakdown) {
      const progress = getAccountProgress(txResult.data.profile.xp);
      const fallbackBreakdown: RewardBreakdown = {
        coinsEarned: 0,
        xpEarned: 0,
        starsEarned: payload.isWinner ? payload.stars : 0,
        isNewBestScore: false,
        isFirstClear: false,
        diminishingFactor: 1,
        previousAccountLevel: progress.level,
        newAccountLevel: progress.level,
        leveledUp: false,
        newHighestUnlockedLevel: txResult.data.progression[payload.game].highestUnlockedLevel,
        completedMissionIds: [],
        unlockedAchievementIds: [],
      };
      return {
        success: txResult.success,
        idempotent: txResult.idempotent,
        breakdown: fallbackBreakdown,
        error: txResult.error,
      };
    }

    return {
      success: txResult.success,
      idempotent: false,
      breakdown: capturedBreakdown,
      error: txResult.error,
    };
  },

  /**
   * Atomically ensures current WIB missions exist on boot/screen open.
   */
  syncMissionsPeriod(persistence: LocalPersistenceEngine, nowMs: number = Date.now()): void {
    const state = persistence.getState();
    const todayKey = getTodayKey(nowMs);
    if (
      state.dailyChallenges.dailyMissions.length > 0 &&
      state.dailyChallenges.weeklyMissions.length > 0 &&
      state.dailyChallenges.dailyDateKey === todayKey
    ) {
      return;
    }

    persistence.executeTransaction({
      idempotencyKey: `missions_sync:${todayKey}:${nowMs}`,
      type: 'STATE_UPDATE',
      mutate: (draft) => {
        ensureMissionsCurrent(draft, nowMs);
      },
    });
  },

  /**
   * Atomically claims a completed Daily, Weekly, or Archived mission reward.
   */
  commitMissionClaim(
    persistence: LocalPersistenceEngine,
    missionId: string,
    nowMs: number = Date.now(),
  ): CommittedClaimResult<MissionClaimOutcome> {
    const state = persistence.getState();
    const periodKey =
      state.dailyChallenges.dailyMissions.some((m) => m.id === missionId)
        ? state.dailyChallenges.dailyDateKey
        : state.dailyChallenges.weeklyMissions.some((m) => m.id === missionId)
          ? state.dailyChallenges.weeklyPeriodKey
          : 'archived';

    let outcome: MissionClaimOutcome = {
      error: 'NOT_EXECUTED',
      scope: null,
      coinsDelta: 0,
      xpDelta: 0,
      allDailyBonusTriggered: false,
      bonusCoinsDelta: 0,
      bonusXpDelta: 0,
    };
    let milestoneCoins = 0;
    let xpOutcome = {
      previousLevel: state.profile.level,
      newLevel: state.profile.level,
      leveledUp: false,
    };

    const source: TransactionSourceType =
      periodKey === state.dailyChallenges.weeklyPeriodKey
        ? 'CLAIM_WEEKLY_MISSION'
        : 'CLAIM_DAILY_MISSION';

    const txResult = persistence.executeTransaction({
      idempotencyKey: `mission:${periodKey}:${missionId}`,
      type: source,
      label: `Hadiah Misi (${missionId})`,
      mutate: (draft) => {
        outcome = claimMissionReward(draft, missionId, nowMs);
        if (outcome.error) {
          throw new Error(outcome.error);
        }
        const totalXp = outcome.xpDelta + outcome.bonusXpDelta;
        xpOutcome = applyAccountXp(draft, totalXp);
        const ms = evaluateAccountMilestones(draft);
        milestoneCoins = ms.coinsDelta;
        return { coinsDelta: outcome.coinsDelta + outcome.bonusCoinsDelta + milestoneCoins };
      },
    });

    return {
      success: txResult.success,
      idempotent: txResult.idempotent,
      coinsEarned:
        txResult.success && !txResult.idempotent
          ? outcome.coinsDelta + outcome.bonusCoinsDelta + milestoneCoins
          : 0,
      xpEarned: txResult.success && !txResult.idempotent ? outcome.xpDelta + outcome.bonusXpDelta : 0,
      milestoneCoinsEarned: txResult.success && !txResult.idempotent ? milestoneCoins : 0,
      newAccountLevel: xpOutcome.newLevel,
      leveledUp: xpOutcome.leveledUp,
      outcome,
      error: txResult.error,
    };
  },

  /**
   * Atomically claims the next earned tier of an achievement.
   */
  commitAchievementClaim(
    persistence: LocalPersistenceEngine,
    achievementId: string,
    nowMs: number = Date.now(),
  ): CommittedClaimResult<AchievementClaimOutcome> {
    const state = persistence.getState();
    const currentTier = state.achievements.claimedTiers[achievementId] ?? 0;

    let outcome: AchievementClaimOutcome = {
      error: 'NOT_EXECUTED',
      tierIndex: currentTier,
      coinsDelta: 0,
      xpDelta: 0,
      unlockedTheme: null,
    };
    let milestoneCoins = 0;
    let xpOutcome = {
      previousLevel: state.profile.level,
      newLevel: state.profile.level,
      leveledUp: false,
    };

    const txResult = persistence.executeTransaction({
      idempotencyKey: `achievement:${achievementId}:tier_${currentTier}`,
      type: 'CLAIM_ACHIEVEMENT',
      label: `Pencapaian (${achievementId} Tier ${currentTier + 1})`,
      mutate: (draft) => {
        outcome = claimAchievementReward(draft, achievementId, nowMs);
        if (outcome.error) {
          throw new Error(outcome.error);
        }
        xpOutcome = applyAccountXp(draft, outcome.xpDelta);
        const ms = evaluateAccountMilestones(draft);
        milestoneCoins = ms.coinsDelta;
        return { coinsDelta: outcome.coinsDelta + milestoneCoins };
      },
    });

    return {
      success: txResult.success,
      idempotent: txResult.idempotent,
      coinsEarned:
        txResult.success && !txResult.idempotent ? outcome.coinsDelta + milestoneCoins : 0,
      xpEarned: txResult.success && !txResult.idempotent ? outcome.xpDelta : 0,
      milestoneCoinsEarned: txResult.success && !txResult.idempotent ? milestoneCoins : 0,
      newAccountLevel: xpOutcome.newLevel,
      leveledUp: xpOutcome.leveledUp,
      outcome,
      error: txResult.error,
    };
  },

  /**
   * Atomically claims today's Daily Login Streak reward (00:00 WIB reset).
   */
  commitLoginRewardClaim(
    persistence: LocalPersistenceEngine,
    nowMs: number = Date.now(),
  ): CommittedClaimResult<LoginStreakClaimOutcome> {
    const todayKey = getTodayKey(nowMs);
    const state = persistence.getState();
    let outcome: LoginStreakClaimOutcome = {
      error: 'NOT_EXECUTED',
      streak: state.profile.loginStreak.currentStreak,
      dayIndex: 0,
      coinsDelta: 0,
      xpDelta: 0,
      unlockedTheme: null,
    };
    let milestoneCoins = 0;
    let xpOutcome = {
      previousLevel: state.profile.level,
      newLevel: state.profile.level,
      leveledUp: false,
    };

    const txResult = persistence.executeTransaction({
      idempotencyKey: `login_reward:${todayKey}`,
      type: 'CLAIM_LOGIN_REWARD',
      label: `Hadiah Login (${todayKey})`,
      mutate: (draft) => {
        outcome = claimDailyLoginReward(draft, nowMs);
        if (outcome.error) {
          throw new Error(outcome.error);
        }
        xpOutcome = applyAccountXp(draft, outcome.xpDelta);
        const ms = evaluateAccountMilestones(draft);
        milestoneCoins = ms.coinsDelta;
        return { coinsDelta: outcome.coinsDelta + milestoneCoins };
      },
    });

    return {
      success: txResult.success,
      idempotent: txResult.idempotent,
      coinsEarned:
        txResult.success && !txResult.idempotent ? outcome.coinsDelta + milestoneCoins : 0,
      xpEarned: txResult.success && !txResult.idempotent ? outcome.xpDelta : 0,
      milestoneCoinsEarned: txResult.success && !txResult.idempotent ? milestoneCoins : 0,
      newAccountLevel: xpOutcome.newLevel,
      leveledUp: xpOutcome.leveledUp,
      outcome,
      error: txResult.error,
    };
  },
};
