/**
 * Centralized Player Progression, XP Parity, Missions, Achievements & Milestones Config
 * Owned by: @progression-designer
 *
 * Enforces strict mode independence between Onet ('onet') and Match 3 ('match3').
 * Neither game mode forces playing the other.
 */

import type { GameId } from '../types/game.types';
import type { ConnectifySaveDataV1, GameModeId, MissionProgressRecord } from '../types/persistence.types';

export interface XpRankDefinition {
  level: number;
  id: string;
  titleId: string;
  titleEn: string;
  badge: string;
}

export interface MissionTemplate {
  id: string;
  game: GameModeId | 'hub';
  type:
    | 'clear_levels'
    | 'earn_stars'
    | 'score'
    | 'combo'
    | 'flawless'
    | 'match_pairs'
    | 'split_tiles'
    | 'fast_clear'
    | 'survivor'
    | 'use_hint'
    | 'use_shuffle'
    | 'm3_tiles'
    | 'm3_specials'
    | 'm3_blockers'
    | 'm3_cascade';
  title: string;
  desc: string;
  target: number;
  difficulty: MissionProgressRecord['difficulty'];
  rewardCoins: number;
  rewardXp: number;
}

export interface AchievementTierDefinition {
  target: number;
  rewardCoins: number;
  rewardXp: number;
  rewardTheme?: string;
  rewardBoosters?: Partial<Record<'hint' | 'shuffle' | 'hammer' | 'bomb' | 'extra_time' | 'extra_moves' | 'color_burst', number>>;
}

export interface AchievementDefinition {
  id: string;
  game: GameModeId | 'hub';
  category: 'progression' | 'mastery' | 'collection' | 'secret';
  title: string;
  desc: (target: number) => string;
  tiers: AchievementTierDefinition[];
  getProgress: (data: ConnectifySaveDataV1) => number;
}

export interface AccountMilestoneDefinition {
  id: string;
  accountLevel: number;
  rewardCoins: number;
  rewardTheme?: string;
  rewardCosmetic?: string;
  rewardAvatar?: string;
  rewardBoosters?: Partial<Record<'hint' | 'shuffle' | 'hammer' | 'bomb' | 'extra_time', number>>;
  label: string;
}

export const XP_CURVE = {
  baseXpPerLevel: 100,
  linearIncrementPerLevel: 50,
  /**
   * Cumulative XP required to reach `level` (Level 1 = 0 XP).
   * Matches connectify-new formula: 100*(L-1) + 25*(L-1)*(L-2)
   */
  xpForLevel(level: number): number {
    const L = Math.max(1, Math.floor(level));
    return 100 * (L - 1) + 25 * (L - 1) * (L - 2);
  },
  /**
   * Incremental XP needed to advance from `level` to `level + 1`.
   */
  xpDeltaForNextLevel(level: number): number {
    const L = Math.max(1, Math.floor(level));
    return 100 + 50 * (L - 1);
  },
  /**
   * Exact closed-form inverse level from total cumulative XP.
   */
  levelFromXp(xp: number): number {
    const safeXp = Math.max(0, Number.isFinite(xp) ? xp : 0);
    return Math.floor((-75 + Math.sqrt(5625 + 100 * safeXp)) / 50) + 1;
  },
} as const;

export const XP_RANKS: readonly XpRankDefinition[] = [
  { level: 1, id: 'rank_newcomer', titleId: 'Teman Baru', titleEn: 'New Friend', badge: 'bronze_1' },
  { level: 5, id: 'rank_seeker', titleId: 'Pencari Pasangan', titleEn: 'Pair Seeker', badge: 'bronze_2' },
  { level: 10, id: 'rank_combo', titleId: 'Peracik Kombo', titleEn: 'Combo Crafter', badge: 'silver_1' },
  { level: 15, id: 'rank_tactician', titleId: 'Ahli Strategi', titleEn: 'Board Tactician', badge: 'silver_2' },
  { level: 20, id: 'rank_star', titleId: 'Bintang Klub', titleEn: 'Club Star', badge: 'gold_1' },
  { level: 30, id: 'rank_virtuoso', titleId: 'Virtuoso Visual', titleEn: 'Visual Virtuoso', badge: 'gold_2' },
  { level: 35, id: 'rank_master', titleId: 'Master Puzzle', titleEn: 'Puzzle Master', badge: 'platinum_1' },
  { level: 50, id: 'rank_legend', titleId: 'Legenda Connectify', titleEn: 'Connectify Legend', badge: 'diamond_1' },
] as const;

export const ROUND_XP_CONFIG = {
  onet: {
    baseWinXp: 95,
    starBonusXp: [0, 10, 20, 35] as readonly [number, number, number, number],
    flawlessBonusXp: 20,
    comboXpPerChain: 2,
    maxComboXp: 25,
    speedBonusXp: 15, // >= 40% timer remaining
    speedBonusMinTimeRatio: 0.4,
    firstTimeClearBonusXp: 25,
    replayMultiplier: 0.65,
    lossMaxXp: 35,
    lossScoreDivisor: 80,
  },
  match3: {
    baseWinXp: 110, // Calibrated for ~95s Match 3 vs ~78s Onet (1.014x parity)
    starBonusXp: [0, 12, 24, 40] as readonly [number, number, number, number],
    cascadeBonusXpPerChain: 3,
    maxCascadeXp: 30,
    specialTileActivationXp: 3,
    maxSpecialXp: 18,
    firstTimeClearBonusXp: 30,
    replayMultiplier: 0.65,
    lossMaxXp: 40,
    lossScoreDivisor: 100,
  },
  dailyChallengeWinBonusXp: 80,
} as const;

export const LOGIN_STREAK_CONFIG = {
  dailyXp: 25,
  sevenDayStreakBonusXp: 75,
  /** 7-day repeating Connect Coins schedule */
  scheduleCoins: [5, 5, 6, 7, 8, 9, 10] as readonly number[],
  milestoneRewards: {
    day3Theme: 'reward_meadow',
    day7Theme: 'reward_fruit',
  },
} as const;

export const DAILY_MISSION_CONFIG = {
  /** 4 slots total: 2 universal ('hub'), 1 'onet', 1 'match3'. Claiming any 3 grants All-Clear Bonus. */
  quota: { hub: 2, onet: 1, match3: 1 } as const,
  allCompleteThreshold: 3,
  allCompleteBonusCoins: 5,
  allCompleteBonusXp: 50,
  rewardsByDifficulty: {
    Mudah: { coins: 5, xp: 30 },
    Menengah: { coins: 7, xp: 45 },
    Sulit: { coins: 10, xp: 65 },
    'Sangat Sulit': { coins: 12, xp: 85 },
  } as const,
} as const;

export const WEEKLY_MISSION_CONFIG = {
  quota: { hub: 2, onet: 1, match3: 1 } as const,
  rewardsByDifficulty: {
    Mudah: { coins: 10, xp: 60 },
    Menengah: { coins: 15, xp: 90 },
    Sulit: { coins: 20, xp: 130 },
    'Sangat Sulit': { coins: 25, xp: 175 },
  } as const,
} as const;

const makeDaily = (
  id: string,
  game: GameModeId | 'hub',
  type: MissionTemplate['type'],
  title: string,
  desc: string,
  target: number,
  difficulty: 'Mudah' | 'Menengah' | 'Sulit',
  coinsOverride?: number,
): MissionTemplate => ({
  id,
  game,
  type,
  title,
  desc,
  target,
  difficulty,
  rewardCoins: coinsOverride ?? DAILY_MISSION_CONFIG.rewardsByDifficulty[difficulty].coins,
  rewardXp: DAILY_MISSION_CONFIG.rewardsByDifficulty[difficulty].xp,
});

const makeWeekly = (
  id: string,
  game: GameModeId | 'hub',
  type: MissionTemplate['type'],
  title: string,
  desc: string,
  target: number,
  difficulty: 'Menengah' | 'Sulit' | 'Sangat Sulit',
): MissionTemplate => ({
  id,
  game,
  type,
  title,
  desc,
  target,
  difficulty,
  rewardCoins: WEEKLY_MISSION_CONFIG.rewardsByDifficulty[difficulty].coins,
  rewardXp: WEEKLY_MISSION_CONFIG.rewardsByDifficulty[difficulty].xp,
});

/**
 * Daily Missions Pool — strictly Onet, Match 3, or Universal ('hub').
 * Universal missions advance identically from either Onet or Match 3.
 */
export const DAILY_MISSIONS_POOL: readonly MissionTemplate[] = [
  // Universal ('hub')
  makeDaily('d_hub_clear_2', 'hub', 'clear_levels', 'Pemanasan Klub', 'Selesaikan 2 level di Onet atau Match 3.', 2, 'Mudah'),
  makeDaily('d_hub_clear_4', 'hub', 'clear_levels', 'Makin Fokus', 'Selesaikan 4 level di Onet atau Match 3.', 4, 'Menengah'),
  makeDaily('d_hub_clear_7', 'hub', 'clear_levels', 'Juara Harian', 'Selesaikan 7 level di Onet atau Match 3.', 7, 'Sulit'),
  makeDaily('d_hub_stars_6', 'hub', 'earn_stars', 'Pemburu Bintang', 'Kumpulkan 6 bintang dari level mana saja.', 6, 'Mudah'),
  makeDaily('d_hub_stars_12', 'hub', 'earn_stars', 'Langit Berbintang', 'Kumpulkan 12 bintang dari level mana saja.', 12, 'Sulit'),
  makeDaily('d_hub_score_4k', 'hub', 'score', 'Tabungan Skor', 'Kumpulkan 4.000 poin di mode apa saja.', 4000, 'Menengah', 8),
  makeDaily('d_hub_score_10k', 'hub', 'score', 'Skor Tinggi', 'Kumpulkan 10.000 poin di mode apa saja.', 10000, 'Sulit'),

  // Onet-scoped
  makeDaily('d_onet_pairs_30', 'onet', 'match_pairs', 'Ketemu Pasangannya', 'Hubungkan 30 pasangan tile di Onet.', 30, 'Mudah'),
  makeDaily('d_onet_pairs_80', 'onet', 'match_pairs', 'Papan Bersih', 'Hubungkan 80 pasangan tile di Onet.', 80, 'Menengah'),
  makeDaily('d_onet_split_4', 'onet', 'split_tiles', 'Kejutan di Dalam Tile', 'Pecahkan 4 tile gabungan di Onet.', 4, 'Menengah'),
  makeDaily('d_onet_combo_6', 'onet', 'combo', 'Kombo Lincah', 'Capai Combo ×6 dalam satu ronde Onet.', 6, 'Menengah'),
  makeDaily('d_onet_flawless_1', 'onet', 'flawless', 'Langkah Sempurna', 'Menangkan 1 level Onet tanpa salah klik.', 1, 'Mudah'),
  makeDaily('d_onet_fast_1', 'onet', 'fast_clear', 'Sat Set', 'Selesaikan 1 level Onet di bawah 45 detik.', 1, 'Menengah'),
  makeDaily('d_onet_survivor_1', 'onet', 'survivor', 'Santai Aja', 'Menangkan 1 level Onet dengan sisa waktu > 50%.', 1, 'Mudah'),

  // Match 3-scoped
  makeDaily('d_m3_tiles_80', 'match3', 'm3_tiles', 'Rangkai Tiga', 'Cocokkan 80 tile di Match 3.', 80, 'Mudah'),
  makeDaily('d_m3_tiles_180', 'match3', 'm3_tiles', 'Papan Warna-warni', 'Cocokkan 180 tile di Match 3.', 180, 'Menengah'),
  makeDaily('d_m3_specials_4', 'match3', 'm3_specials', 'Pembuat Spesial', 'Buat 4 tile spesial (Line/Bomb/Rainbow) di Match 3.', 4, 'Menengah'),
  makeDaily('d_m3_blockers_10', 'match3', 'm3_blockers', 'Penghancur Rintangan', 'Hancurkan 10 es atau peti kayu di Match 3.', 10, 'Menengah'),
  makeDaily('d_m3_cascade_4', 'match3', 'm3_cascade', 'Reaksi Berantai', 'Picu Cascade ×4 dalam satu langkah Match 3.', 4, 'Sulit'),
];

/**
 * Weekly Missions Pool — strictly Onet, Match 3, or Universal ('hub').
 */
export const WEEKLY_MISSIONS_POOL: readonly MissionTemplate[] = [
  // Universal ('hub')
  makeWeekly('w_hub_clear_15', 'hub', 'clear_levels', 'Maraton Mingguan', 'Selesaikan 15 level di Onet atau Match 3.', 15, 'Menengah'),
  makeWeekly('w_hub_clear_28', 'hub', 'clear_levels', 'Pejuang Tiada Henti', 'Selesaikan 28 level di Onet atau Match 3.', 28, 'Sulit'),
  makeWeekly('w_hub_clear_42', 'hub', 'clear_levels', 'Legenda Pekan Ini', 'Selesaikan 42 level di Onet atau Match 3.', 42, 'Sangat Sulit'),
  makeWeekly('w_hub_stars_45', 'hub', 'earn_stars', 'Koleksi Bintang Sepekan', 'Kumpulkan 45 bintang di mode apa saja.', 45, 'Sulit'),
  makeWeekly('w_hub_score_60k', 'hub', 'score', 'Pesta Poin', 'Kumpulkan 60.000 poin sepanjang minggu.', 60000, 'Menengah'),

  // Onet-scoped
  makeWeekly('w_onet_splits_15', 'onet', 'split_tiles', 'Lapisan Kejutan', 'Pecahkan 15 tile gabungan di Onet.', 15, 'Menengah'),
  makeWeekly('w_onet_combo_15', 'onet', 'combo', 'Rantai Sempurna', 'Capai Combo ×15 dalam satu ronde Onet.', 15, 'Sulit'),
  makeWeekly('w_onet_flawless_8', 'onet', 'flawless', 'Presisi Tinggi', 'Selesaikan 8 level Onet tanpa kesalahan (Flawless).', 8, 'Sulit'),
  makeWeekly('w_onet_fast_10', 'onet', 'fast_clear', 'Kilat Onet', 'Selesaikan 10 level Onet di bawah 45 detik.', 10, 'Menengah'),

  // Match 3-scoped
  makeWeekly('w_m3_specials_20', 'match3', 'm3_specials', 'Master Ledakan', 'Buat 20 tile spesial di Match 3 sepanjang minggu.', 20, 'Menengah'),
  makeWeekly('w_m3_blockers_80', 'match3', 'm3_blockers', 'Pembuka Jalan', 'Hancurkan 80 es atau rintangan di Match 3.', 80, 'Sulit'),
  makeWeekly('w_m3_cascade_6', 'match3', 'm3_cascade', 'Gelombang Kombo', 'Picu Cascade ×6 di Match 3.', 6, 'Sangat Sulit'),
];

const sumStars = (data: ConnectifySaveDataV1): number =>
  data.progression.onet.totalStars + data.progression.match3.totalStars;

const countClaimedAchievementTiers = (data: ConnectifySaveDataV1): number =>
  Object.values(data.achievements.claimedTiers || {}).reduce(
    (sum, tier) => sum + (Number.isFinite(tier) ? Math.max(0, tier) : 0),
    0,
  );

export const ACHIEVEMENTS_CATALOG: readonly AchievementDefinition[] = [
  // Global Hub Achievements (6 multi-tier tracks)
  {
    id: 'first_win',
    game: 'hub',
    category: 'progression',
    title: 'Langkah Pertama',
    desc: (target) => `Menangkan ${target} level puzzle.`,
    tiers: [{ target: 1, rewardCoins: 5, rewardXp: 30 }],
    getProgress: (d) => d.statistics.totalWins,
  },
  {
    id: 'levels_cleared',
    game: 'hub',
    category: 'progression',
    title: 'Penjelajah Dunia',
    desc: (target) => `Selesaikan ${target} level (Onet atau Match 3).`,
    tiers: [
      { target: 10, rewardCoins: 8, rewardXp: 50 },
      { target: 50, rewardCoins: 12, rewardXp: 100 },
      { target: 150, rewardCoins: 20, rewardXp: 180 },
      { target: 350, rewardCoins: 30, rewardXp: 300 },
    ],
    getProgress: (d) => d.statistics.totalWins,
  },
  {
    id: 'total_stars',
    game: 'hub',
    category: 'mastery',
    title: 'Kolektor Bintang',
    desc: (target) => `Kumpulkan total ${target} bintang.`,
    tiers: [
      { target: 25, rewardCoins: 8, rewardXp: 50 },
      { target: 100, rewardCoins: 15, rewardXp: 120 },
      { target: 250, rewardCoins: 25, rewardXp: 220 },
      { target: 500, rewardCoins: 35, rewardXp: 350 },
    ],
    getProgress: sumStars,
  },
  {
    id: 'total_score',
    game: 'hub',
    category: 'progression',
    title: 'Pengumpul Skor',
    desc: (target) => `Kumpulkan total ${target.toLocaleString('id-ID')} skor.`,
    tiers: [
      { target: 25_000, rewardCoins: 8, rewardXp: 50 },
      { target: 150_000, rewardCoins: 15, rewardXp: 120 },
      { target: 750_000, rewardCoins: 25, rewardXp: 240 },
    ],
    getProgress: (d) => d.statistics.totalScore,
  },
  {
    id: 'daily_missions',
    game: 'hub',
    category: 'progression',
    title: 'Semangat Terus',
    desc: (target) => `Klaim ${target} Misi Harian.`,
    tiers: [
      { target: 15, rewardCoins: 8, rewardXp: 60 },
      { target: 45, rewardCoins: 15, rewardXp: 130 },
      { target: 90, rewardCoins: 25, rewardXp: 220 },
    ],
    getProgress: (d) => d.statistics.totalDailyMissionsCompleted,
  },
  {
    id: 'login_streak',
    game: 'hub',
    category: 'progression',
    title: 'Pelanggan Setia',
    desc: (target) => `Capai streak login ${target} hari.`,
    tiers: [
      { target: 3, rewardCoins: 6, rewardXp: 40 },
      { target: 7, rewardCoins: 10, rewardXp: 80 },
      { target: 14, rewardCoins: 15, rewardXp: 150 },
      { target: 30, rewardCoins: 25, rewardXp: 300 },
    ],
    getProgress: (d) => d.profile.loginStreak.bestStreak,
  },
  {
    id: 'theme_collector',
    game: 'hub',
    category: 'collection',
    title: 'Kolektor Tema',
    desc: (target) => `Miliki ${target} tema di koleksimu.`,
    tiers: [
      { target: 3, rewardCoins: 8, rewardXp: 50 },
      { target: 6, rewardCoins: 15, rewardXp: 100 },
      { target: 10, rewardCoins: 25, rewardXp: 180 },
    ],
    getProgress: (d) => d.inventory.unlockedThemes.length,
  },

  // Onet-Specific Achievements (6 tracks)
  {
    id: 'onet_flawless',
    game: 'onet',
    category: 'mastery',
    title: 'Mainnya Sempurna',
    desc: (target) => `Menangkan ${target} level Onet tanpa salah klik (Flawless).`,
    tiers: [
      { target: 5, rewardCoins: 6, rewardXp: 50 },
      { target: 20, rewardCoins: 12, rewardXp: 110 },
      { target: 60, rewardCoins: 20, rewardXp: 200 },
    ],
    getProgress: (d) => d.statistics.totalFlawlessWins,
  },
  {
    id: 'onet_combo',
    game: 'onet',
    category: 'mastery',
    title: 'Kombo Mantap',
    desc: (target) => `Capai Combo ×${target} di Onet.`,
    tiers: [
      { target: 8, rewardCoins: 6, rewardXp: 50 },
      { target: 15, rewardCoins: 12, rewardXp: 100 },
      { target: 25, rewardCoins: 20, rewardXp: 180 },
      { target: 40, rewardCoins: 30, rewardXp: 280 },
    ],
    getProgress: (d) => d.statistics.onet.bestCombo,
  },
  {
    id: 'onet_speedrun',
    game: 'onet',
    category: 'mastery',
    title: 'Cepat Banget',
    desc: (target) => `Selesaikan ${target} level Onet di bawah 45 detik.`,
    tiers: [
      { target: 5, rewardCoins: 6, rewardXp: 50 },
      { target: 25, rewardCoins: 14, rewardXp: 120 },
      { target: 75, rewardCoins: 24, rewardXp: 220 },
    ],
    getProgress: (d) => d.statistics.onet.speedrunWinsUnder45s,
  },
  {
    id: 'onet_survivor',
    game: 'onet',
    category: 'mastery',
    title: 'Master Bertahan',
    desc: (target) => `Selesaikan ${target} level Onet dengan sisa waktu > 50%.`,
    tiers: [
      { target: 5, rewardCoins: 6, rewardXp: 50 },
      { target: 20, rewardCoins: 12, rewardXp: 110 },
      { target: 50, rewardCoins: 22, rewardXp: 200 },
    ],
    getProgress: (d) => d.statistics.onet.survivorWinsOver50PctTime,
  },
  {
    id: 'onet_splitter',
    game: 'onet',
    category: 'progression',
    title: 'Pemecah Tile',
    desc: (target) => `Pecahkan ${target} tile gabungan di Onet.`,
    tiers: [
      { target: 25, rewardCoins: 6, rewardXp: 45 },
      { target: 100, rewardCoins: 12, rewardXp: 100 },
      { target: 350, rewardCoins: 22, rewardXp: 200 },
    ],
    getProgress: (d) => d.statistics.onet.totalSplits,
  },
  {
    id: 'onet_near_death',
    game: 'onet',
    category: 'secret',
    title: 'Deg-degan Ya?',
    desc: (target) => `Selesaikan ${target} level Onet saat sisa waktu <= 1 detik.`,
    tiers: [
      { target: 1, rewardCoins: 10, rewardXp: 60 },
      { target: 5, rewardCoins: 20, rewardXp: 150 },
    ],
    getProgress: (d) => d.statistics.onet.nearDeathWinsUnder1s,
  },

  // Match 3-Specific Achievements (6 tracks)
  {
    id: 'm3_cascade',
    game: 'match3',
    category: 'mastery',
    title: 'Reaksi Berantai',
    desc: (target) => `Capai Cascade ×${target} dalam satu langkah Match 3.`,
    tiers: [
      { target: 4, rewardCoins: 6, rewardXp: 50 },
      { target: 6, rewardCoins: 12, rewardXp: 110 },
      { target: 8, rewardCoins: 20, rewardXp: 200 },
      { target: 10, rewardCoins: 30, rewardXp: 300 },
    ],
    getProgress: (d) => d.statistics.match3.bestCombo,
  },
  {
    id: 'm3_specials',
    game: 'match3',
    category: 'mastery',
    title: 'Ahli Booster Papan',
    desc: (target) => `Buat ${target} Tile Spesial di Match 3.`,
    tiers: [
      { target: 25, rewardCoins: 6, rewardXp: 45 },
      { target: 120, rewardCoins: 14, rewardXp: 110 },
      { target: 400, rewardCoins: 24, rewardXp: 220 },
    ],
    getProgress: (d) => d.statistics.match3.specialTilesCreated,
  },
  {
    id: 'm3_power_combos',
    game: 'match3',
    category: 'mastery',
    title: 'Ledakan Ganda',
    desc: (target) => `Picu ${target} kombinasi Tile Spesial + Spesial di Match 3.`,
    tiers: [
      { target: 10, rewardCoins: 8, rewardXp: 55 },
      { target: 40, rewardCoins: 15, rewardXp: 130 },
      { target: 120, rewardCoins: 25, rewardXp: 240 },
    ],
    getProgress: (d) => d.statistics.match3.specialCombosTriggered,
  },
  {
    id: 'm3_blockers',
    game: 'match3',
    category: 'progression',
    title: 'Penghancur Rintangan',
    desc: (target) => `Bersihkan ${target} es atau rintangan di Match 3.`,
    tiers: [
      { target: 50, rewardCoins: 6, rewardXp: 45 },
      { target: 250, rewardCoins: 14, rewardXp: 115 },
      { target: 800, rewardCoins: 24, rewardXp: 220 },
    ],
    getProgress: (d) => d.statistics.match3.blockersCleared,
  },
  {
    id: 'm3_efficient',
    game: 'match3',
    category: 'mastery',
    title: 'Langkah Hemat',
    desc: (target) => `Menangkan ${target} level Match 3 dengan skor >= 5.000.`,
    tiers: [
      { target: 5, rewardCoins: 6, rewardXp: 50 },
      { target: 20, rewardCoins: 12, rewardXp: 110 },
      { target: 60, rewardCoins: 22, rewardXp: 200 },
    ],
    getProgress: (d) =>
      Object.values(d.progression.match3.levels).filter((l) => l.completed && l.highScore >= 5000).length,
  },
  {
    id: 'm3_tiles_cleared',
    game: 'match3',
    category: 'progression',
    title: 'Kolektor Warna',
    desc: (target) => `Cocokkan total ${target.toLocaleString('id-ID')} tile di Match 3.`,
    tiers: [
      { target: 500, rewardCoins: 6, rewardXp: 45 },
      { target: 2500, rewardCoins: 14, rewardXp: 110 },
      { target: 10000, rewardCoins: 25, rewardXp: 220 },
    ],
    getProgress: (d) => d.statistics.match3.totalTilesCleared,
  },
];

export const ACCOUNT_MILESTONES: readonly AccountMilestoneDefinition[] = [
  { id: 'ms_lv2', accountLevel: 2, rewardCoins: 50, label: 'Daily Challenges + 50 Connect Coins' },
  { id: 'ms_lv3', accountLevel: 3, rewardCoins: 0, rewardTheme: 'reward_sakura', label: 'Tema Sakura Reward' },
  { id: 'ms_lv4', accountLevel: 4, rewardCoins: 0, rewardAvatar: 'reward_avatar_cat', rewardCosmetic: 'reward_tile2_mint', label: 'Avatar Cat & Mint Duo' },
  { id: 'ms_lv5', accountLevel: 5, rewardCoins: 0, rewardTheme: 'reward_bakery', label: 'Tema Bakery Reward + Gelar Pencari Pasangan' },
  { id: 'ms_lv6', accountLevel: 6, rewardCoins: 0, rewardCosmetic: 'reward_tile4_night', label: 'Night Cube Skin' },
  { id: 'ms_lv7', accountLevel: 7, rewardCoins: 0, rewardCosmetic: 'reward_arrow_mint', label: 'Mint Arrow Skin' },
  { id: 'ms_lv10', accountLevel: 10, rewardCoins: 150, rewardBoosters: { hint: 1, shuffle: 1 }, label: 'Gelar Peracik Kombo + 150 Coins + 2 Booster' },
  { id: 'ms_lv15', accountLevel: 15, rewardCoins: 0, rewardCosmetic: 'frame_mint', label: 'Gelar Ahli Strategi + Frame Mint' },
  { id: 'ms_lv20', accountLevel: 20, rewardCoins: 300, rewardCosmetic: 'effect_stars', label: 'Gelar Bintang Klub + 300 Coins + Efek Star Shower' },
  { id: 'ms_lv30', accountLevel: 30, rewardCoins: 400, label: 'Gelar Virtuoso Visual + 400 Coins' },
  { id: 'ms_lv35', accountLevel: 35, rewardCoins: 500, label: 'Gelar Master Puzzle + 500 Coins' },
  { id: 'ms_lv50', accountLevel: 50, rewardCoins: 750, label: 'Gelar Legenda Connectify + 750 Coins' },
] as const;

export function getAchievementTotalClaimedTiers(data: ConnectifySaveDataV1): number {
  return countClaimedAchievementTiers(data);
}

export function getRankForLevel(level: number): XpRankDefinition {
  const safeLevel = Math.max(1, Math.floor(level));
  let matched = XP_RANKS[0];
  for (const rank of XP_RANKS) {
    if (safeLevel >= rank.level) matched = rank;
  }
  return matched;
}

export function getNextRankForLevel(level: number): XpRankDefinition | null {
  const safeLevel = Math.max(1, Math.floor(level));
  return XP_RANKS.find((r) => r.level > safeLevel) ?? null;
}

export const PROGRESSION_MODES_SUPPORTED: readonly GameId[] = ['onet', 'match3'] as const;
