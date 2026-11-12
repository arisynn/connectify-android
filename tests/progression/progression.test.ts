import { describe, it, expect, beforeEach } from 'vitest';
import { XP_CURVE, XP_RANKS, DAILY_MISSION_CONFIG } from '@/config/progression.config';
import {
  getAccountProgress,
  computeRoundXp,
  updateGameModeProgression,
  selectGameLevel,
} from '@/services/progression/ProgressionEngine';
import {
  ensureMissionsCurrent,
  updateMissionsFromResult,
  claimMissionReward,
} from '@/services/progression/MissionEngine';
import {
  getLoginStreakState,
  claimDailyLoginReward,
} from '@/services/progression/LoginStreakEngine';
import { RewardEngine } from '@/services/progression/RewardEngine';
import { LocalPersistenceEngine } from '@/services/persistence/LocalPersistenceEngine';
import { createDefaultSaveDataV1 } from '@/services/persistence/SchemaMigrator';
import type { KeyValueStorageAdapter } from '@/services/persistence/StorageDriver';
import type { GameResultPayload } from '@/types/game.types';

function createMemoryAdapter(): KeyValueStorageAdapter {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
  };
}

function makeRoundPayload(overrides: Partial<GameResultPayload> = {}): GameResultPayload {
  return {
    game: 'onet',
    runId: `run-${Math.random().toString(36).slice(2)}`,
    level: 1,
    isWinner: true,
    isFlawless: false,
    stars: 3,
    score: 2000,
    timeElapsedMs: 50_000,
    remainingTimeSec: 70,
    totalTimeSec: 120,
    matches: 20,
    highestCombo: 6,
    mistakes: 0,
    boostersUsed: {},
    isDailyChallenge: false,
    dailyDateKey: null,
    ...overrides,
  };
}

describe('Progression, XP, Stars & Missions (PROG-01..04)', () => {
  it('PROG-01: verifies monotonic XP curve, exact level boundary inverse math, and rank titles for L1..100', () => {
    expect(XP_CURVE.xpForLevel(1)).toBe(0);
    expect(getAccountProgress(0).level).toBe(1);
    expect(getAccountProgress(-50).level).toBe(1);
    expect(getAccountProgress(Number.NaN).level).toBe(1);

    let prevDelta = 0;
    for (let L = 1; L <= 100; L++) {
      const floor = XP_CURVE.xpForLevel(L);
      const next = XP_CURVE.xpForLevel(L + 1);
      const delta = next - floor;
      expect(delta).toBeGreaterThan(prevDelta);
      prevDelta = delta;

      // Exact boundary XP -> level L, 0% progress
      const atBoundary = getAccountProgress(floor);
      expect(atBoundary.level).toBe(L);
      expect(atBoundary.currentXpInLevel).toBe(0);
      expect(atBoundary.percent).toBe(0);

      // 1 XP below next boundary -> still level L
      const justBeforeNext = getAccountProgress(next - 1);
      expect(justBeforeNext.level).toBe(L);
      expect(justBeforeNext.currentXpInLevel).toBe(delta - 1);
      expect(justBeforeNext.percent).toBeGreaterThan(0);
      expect(justBeforeNext.percent).toBeLessThan(100);
    }

    // Verify rank title transitions
    for (const rank of XP_RANKS) {
      const p = getAccountProgress(XP_CURVE.xpForLevel(rank.level));
      expect(p.title).toBe(rank.titleId);
    }
  });

  it('PROG-02: enforces 1-3 star mastery calculation and non-downgrading stars & high scores on replay', () => {
    const state = createDefaultSaveDataV1(1_762_900_000_000);

    // Loss gives 0 stars and does not unlock level 2
    const loss = updateGameModeProgression(
      state,
      makeRoundPayload({ game: 'match3', level: 1, isWinner: false, stars: 0, score: 450 }),
    );
    expect(loss.newStars).toBe(0);
    expect(state.progression.match3.highestUnlockedLevel).toBe(1);
    expect(state.progression.match3.levels[1].consecutiveFailures).toBe(1);

    // 3-star win unlocks level 2, saves best score & 3 stars
    const win3 = updateGameModeProgression(
      state,
      makeRoundPayload({ game: 'match3', level: 1, isWinner: true, stars: 3, score: 4200, movesRemaining: 9 }),
    );
    expect(win3.isFirstClear).toBe(true);
    expect(win3.newStars).toBe(3);
    expect(state.progression.match3.highestUnlockedLevel).toBe(2);
    expect(state.progression.match3.levels[1].stars).toBe(3);
    expect(state.progression.match3.levels[1].highScore).toBe(4200);
    expect(state.progression.match3.levels[1].consecutiveFailures).toBe(0);

    // Replay level 1 with worse performance (1 star, lower score 1500, fewer moves left)
    const replay1Star = updateGameModeProgression(
      state,
      makeRoundPayload({ game: 'match3', level: 1, isWinner: true, stars: 1, score: 1500, movesRemaining: 1 }),
    );
    expect(replay1Star.isFirstClear).toBe(false);
    expect(replay1Star.newStars).toBe(3);
    expect(replay1Star.isNewBestScore).toBe(false);
    expect(state.progression.match3.levels[1].stars).toBe(3);
    expect(state.progression.match3.levels[1].highScore).toBe(4200);
    expect(state.progression.match3.levels[1].bestMovesRemaining).toBe(9);
    expect(state.progression.match3.totalStars).toBe(3);
  });

  it('PROG-03: keeps Onet and Match 3 progression trees completely independent without cross-mode lock-in', async () => {
    const persistence = new LocalPersistenceEngine({ storage: createMemoryAdapter() });
    await persistence.initialize();

    // Play 5 Onet levels without touching Match 3
    for (let lvl = 1; lvl <= 5; lvl++) {
      const res = RewardEngine.commitRoundResult(
        persistence,
        makeRoundPayload({ game: 'onet', level: lvl, runId: `onet-only-${lvl}` }),
      );
      expect(res.success).toBe(true);
    }

    let s = persistence.getState();
    expect(s.progression.onet.highestUnlockedLevel).toBe(6);
    expect(s.progression.match3.highestUnlockedLevel).toBe(1);
    expect(s.profile.xp).toBeGreaterThan(0);
    expect(s.profile.level).toBeGreaterThan(1);

    // Cannot select locked Match 3 level 2 yet
    const draft = structuredClone(s);
    expect(selectGameLevel(draft, 'match3', 2)).toBe(false);
    expect(selectGameLevel(draft, 'onet', 4)).toBe(true);
    expect(draft.progression.onet.currentLevel).toBe(4);

    // Playing Match 3 level 1 unlocks Match 3 level 2 while preserving Onet at level 6
    const m3Res = RewardEngine.commitRoundResult(
      persistence,
      makeRoundPayload({ game: 'match3', level: 1, runId: 'm3-only-1', tilesCleared: 45, specialsCreated: 2 }),
    );
    expect(m3Res.success).toBe(true);
    s = persistence.getState();
    expect(s.progression.onet.highestUnlockedLevel).toBe(6);
    expect(s.progression.match3.highestUnlockedLevel).toBe(2);

    // Verify XP parity per round duration
    const onetXp = computeRoundXp(makeRoundPayload({ game: 'onet', stars: 2, highestCombo: 4 }), true);
    const m3Xp = computeRoundXp(makeRoundPayload({ game: 'match3', stars: 2, highestCombo: 3, specialsCreated: 2 }), true);
    expect(onetXp).toBeGreaterThanOrEqual(100);
    expect(m3Xp).toBeGreaterThanOrEqual(100);
  });

  it('PROG-04: handles WIB (UTC+7) midnight daily mission rollover, archive preservation & login streak continuity', () => {
    // 2026-11-12 23:55:00 WIB == 2026-11-12T16:55:00.000Z
    const beforeMidnightWib = Date.parse('2026-11-12T16:55:00.000Z');
    // 2026-11-13 00:05:00 WIB == 2026-11-12T17:05:00.000Z (10 minutes later, crosses WIB day!)
    const afterMidnightWib = Date.parse('2026-11-12T17:05:00.000Z');
    // Skipped day: 2026-11-15 10:00:00 WIB
    const skippedDayWib = Date.parse('2026-11-15T03:00:00.000Z');

    const draft = createDefaultSaveDataV1(beforeMidnightWib);
    ensureMissionsCurrent(draft, beforeMidnightWib);

    // Quota: 2 hub + 1 onet + 1 match3 = 4 daily missions
    expect(draft.dailyChallenges.dailyMissions.length).toBe(4);
    expect(draft.dailyChallenges.dailyMissions.filter((m) => m.game === 'hub').length).toBe(DAILY_MISSION_CONFIG.quota.hub);
    expect(draft.dailyChallenges.dailyMissions.filter((m) => m.game === 'onet').length).toBe(DAILY_MISSION_CONFIG.quota.onet);
    expect(draft.dailyChallenges.dailyMissions.filter((m) => m.game === 'match3').length).toBe(DAILY_MISSION_CONFIG.quota.match3);

    // Complete a universal ('hub') mission without claiming it yet
    updateMissionsFromResult(
      draft,
      makeRoundPayload({ game: 'onet', isWinner: true, score: 20_000, stars: 3, matches: 100 }),
      beforeMidnightWib,
    );
    updateMissionsFromResult(
      draft,
      makeRoundPayload({ game: 'onet', isWinner: true, score: 20_000, stars: 3, matches: 100 }),
      beforeMidnightWib,
    );

    const completedUnclaimed = draft.dailyChallenges.dailyMissions.filter(
      (m) => !m.claimed && m.progress >= m.target,
    );
    expect(completedUnclaimed.length).toBeGreaterThan(0);
    const archivedSourceId = completedUnclaimed[0].id;

    // Cross WIB midnight -> completed unclaimed mission moves into unclaimedArchive
    ensureMissionsCurrent(draft, afterMidnightWib);
    expect(draft.dailyChallenges.dailyDateKey).toBe('2026-11-13');
    const archived = draft.dailyChallenges.unclaimedArchive.find((m) => m.id.endsWith(`:${archivedSourceId}`));
    expect(archived).toBeDefined();

    // Claiming archived mission succeeds once and rejects duplicate claim
    const claimOk = claimMissionReward(draft, archived!.id, afterMidnightWib);
    expect(claimOk.error).toBeNull();
    expect(claimOk.coinsDelta).toBeGreaterThan(0);

    const claimDup = claimMissionReward(draft, archived!.id, afterMidnightWib);
    expect(claimDup.error).toBe('MISSION_NOT_FOUND');

    // Login streak continuity across WIB midnight and reset on skipped day
    const day1 = claimDailyLoginReward(draft, beforeMidnightWib);
    expect(day1.error).toBeNull();
    expect(day1.streak).toBe(1);

    const day2 = claimDailyLoginReward(draft, afterMidnightWib);
    expect(day2.error).toBeNull();
    expect(day2.streak).toBe(2);

    const afterSkipStatus = getLoginStreakState(draft, skippedDayWib);
    expect(afterSkipStatus.claimedToday).toBe(false);
    expect(afterSkipStatus.currentStreak).toBe(1);
  });
});
