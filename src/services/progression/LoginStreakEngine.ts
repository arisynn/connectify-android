/**
 * Daily Login Streak & Check-In Engine (00:00 WIB Reset)
 * Owned by: @progression-designer
 */

import { LOGIN_STREAK_CONFIG } from '../../config/progression.config';
import type { ConnectifySaveDataV1 } from '../../types/persistence.types';
import { getDayKeyOffset, getTodayKey } from '../../utils/time';

export interface LoginStreakStatus {
  claimedToday: boolean;
  currentStreak: number;
  dayIndex: number;
  rewardCoins: number;
  rewardXp: number;
  scheduleCoins: readonly number[];
}

export interface LoginStreakClaimOutcome {
  error: string | null;
  streak: number;
  dayIndex: number;
  coinsDelta: number;
  xpDelta: number;
  unlockedTheme: string | null;
}

export function getLoginStreakState(
  data: ConnectifySaveDataV1,
  nowMs: number = Date.now(),
): LoginStreakStatus {
  const today = getTodayKey(nowMs);
  const yesterday = getDayKeyOffset(-1, nowMs);
  const ls = data.profile.loginStreak;
  const claimedToday = ls.lastClaimedDate === today;

  const activeStreak = claimedToday
    ? Math.max(1, ls.currentStreak)
    : ls.lastClaimedDate === yesterday
      ? Math.max(1, ls.currentStreak + 1)
      : 1;

  const schedule = LOGIN_STREAK_CONFIG.scheduleCoins;
  const dayIndex = (((activeStreak - 1) % schedule.length) + schedule.length) % schedule.length;
  const isDay7Bonus = activeStreak > 0 && activeStreak % 7 === 0;

  return {
    claimedToday,
    currentStreak: activeStreak,
    dayIndex,
    rewardCoins: schedule[dayIndex],
    rewardXp: LOGIN_STREAK_CONFIG.dailyXp + (isDay7Bonus ? LOGIN_STREAK_CONFIG.sevenDayStreakBonusXp : 0),
    scheduleCoins: schedule,
  };
}

/**
 * Records passive daily app open (`totalLoginDays`) without double-counting the same WIB day.
 */
export function recordDailyCheckIn(draft: ConnectifySaveDataV1, nowMs: number = Date.now()): boolean {
  const today = getTodayKey(nowMs);
  const ls = draft.profile.loginStreak;
  if (ls.lastCheckInDate === today) return false;
  ls.lastCheckInDate = today;
  ls.totalLoginDays = Math.max(1, ls.totalLoginDays + 1);
  return true;
}

/**
 * Claims today's login streak reward and evaluates Day 3 / Day 7 milestone themes.
 */
export function claimDailyLoginReward(
  draft: ConnectifySaveDataV1,
  nowMs: number = Date.now(),
): LoginStreakClaimOutcome {
  const status = getLoginStreakState(draft, nowMs);
  if (status.claimedToday) {
    return {
      error: 'LOGIN_REWARD_ALREADY_CLAIMED',
      streak: status.currentStreak,
      dayIndex: status.dayIndex,
      coinsDelta: 0,
      xpDelta: 0,
      unlockedTheme: null,
    };
  }

  const today = getTodayKey(nowMs);
  recordDailyCheckIn(draft, nowMs);

  draft.profile.loginStreak.lastClaimedDate = today;
  draft.profile.loginStreak.currentStreak = status.currentStreak;
  draft.profile.loginStreak.bestStreak = Math.max(
    draft.profile.loginStreak.bestStreak,
    status.currentStreak,
  );

  let unlockedTheme: string | null = null;
  const totalDays = draft.profile.loginStreak.totalLoginDays;
  if (totalDays >= 3 && !draft.inventory.unlockedThemes.includes(LOGIN_STREAK_CONFIG.milestoneRewards.day3Theme)) {
    const themeId = LOGIN_STREAK_CONFIG.milestoneRewards.day3Theme;
    draft.inventory.unlockedThemes.push(themeId);
    if (!draft.inventory.unseenThemes.includes(themeId)) {
      draft.inventory.unseenThemes.push(themeId);
    }
    unlockedTheme = themeId;
  }
  if (totalDays >= 7 && !draft.inventory.unlockedThemes.includes(LOGIN_STREAK_CONFIG.milestoneRewards.day7Theme)) {
    const themeId = LOGIN_STREAK_CONFIG.milestoneRewards.day7Theme;
    draft.inventory.unlockedThemes.push(themeId);
    if (!draft.inventory.unseenThemes.includes(themeId)) {
      draft.inventory.unseenThemes.push(themeId);
    }
    unlockedTheme = themeId;
  }
  draft.statistics.totalThemesUnlocked = draft.inventory.unlockedThemes.length;

  return {
    error: null,
    streak: status.currentStreak,
    dayIndex: status.dayIndex,
    coinsDelta: status.rewardCoins,
    xpDelta: status.rewardXp,
    unlockedTheme,
  };
}
