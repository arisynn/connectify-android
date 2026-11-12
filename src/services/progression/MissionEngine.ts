/**
 * Deterministic Daily & Weekly Mission Engine (WIB UTC+7)
 * Owned by: @progression-designer
 *
 * Guarantees:
 * - Zero cross-play lock-in: 2 Universal ('hub') + 1 Onet + 1 Match 3 per period.
 * - Unclaimed completed missions archive safely into `unclaimedArchive` across rollovers.
 * - Strictly pure deterministic selection via `seededRandom`.
 */

import {
  DAILY_MISSION_CONFIG,
  DAILY_MISSIONS_POOL,
  WEEKLY_MISSION_CONFIG,
  WEEKLY_MISSIONS_POOL,
  type MissionTemplate,
} from '../../config/progression.config';
import type { GameResultPayload } from '../../types/game.types';
import type {
  ConnectifySaveDataV1,
  GameModeId,
  MissionProgressRecord,
} from '../../types/persistence.types';
import { seededRandom, shuffleArray } from '../../utils/random';
import { getTodayKey, getWeekKey } from '../../utils/time';

const PEAK_TYPES = new Set<MissionTemplate['type']>(['combo', 'm3_cascade']);

function toMissionRecord(template: MissionTemplate): MissionProgressRecord {
  return {
    id: template.id,
    game: template.game,
    type: template.type,
    title: template.title,
    desc: template.desc,
    difficulty: template.difficulty,
    target: template.target,
    progress: 0,
    rewardCoins: template.rewardCoins,
    rewardXp: template.rewardXp,
    claimed: false,
  };
}

function pickQuotaMissions(
  pool: readonly MissionTemplate[],
  seedStr: string,
  quota: Readonly<Record<'hub' | 'onet' | 'match3', number>>,
): MissionProgressRecord[] {
  const rng = seededRandom(seedStr);
  const selected: MissionProgressRecord[] = [];
  const scopes: Array<'hub' | 'onet' | 'match3'> = ['hub', 'onet', 'match3'];

  for (const scope of scopes) {
    const targetCount = quota[scope] ?? 0;
    const candidates = shuffleArray(
      pool.filter((m) => m.game === scope),
      rng,
    );
    const usedTypes = new Set<string>();
    let count = 0;

    for (const candidate of candidates) {
      if (count >= targetCount) break;
      if (usedTypes.has(candidate.type)) continue;
      usedTypes.add(candidate.type);
      selected.push(toMissionRecord(candidate));
      count++;
    }
  }

  return selected;
}

function archiveCompletedUnclaimed(
  draft: ConnectifySaveDataV1,
  missions: MissionProgressRecord[],
  periodKey: string,
  scope: 'daily' | 'weekly',
): void {
  if (!periodKey || !missions.length) return;
  for (const mission of missions) {
    if (!mission.claimed && mission.progress >= mission.target) {
      const archivedId = `${scope}:${periodKey}:${mission.id}`;
      const exists = draft.dailyChallenges.unclaimedArchive.some((a) => a.id === archivedId);
      if (!exists) {
        draft.dailyChallenges.unclaimedArchive.push({
          ...mission,
          id: archivedId,
          savedFromPeriod: periodKey,
          scope,
        });
      }
    }
  }
}

/**
 * Ensures daily and weekly mission lists are populated and rolled over for the current WIB period.
 */
export function ensureMissionsCurrent(draft: ConnectifySaveDataV1, nowMs: number = Date.now()): void {
  const todayKey = getTodayKey(nowMs);
  const weekKey = getWeekKey(nowMs);
  const dc = draft.dailyChallenges;

  // Daily rollover
  if (!dc.dailyMissions.length || dc.dailyDateKey !== todayKey) {
    archiveCompletedUnclaimed(draft, dc.dailyMissions, dc.dailyDateKey, 'daily');
    dc.dailyMissions = pickQuotaMissions(
      DAILY_MISSIONS_POOL,
      `daily:${todayKey}`,
      DAILY_MISSION_CONFIG.quota,
    );
    dc.dailyDateKey = todayKey;
    dc.dailyAllCompletedBonusClaimed = false;
  }

  // Weekly rollover
  if (!dc.weeklyMissions.length || dc.weeklyPeriodKey !== weekKey) {
    archiveCompletedUnclaimed(draft, dc.weeklyMissions, dc.weeklyPeriodKey, 'weekly');
    dc.weeklyMissions = pickQuotaMissions(
      WEEKLY_MISSIONS_POOL,
      `weekly:${weekKey}`,
      WEEKLY_MISSION_CONFIG.quota,
    );
    dc.weeklyPeriodKey = weekKey;
  }

  // Daily challenge puzzle date rollover
  if (dc.dailyPuzzle.dateKey !== todayKey) {
    dc.dailyPuzzle = {
      dateKey: todayKey,
      onetCompleted: false,
      onetScore: 0,
      match3Completed: false,
      match3Score: 0,
    };
  }
}

function applyProgressToList(
  missions: MissionProgressRecord[],
  eventType: MissionTemplate['type'],
  amount: number,
  game: GameModeId,
  newlyCompletedIds: string[],
): void {
  if (amount <= 0) return;

  for (const m of missions) {
    if (m.claimed || m.type !== eventType) continue;
    // 'hub' accepts events from both Onet and Match 3; mode missions accept only their own game
    if (m.game !== 'hub' && m.game !== game) continue;

    const prevProgress = m.progress;
    const nextProgress = PEAK_TYPES.has(eventType)
      ? Math.min(m.target, Math.max(prevProgress, amount))
      : Math.min(m.target, prevProgress + amount);

    if (nextProgress !== prevProgress) {
      m.progress = nextProgress;
      if (prevProgress < m.target && nextProgress >= m.target) {
        newlyCompletedIds.push(m.id);
      }
    }
  }
}

/**
 * Updates daily and weekly mission progress after a completed or failed game round.
 * Returns IDs of missions that transitioned from incomplete to complete during this round.
 */
export function updateMissionsFromResult(
  draft: ConnectifySaveDataV1,
  payload: GameResultPayload,
  nowMs: number = Date.now(),
): string[] {
  ensureMissionsCurrent(draft, nowMs);
  const newlyCompletedIds: string[] = [];

  const emit = (type: MissionTemplate['type'], amount: number) => {
    applyProgressToList(draft.dailyChallenges.dailyMissions, type, amount, payload.game, newlyCompletedIds);
    applyProgressToList(draft.dailyChallenges.weeklyMissions, type, amount, payload.game, newlyCompletedIds);
  };

  if (payload.isWinner) {
    emit('clear_levels', 1);
    emit('earn_stars', Math.max(1, payload.stars));
    if (payload.isFlawless) emit('flawless', 1);
  }

  emit('score', Math.max(0, Math.floor(payload.score)));

  if (payload.game === 'onet') {
    emit('match_pairs', Math.max(0, Math.floor(payload.matches)));
    emit('split_tiles', Math.max(0, Math.floor(payload.splits ?? 0)));
    emit('combo', Math.max(0, Math.floor(payload.highestCombo)));

    if (payload.isWinner) {
      if (payload.timeElapsedMs > 0 && payload.timeElapsedMs < 45_000) {
        emit('fast_clear', 1);
      }
      const totalSec = Math.max(1, payload.totalTimeSec ?? 120);
      const remSec = Math.max(0, payload.remainingTimeSec ?? 0);
      if (remSec / totalSec >= 0.5) {
        emit('survivor', 1);
      }
    }
  } else {
    emit('m3_tiles', Math.max(0, Math.floor(payload.tilesCleared ?? payload.matches * 3)));
    emit('m3_specials', Math.max(0, Math.floor(payload.specialsCreated ?? 0)));
    emit('m3_blockers', Math.max(0, Math.floor(payload.obstaclesDestroyed ?? 0)));
    emit('m3_cascade', Math.max(0, Math.floor(payload.highestCombo)));
  }

  // Update Daily Challenge puzzle completion tracking
  if (payload.isDailyChallenge && payload.isWinner) {
    const dp = draft.dailyChallenges.dailyPuzzle;
    if (payload.game === 'onet') {
      dp.onetCompleted = true;
      dp.onetScore = Math.max(dp.onetScore, Math.floor(payload.score));
    } else {
      dp.match3Completed = true;
      dp.match3Score = Math.max(dp.match3Score, Math.floor(payload.score));
    }
  }

  return newlyCompletedIds;
}

export interface MissionClaimOutcome {
  error: string | null;
  scope: 'daily' | 'weekly' | 'archived' | null;
  coinsDelta: number;
  xpDelta: number;
  allDailyBonusTriggered: boolean;
  bonusCoinsDelta: number;
  bonusXpDelta: number;
}

/**
 * Claims a completed daily, weekly, or archived mission reward.
 * Automatically grants the All-Clear Daily Bonus when `dailyAllCompleteThreshold` (3) is reached.
 */
export function claimMissionReward(
  draft: ConnectifySaveDataV1,
  missionId: string,
  nowMs: number = Date.now(),
): MissionClaimOutcome {
  ensureMissionsCurrent(draft, nowMs);
  const dc = draft.dailyChallenges;

  let targetMission: MissionProgressRecord | undefined;
  let scope: 'daily' | 'weekly' | 'archived' | null = null;
  let isArchivedDaily = false;

  targetMission = dc.dailyMissions.find((m) => m.id === missionId);
  if (targetMission) {
    scope = 'daily';
  } else {
    targetMission = dc.weeklyMissions.find((m) => m.id === missionId);
    if (targetMission) {
      scope = 'weekly';
    } else {
      const archived = dc.unclaimedArchive.find((m) => m.id === missionId);
      if (archived) {
        targetMission = archived;
        scope = 'archived';
        isArchivedDaily = archived.scope === 'daily';
      }
    }
  }

  if (!targetMission || !scope) {
    return {
      error: 'MISSION_NOT_FOUND',
      scope: null,
      coinsDelta: 0,
      xpDelta: 0,
      allDailyBonusTriggered: false,
      bonusCoinsDelta: 0,
      bonusXpDelta: 0,
    };
  }

  if (targetMission.claimed) {
    return {
      error: 'MISSION_ALREADY_CLAIMED',
      scope,
      coinsDelta: 0,
      xpDelta: 0,
      allDailyBonusTriggered: false,
      bonusCoinsDelta: 0,
      bonusXpDelta: 0,
    };
  }

  if (targetMission.progress < targetMission.target) {
    return {
      error: 'MISSION_NOT_COMPLETE',
      scope,
      coinsDelta: 0,
      xpDelta: 0,
      allDailyBonusTriggered: false,
      bonusCoinsDelta: 0,
      bonusXpDelta: 0,
    };
  }

  targetMission.claimed = true;
  targetMission.claimedAt = nowMs;

  if (scope === 'daily' || isArchivedDaily) {
    draft.statistics.totalDailyMissionsCompleted += 1;
  } else {
    draft.statistics.totalWeeklyMissionsCompleted += 1;
  }

  // Remove claimed archived mission to keep save compact
  if (scope === 'archived') {
    dc.unclaimedArchive = dc.unclaimedArchive.filter((m) => m.id !== missionId);
  }

  let allDailyBonusTriggered = false;
  let bonusCoinsDelta = 0;
  let bonusXpDelta = 0;

  if (scope === 'daily' && !dc.dailyAllCompletedBonusClaimed) {
    const claimedTodayCount = dc.dailyMissions.filter((m) => m.claimed).length;
    if (claimedTodayCount >= DAILY_MISSION_CONFIG.allCompleteThreshold) {
      dc.dailyAllCompletedBonusClaimed = true;
      allDailyBonusTriggered = true;
      bonusCoinsDelta = DAILY_MISSION_CONFIG.allCompleteBonusCoins;
      bonusXpDelta = DAILY_MISSION_CONFIG.allCompleteBonusXp;
    }
  }

  return {
    error: null,
    scope,
    coinsDelta: targetMission.rewardCoins,
    xpDelta: targetMission.rewardXp,
    allDailyBonusTriggered,
    bonusCoinsDelta,
    bonusXpDelta,
  };
}

export function getReadyMissionCount(data: ConnectifySaveDataV1): number {
  const dc = data.dailyChallenges;
  return [...dc.dailyMissions, ...dc.weeklyMissions, ...dc.unclaimedArchive].filter(
    (m) => !m.claimed && m.progress >= m.target,
  ).length;
}
