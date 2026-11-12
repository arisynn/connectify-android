#!/usr/bin/env node
/**
 * Connectify Android — 30-Day Virtual Economy Simulation Engine
 * Deterministic + Seeded Monte Carlo (N = 500 trials per profile)
 *
 * Simulates all 9 required player archetypes over 30 days:
 *  1. Casual
 *  2. Average
 *  3. Skilled
 *  4. Highly Active
 *  5. Onet-primary
 *  6. Match3-primary
 *  7. Alternating
 *  8. Booster-heavy
 *  9. Cosmetic-only
 * Plus: Anti-Farming / Exploit Stress Suite (Level-1 Replay Bot, Duplicate Tx Replay, Negative Balance Guard)
 */

// ============================================================================
// 1. ECONOMY CONFIGURATION CONSTANTS (Connect Coins / "Permen")
// ============================================================================

export const ECONOMY_CONFIG = {
  currencyId: 'permen',
  currencyDisplayName: 'Connect Coins (Permen)',
  economyVersion: 4,
  resetTimezoneOffsetHours: 7, // 00:00 WIB (UTC+7)

  // Gameplay Duration Benchmarks (seconds)
  durations: {
    onetAvgAttemptSec: 75,   // 1.25 min per Onet level attempt
    match3AvgAttemptSec: 90, // 1.50 min per Match 3 level attempt (1.20x Onet)
  },

  // Per-Level Gameplay Rewards (Fresh Clear)
  levelRewards: {
    onet: {
      baseWin: 3,
      firstClearBonus: 2,
      starBonuses: [0, 1, 2], // 1★ = +0, 2★ = +1, 3★ = +2 (lifetime delta per level)
      perfBonus: 1,           // Flawless OR Speedrun (<45s) OR Combo >= 8
      pityFailCoinEveryNLosses: 3, // +1 coin on 3rd consecutive loss (anti-frustration)
    },
    match3: {
      baseWin: 4,             // 4 vs 3 compensates for 90s vs 75s duration
      firstClearBonus: 2,
      starBonuses: [0, 1, 2], // 1★ = +0, 2★ = +1, 3★ = +2 (lifetime delta per level)
      perfBonus: 1,           // Cascade >= 4 OR >= 5 Moves Left
      superPerfBonus: 1,      // Extra +1 when both Cascade >= 5 and Special Combo triggered
      pityFailCoinEveryNLosses: 3,
    },
  },

  // Anti-Farming Replay Diminishing Returns
  replayDecay: {
    // Multiplier on baseWin + perfBonus when replaying an already-cleared level on the same day
    sameDayMultipliers: [1.0, 0.5, 0.25, 0.0], // index 0 = first clear, 1 = 1st replay today (50%), 2 = 2nd replay (25%), 3+ = 0%
    lowLevelGapThreshold: 10, // If level < highestLevel - 10 and already 3★
    lowLevelGapMultiplier: 0.25,
  },

  // Daily Gameplay Soft & Hard Caps (Applies ONLY to repeatable level completion coins; never blocks missions/login/achievements)
  dailyGameplayCaps: {
    softCap: 80,              // 0..80 gameplay coins/day at 100% rate
    softCapMultiplier: 0.5,   // 81..120 gameplay coins/day at 50% rate
    hardCap: 120,             // >120 gameplay coins/day -> 1 coin flat on new level clear, 0 on replay
    postHardCapNewClearCoin: 1,
  },

  // Daily Challenge (1 per day, Onet Sprint or Match 3 Daily Puzzle)
  dailyChallenge: {
    rewardCoins: 8,
  },

  // Daily Login Streak (7-day repeating cycle, matches connectify-new LOGIN_REWARDS)
  loginRewards: [5, 5, 6, 7, 8, 9, 10],

  // Daily Missions (4 slots per day, dual-condition Onet OR Match 3)
  dailyMissions: [
    { id: 'dm_easy', difficulty: 'Mudah', reward: 5, targetLevels: 2 },
    { id: 'dm_med1', difficulty: 'Menengah', reward: 7, targetLevels: 4 },
    { id: 'dm_med2', difficulty: 'Menengah', reward: 8, targetLevels: 5 },
    { id: 'dm_hard', difficulty: 'Sulit', reward: 10, targetLevels: 7 },
  ],
  dailyMissionAllClearBonus: 5, // Granted when >= 3 daily missions claimed

  // Weekly Missions (3 slots per week, dual-condition Onet OR Match 3)
  weeklyMissions: [
    { id: 'wm_med', difficulty: 'Menengah', reward: 15, targetLevels: 15 },
    { id: 'wm_hard', difficulty: 'Sulit', reward: 20, targetLevels: 28 },
    { id: 'wm_epic', difficulty: 'Sangat Sulit', reward: 25, targetLevels: 42 },
  ],

  // Achievements (One-time milestone tiers across 30 days)
  achievements: [
    { id: 'first_win', metric: 'totalWins', tiers: [{ target: 1, reward: 5 }] },
    { id: 'levels_cleared', metric: 'totalWins', tiers: [{ target: 10, reward: 8 }, { target: 50, reward: 12 }, { target: 150, reward: 20 }, { target: 300, reward: 30 }] },
    { id: 'stars_earned', metric: 'totalStars', tiers: [{ target: 25, reward: 8 }, { target: 100, reward: 15 }, { target: 250, reward: 25 }, { target: 500, reward: 35 }] },
    { id: 'login_streak', metric: 'bestStreak', tiers: [{ target: 3, reward: 6 }, { target: 7, reward: 10 }, { target: 14, reward: 15 }, { target: 30, reward: 25 }] },
    { id: 'daily_missions_done', metric: 'missionsClaimed', tiers: [{ target: 15, reward: 8 }, { target: 45, reward: 15 }, { target: 90, reward: 25 }] },
    { id: 'combo_mastery', metric: 'perfWins', tiers: [{ target: 5, reward: 6 }, { target: 25, reward: 12 }, { target: 75, reward: 20 }, { target: 150, reward: 30 }] },
    { id: 'theme_collector', metric: 'themesOwned', tiers: [{ target: 3, reward: 8 }, { target: 6, reward: 15 }, { target: 10, reward: 25 }] },
    { id: 'wealth_milestone', metric: 'totalEarned', tiers: [{ target: 100, reward: 5 }, { target: 500, reward: 10 }, { target: 1500, reward: 20 }, { target: 3000, reward: 30 }] },
  ],

  // Boosters & Consumables Catalog
  boosters: {
    hint: { id: 'hint', name: 'Hint (Petunjuk)', price: 8, bundle3Price: 21, game: 'both', freeStart: 3, maxStock: 99 },
    shuffle: { id: 'shuffle', name: 'Shuffle (Acak Papan)', price: 12, bundle3Price: 32, game: 'both', freeStart: 3, maxStock: 99 },
    hammer: { id: 'hammer', name: 'Hammer (Palu)', price: 14, bundle3Price: 38, game: 'both', freeStart: 3, maxStock: 99 },
    extra_moves: { id: 'extra_moves', name: '+5 Moves / +15s Time', price: 16, bundle3Price: 43, game: 'both', freeStart: 2, maxStock: 99 },
    bomb: { id: 'bomb', name: 'Area Bomb (Bom 3x3)', price: 18, bundle3Price: 48, game: 'both', freeStart: 3, maxStock: 99 },
    color_burst: { id: 'color_burst', name: 'Color Burst (Pelangi)', price: 22, bundle3Price: 58, game: 'match3', freeStart: 2, maxStock: 99 },
  },

  // Permanent Catalog (Themes, Skin Packs, Board Surfaces, Avatars, Frames, Effects, Animations)
  catalog: [
    // Themes (12 Purchasable; 2 Free Starter: sweets, meadow; 5 Milestone Reward: reward_sakura, reward_bakery, reward_galaxy, reward_meadow, reward_fruit)
    { id: 'theme_ocean', name: 'Ocean Friends', category: 'theme', rarity: 'Common', price: 60 },
    { id: 'theme_forest', name: 'Forest Tales', category: 'theme', rarity: 'Common', price: 80 },
    { id: 'theme_candy', name: 'Candy Parade', category: 'theme', rarity: 'Common', price: 80 },
    { id: 'theme_space', name: 'Cosmic Trip', category: 'theme', rarity: 'Rare', price: 100 },
    { id: 'theme_fruit', name: 'Fruit Market', category: 'theme', rarity: 'Rare', price: 100 },
    { id: 'theme_bakery', name: 'Petite Bakery', category: 'theme', rarity: 'Rare', price: 110 },
    { id: 'theme_sakura', name: 'Sakura Atelier', category: 'theme', rarity: 'Rare', price: 120 },
    { id: 'theme_autumn_harvest', name: 'Autumn Harvest', category: 'theme', rarity: 'Rare', price: 120 },
    { id: 'theme_alpine_winter', name: 'Alpine Winter', category: 'theme', rarity: 'Epic', price: 130 },
    { id: 'theme_retro_arcade', name: 'Retro Arcade', category: 'theme', rarity: 'Epic', price: 140 },
    { id: 'theme_galaxy', name: 'Midnight Galaxy', category: 'theme', rarity: 'Epic', price: 150 },
    { id: 'theme_magic_atelier', name: 'Magic Atelier', category: 'theme', rarity: 'Epic', price: 150 },

    // Tile Skin Packs (9 Purchasable; 1 Free Starter: tilepack_pearl)
    { id: 'tilepack_candy', name: 'Strawberry Milk Set', category: 'tilepack', rarity: 'Common', price: 105 },
    { id: 'tilepack_opal', name: 'Opal Set', category: 'tilepack', rarity: 'Rare', price: 125 },
    { id: 'tilepack_amber', name: 'Amber Set', category: 'tilepack', rarity: 'Rare', price: 130 },
    { id: 'tilepack_mint', name: 'Jade Set', category: 'tilepack', rarity: 'Rare', price: 135 },
    { id: 'tilepack_night', name: 'Midnight Set', category: 'tilepack', rarity: 'Epic', price: 140 },
    { id: 'tilepack_pixel', name: 'Pixel Pop Set', category: 'tilepack', rarity: 'Epic', price: 140 },
    { id: 'tilepack_frost', name: 'Frosted Set', category: 'tilepack', rarity: 'Epic', price: 140 },
    { id: 'tilepack_sunset', name: 'Honey Set', category: 'tilepack', rarity: 'Legendary', price: 150 },
    { id: 'tilepack_enchanted', name: 'Enchanted Set', category: 'tilepack', rarity: 'Legendary', price: 150 },

    // Board Surfaces (7 Purchasable; 1 Free Starter: block_pearl)
    { id: 'block_jelly', name: 'Jelly Rose Surface', category: 'surface', rarity: 'Common', price: 80 },
    { id: 'block_amber', name: 'Amber Surface', category: 'surface', rarity: 'Common', price: 80 },
    { id: 'block_ceramic', name: 'Opal Ceramic Surface', category: 'surface', rarity: 'Rare', price: 85 },
    { id: 'block_pixel', name: 'Pixel Grid Surface', category: 'surface', rarity: 'Rare', price: 85 },
    { id: 'block_frost', name: 'Frosted Surface', category: 'surface', rarity: 'Rare', price: 85 },
    { id: 'block_wood', name: 'Maple Wood Surface', category: 'surface', rarity: 'Epic', price: 90 },
    { id: 'block_enchanted', name: 'Enchanted Surface', category: 'surface', rarity: 'Epic', price: 90 },

    // Avatars & Frames (18 Purchasable)
    { id: 'frame_mint', name: 'Mint Club Frame', category: 'cosmetic', rarity: 'Common', price: 50 },
    { id: 'portrait_panda', name: 'Bambu Avatar', category: 'cosmetic', rarity: 'Common', price: 60 },
    { id: 'portrait_penguin', name: 'Pip Avatar', category: 'cosmetic', rarity: 'Common', price: 60 },
    { id: 'avatar_mochi', name: 'Mochi Avatar', category: 'cosmetic', rarity: 'Common', price: 65 },
    { id: 'portrait_shiba', name: 'Kuma Avatar', category: 'cosmetic', rarity: 'Common', price: 65 },
    { id: 'frame_autumn', name: 'Autumn Wreath Frame', category: 'cosmetic', rarity: 'Common', price: 65 },
    { id: 'portrait_fox', name: 'Rubi Avatar', category: 'cosmetic', rarity: 'Rare', price: 70 },
    { id: 'frame_moon', name: 'Moonlit Frame', category: 'cosmetic', rarity: 'Rare', price: 70 },
    { id: 'frame_arcade', name: 'Arcade Loop Frame', category: 'cosmetic', rarity: 'Rare', price: 70 },
    { id: 'portrait_koala', name: 'Lumi Avatar', category: 'cosmetic', rarity: 'Rare', price: 75 },
    { id: 'avatar_hedgehog', name: 'Hazel Avatar', category: 'cosmetic', rarity: 'Rare', price: 75 },
    { id: 'frame_sunset', name: 'Golden Hour Frame', category: 'cosmetic', rarity: 'Rare', price: 75 },
    { id: 'frame_frost', name: 'Frost Halo Frame', category: 'cosmetic', rarity: 'Rare', price: 75 },
    { id: 'avatar_robot', name: 'Bip Avatar', category: 'cosmetic', rarity: 'Epic', price: 80 },
    { id: 'avatar_polar_cub', name: 'Snowy Avatar', category: 'cosmetic', rarity: 'Epic', price: 80 },
    { id: 'frame_enchanted', name: 'Enchanted Ring Frame', category: 'cosmetic', rarity: 'Epic', price: 80 },
    { id: 'avatar_orbit', name: 'Orbit Avatar', category: 'cosmetic', rarity: 'Epic', price: 90 },
    { id: 'avatar_wizard_owl', name: 'Professor Hoot Avatar', category: 'cosmetic', rarity: 'Epic', price: 90 },

    // Victory Effects & Match Animations & Direction Skins (16 Purchasable)
    { id: 'arrow_mint', name: 'Mint Compass', category: 'cosmetic', rarity: 'Common', price: 35 },
    { id: 'arrow_sunset', name: 'Sun Compass', category: 'cosmetic', rarity: 'Common', price: 40 },
    { id: 'effect_confetti', name: 'Club Confetti', category: 'effect', rarity: 'Common', price: 60 },
    { id: 'effect_stars', name: 'Star Shower', category: 'effect', rarity: 'Common', price: 65 },
    { id: 'effect_autumn', name: 'Falling Leaves', category: 'effect', rarity: 'Common', price: 65 },
    { id: 'effect_pixel', name: 'Pixel Party', category: 'effect', rarity: 'Common', price: 65 },
    { id: 'anim_onet_autumn', name: 'Autumn Drift (Onet)', category: 'effect', rarity: 'Common', price: 65 },
    { id: 'anim_match3_autumn', name: 'Autumn Drift (Match 3)', category: 'effect', rarity: 'Common', price: 65 },
    { id: 'effect_snow', name: 'Snowfall', category: 'effect', rarity: 'Rare', price: 70 },
    { id: 'anim_onet_pixel', name: 'Pixel Pop (Onet)', category: 'effect', rarity: 'Rare', price: 70 },
    { id: 'anim_match3_pixel', name: 'Pixel Pop (Match 3)', category: 'effect', rarity: 'Rare', price: 70 },
    { id: 'effect_magic', name: 'Magic Sparkles', category: 'effect', rarity: 'Rare', price: 75 },
    { id: 'anim_onet_snow', name: 'Frost Bloom (Onet)', category: 'effect', rarity: 'Rare', price: 75 },
    { id: 'anim_match3_snow', name: 'Frost Bloom (Match 3)', category: 'effect', rarity: 'Rare', price: 75 },
    { id: 'anim_onet_magic', name: 'Magic Orbit (Onet)', category: 'effect', rarity: 'Epic', price: 80 },
    { id: 'anim_match3_magic', name: 'Magic Orbit (Match 3)', category: 'effect', rarity: 'Epic', price: 80 },
  ],
};

// ============================================================================
// 2. SEEDED PRNG (Mulberry32) FOR REPRODUCIBLE MONTE CARLO
// ============================================================================

function createRng(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// 3. NINE REQUIRED PLAYER PROFILES
// ============================================================================

export const PLAYER_PROFILES = [
  {
    id: 'casual',
    name: '1. Casual',
    description: '1 short session/day (~9 min), 80% active days, light progression, low booster usage',
    activeDayProb: 0.80,
    sessionsPerActiveDay: 1.1,
    minutesPerSession: 8.5,
    onetShare: 0.50,
    winRate: 0.72,
    threeStarProb: 0.25,
    twoStarProb: 0.45,
    perfBonusProb: 0.30,
    replayFraction: 0.10,
    dailyChallengeProb: 0.40,
    boosterBudgetShare: 0.15,
    prefersThemesFirst: true,
  },
  {
    id: 'average',
    name: '2. Average',
    description: '2 sessions/day (~18 min total), 95% active days, balanced play & spending',
    activeDayProb: 0.95,
    sessionsPerActiveDay: 2.0,
    minutesPerSession: 9.0,
    onetShare: 0.50,
    winRate: 0.78,
    threeStarProb: 0.38,
    twoStarProb: 0.44,
    perfBonusProb: 0.48,
    replayFraction: 0.12,
    dailyChallengeProb: 0.75,
    boosterBudgetShare: 0.20,
    prefersThemesFirst: true,
  },
  {
    id: 'skilled',
    name: '3. Skilled',
    description: '2 sessions/day (~24 min total), 98% active days, 90% win rate, high 3-star & combo rate',
    activeDayProb: 0.98,
    sessionsPerActiveDay: 2.0,
    minutesPerSession: 12.0,
    onetShare: 0.50,
    winRate: 0.90,
    threeStarProb: 0.68,
    twoStarProb: 0.26,
    perfBonusProb: 0.75,
    replayFraction: 0.08,
    dailyChallengeProb: 0.95,
    boosterBudgetShare: 0.08,
    prefersThemesFirst: true,
  },
  {
    id: 'highly_active',
    name: '4. Highly Active',
    description: '3.5 sessions/day (~45 min total), 100% active days, tests soft-cap & replay decay',
    activeDayProb: 1.00,
    sessionsPerActiveDay: 3.5,
    minutesPerSession: 13.0,
    onetShare: 0.50,
    winRate: 0.82,
    threeStarProb: 0.48,
    twoStarProb: 0.38,
    perfBonusProb: 0.55,
    replayFraction: 0.22,
    dailyChallengeProb: 1.00,
    boosterBudgetShare: 0.18,
    prefersThemesFirst: true,
  },
  {
    id: 'onet_primary',
    name: '5. Onet-primary',
    description: '2 sessions/day (20.0 min total), 90% Onet / 10% Match 3, 78% win rate (Parity Cohort A)',
    activeDayProb: 1.00,
    sessionsPerActiveDay: 2.0,
    minutesPerSession: 10.0,
    onetShare: 0.90,
    winRate: 0.78,
    threeStarProb: 0.40,
    twoStarProb: 0.42,
    perfBonusProb: 0.50,
    replayFraction: 0.10,
    dailyChallengeProb: 0.85,
    boosterBudgetShare: 0.18,
    prefersThemesFirst: true,
  },
  {
    id: 'match3_primary',
    name: '6. Match3-primary',
    description: '2 sessions/day (20.0 min total), 10% Onet / 90% Match 3, 78% win rate (Parity Cohort B)',
    activeDayProb: 1.00,
    sessionsPerActiveDay: 2.0,
    minutesPerSession: 10.0,
    onetShare: 0.10,
    winRate: 0.78,
    threeStarProb: 0.40,
    twoStarProb: 0.42,
    perfBonusProb: 0.50,
    replayFraction: 0.10,
    dailyChallengeProb: 0.85,
    boosterBudgetShare: 0.18,
    prefersThemesFirst: true,
  },
  {
    id: 'alternating',
    name: '7. Alternating',
    description: '2 sessions/day (20.0 min total), 50% Onet / 50% Match 3, 78% win rate (Parity Cohort C)',
    activeDayProb: 1.00,
    sessionsPerActiveDay: 2.0,
    minutesPerSession: 10.0,
    onetShare: 0.50,
    winRate: 0.78,
    threeStarProb: 0.40,
    twoStarProb: 0.42,
    perfBonusProb: 0.50,
    replayFraction: 0.10,
    dailyChallengeProb: 0.85,
    boosterBudgetShare: 0.18,
    prefersThemesFirst: true,
  },
  {
    id: 'booster_heavy',
    name: '8. Booster-heavy',
    description: '2 sessions/day (20.0 min total), heavy booster consumption (45% budget share), boosted win rate',
    activeDayProb: 0.96,
    sessionsPerActiveDay: 2.0,
    minutesPerSession: 10.0,
    onetShare: 0.50,
    winRate: 0.85, // Boosted by frequent Hint/Shuffle/Hammer/Bomb use
    threeStarProb: 0.46,
    twoStarProb: 0.40,
    perfBonusProb: 0.52,
    replayFraction: 0.10,
    dailyChallengeProb: 0.85,
    boosterBudgetShare: 0.45,
    prefersThemesFirst: true,
  },
  {
    id: 'cosmetic_only',
    name: '9. Cosmetic-only',
    description: '2 sessions/day (20.0 min total), 0 coins spent on boosters, 100% spent on themes & cosmetics',
    activeDayProb: 0.96,
    sessionsPerActiveDay: 2.0,
    minutesPerSession: 10.0,
    onetShare: 0.50,
    winRate: 0.80,
    threeStarProb: 0.42,
    twoStarProb: 0.42,
    perfBonusProb: 0.50,
    replayFraction: 0.10,
    dailyChallengeProb: 0.85,
    boosterBudgetShare: 0.00,
    prefersThemesFirst: false, // Buys across themes, tilepacks, surfaces, avatars, frames, effects
  },
];

// ============================================================================
// 4. SINGLE-TRIAL 30-DAY SIMULATION ENGINE
// ============================================================================

export function simulateThirtyDays(profileCfg, seed = 42) {
  const rng = createRng(seed);

  // Player state
  let balance = 0;
  let totalEarned = 0;
  let totalSpentBoosters = 0;
  let totalSpentThemes = 0;
  let totalSpentCosmetics = 0;

  let sourceBreakdown = {
    onetGameplay: 0,
    match3Gameplay: 0,
    dailyChallenge: 0,
    loginRewards: 0,
    dailyMissions: 0,
    weeklyMissions: 0,
    achievements: 0,
  };

  let totalMinutesPlayed = 0;
  let onetMinutesPlayed = 0;
  let match3MinutesPlayed = 0;
  let onetAttempts = 0;
  let match3Attempts = 0;
  let onetWins = 0;
  let match3Wins = 0;
  let totalWins = 0;
  let totalStars = 0;
  let perfWins = 0;
  let missionsClaimed = 0;
  let loginStreak = 0;
  let bestStreak = 0;
  let consecutiveLosses = 0;

  let ownedItems = new Set(['theme_sweets', 'theme_meadow', 'tilepack_pearl', 'block_pearl', 'effect_blossom', 'arrow_pearl']);
  let themesOwnedCount = 2; // sweets + meadow starter
  let firstThemeUnlockDay = null;
  let secondThemeUnlockDay = null;
  let firstEpicThemeUnlockDay = null;
  let achievementTiersClaimed = {};
  let boostersBoughtCount = 0;
  let negativeBalanceAttemptsBlocked = 0;

  // Weekly mission accumulators (reset every 7 days)
  let weeklyLevelsCleared = 0;
  let weeklyClaimed = new Set();

  // Shop purchase priority queue for this profile
  const themeItems = ECONOMY_CONFIG.catalog.filter((i) => i.category === 'theme');
  const otherCosmetics = ECONOMY_CONFIG.catalog.filter((i) => i.category !== 'theme');
  let purchaseQueue = [];
  if (profileCfg.prefersThemesFirst) {
    // Interleave: 2 themes, then 1 cosmetic/tilepack/surface so player gets both themes and variety
    let tIdx = 0;
    let cIdx = 0;
    while (tIdx < themeItems.length || cIdx < otherCosmetics.length) {
      if (tIdx < themeItems.length) purchaseQueue.push(themeItems[tIdx++]);
      if (tIdx < themeItems.length) purchaseQueue.push(themeItems[tIdx++]);
      if (cIdx < otherCosmetics.length) purchaseQueue.push(otherCosmetics[cIdx++]);
    }
  } else {
    // Cosmetic-only collector: interleave 1 theme, 1 cosmetic/tilepack/surface sorted by price ascending
    purchaseQueue = [...ECONOMY_CONFIG.catalog].sort((a, b) => a.price - b.price);
  }

  const dailySnapshots = [];

  for (let day = 1; day <= 30; day++) {
    if ((day - 1) % 7 === 0) {
      weeklyLevelsCleared = 0;
      weeklyClaimed.clear();
    }

    const isActiveDay = rng() <= profileCfg.activeDayProb;
    let dayEarned = 0;
    let dayGameplayCoins = 0;
    let dayLevelsWon = 0;

    if (!isActiveDay) {
      loginStreak = 0;
      dailySnapshots.push({
        day,
        active: false,
        dayEarned: 0,
        balance,
        totalEarned,
        themesOwnedCount,
        ownedPermanentCount: ownedItems.size - 6,
      });
      continue;
    }

    // 1. Daily Login Streak Claim
    loginStreak += 1;
    bestStreak = Math.max(bestStreak, loginStreak);
    const loginCoin = ECONOMY_CONFIG.loginRewards[(loginStreak - 1) % ECONOMY_CONFIG.loginRewards.length];
    balance += loginCoin;
    totalEarned += loginCoin;
    dayEarned += loginCoin;
    sourceBreakdown.loginRewards += loginCoin;

    // 2. Determine sessions and play time today
    const sessionNoise = 0.85 + rng() * 0.30; // [0.85, 1.15]
    const playMinutesToday = profileCfg.sessionsPerActiveDay * profileCfg.minutesPerSession * sessionNoise;
    totalMinutesPlayed += playMinutesToday;

    // Split minutes into level attempts
    let remainingSec = playMinutesToday * 60;
    let sameDayReplays = 0;

    while (remainingSec >= 40) {
      const isOnet = rng() < profileCfg.onetShare;
      const attemptSec = isOnet
        ? ECONOMY_CONFIG.durations.onetAvgAttemptSec * (0.85 + rng() * 0.30)
        : ECONOMY_CONFIG.durations.match3AvgAttemptSec * (0.85 + rng() * 0.30);

      remainingSec -= attemptSec;
      if (isOnet) {
        onetMinutesPlayed += attemptSec / 60;
        onetAttempts += 1;
      } else {
        match3MinutesPlayed += attemptSec / 60;
        match3Attempts += 1;
      }

      const isReplay = rng() < profileCfg.replayFraction;
      const won = rng() < profileCfg.winRate;

      if (won) {
        consecutiveLosses = 0;
        totalWins += 1;
        dayLevelsWon += 1;
        weeklyLevelsCleared += 1;
        if (isOnet) onetWins += 1;
        else match3Wins += 1;

        // Calculate raw level coin reward
        const cfg = isOnet ? ECONOMY_CONFIG.levelRewards.onet : ECONOMY_CONFIG.levelRewards.match3;
        let rawCoins = 0;

        if (!isReplay) {
          // Fresh level clear!
          const starRoll = rng();
          const stars = starRoll < profileCfg.threeStarProb ? 3 : starRoll < profileCfg.threeStarProb + profileCfg.twoStarProb ? 2 : 1;
          totalStars += stars;
          const starCoin = cfg.starBonuses[stars - 1];
          const hasPerf = rng() < profileCfg.perfBonusProb;
          if (hasPerf) perfWins += 1;
          const perfCoin = hasPerf ? cfg.perfBonus : 0;
          const superPerfCoin = !isOnet && hasPerf && rng() < 0.30 ? cfg.superPerfBonus : 0;

          rawCoins = cfg.baseWin + cfg.firstClearBonus + starCoin + perfCoin + superPerfCoin;
        } else {
          // Replay of an already-completed level
          sameDayReplays += 1;
          const replayIdx = Math.min(sameDayReplays, 3);
          const mult = ECONOMY_CONFIG.replayDecay.sameDayMultipliers[replayIdx];
          const hasPerf = rng() < profileCfg.perfBonusProb;
          rawCoins = Math.floor((cfg.baseWin + (hasPerf ? cfg.perfBonus : 0)) * mult);
          // Occasional star upgrade (+1 coin 20% of first replays)
          if (replayIdx === 1 && rng() < 0.20) {
            rawCoins += 1;
            totalStars += 1;
          }
        }

        // Apply Daily Gameplay Soft-Cap & Hard-Cap
        let grantedCoins = 0;
        if (dayGameplayCoins < ECONOMY_CONFIG.dailyGameplayCaps.softCap) {
          grantedCoins = rawCoins;
        } else if (dayGameplayCoins < ECONOMY_CONFIG.dailyGameplayCaps.hardCap) {
          grantedCoins = Math.max(1, Math.round(rawCoins * ECONOMY_CONFIG.dailyGameplayCaps.softCapMultiplier));
        } else {
          grantedCoins = isReplay ? 0 : ECONOMY_CONFIG.dailyGameplayCaps.postHardCapNewClearCoin;
        }

        dayGameplayCoins += grantedCoins;
        balance += grantedCoins;
        totalEarned += grantedCoins;
        dayEarned += grantedCoins;
        if (isOnet) sourceBreakdown.onetGameplay += grantedCoins;
        else sourceBreakdown.match3Gameplay += grantedCoins;
      } else {
        // Loss: check anti-frustration pity coin on 3rd consecutive loss
        consecutiveLosses += 1;
        if (consecutiveLosses >= 3) {
          consecutiveLosses = 0;
          if (dayGameplayCoins < ECONOMY_CONFIG.dailyGameplayCaps.hardCap) {
            balance += 1;
            totalEarned += 1;
            dayEarned += 1;
            dayGameplayCoins += 1;
            if (isOnet) sourceBreakdown.onetGameplay += 1;
            else sourceBreakdown.match3Gameplay += 1;
          }
        }
      }
    }

    // 3. Daily Challenge Completion
    if (dayLevelsWon >= 1 && rng() < profileCfg.dailyChallengeProb) {
      const dcCoin = ECONOMY_CONFIG.dailyChallenge.rewardCoins;
      balance += dcCoin;
      totalEarned += dcCoin;
      dayEarned += dcCoin;
      sourceBreakdown.dailyChallenge += dcCoin;
    }

    // 4. Daily Missions Claim
    let dailyClaimedToday = 0;
    for (const dm of ECONOMY_CONFIG.dailyMissions) {
      if (dayLevelsWon >= dm.targetLevels) {
        balance += dm.reward;
        totalEarned += dm.reward;
        dayEarned += dm.reward;
        sourceBreakdown.dailyMissions += dm.reward;
        dailyClaimedToday += 1;
        missionsClaimed += 1;
      }
    }
    if (dailyClaimedToday >= 3) {
      const bonus = ECONOMY_CONFIG.dailyMissionAllClearBonus;
      balance += bonus;
      totalEarned += bonus;
      dayEarned += bonus;
      sourceBreakdown.dailyMissions += bonus;
    }

    // 5. Weekly Missions Claim
    for (const wm of ECONOMY_CONFIG.weeklyMissions) {
      if (!weeklyClaimed.has(wm.id) && weeklyLevelsCleared >= wm.targetLevels) {
        weeklyClaimed.add(wm.id);
        balance += wm.reward;
        totalEarned += wm.reward;
        dayEarned += wm.reward;
        sourceBreakdown.weeklyMissions += wm.reward;
        missionsClaimed += 1;
      }
    }

    // 6. Achievements Check & Claim
    const metrics = {
      totalWins,
      totalStars,
      bestStreak,
      missionsClaimed,
      perfWins,
      themesOwned: themesOwnedCount,
      totalEarned,
    };
    for (const ach of ECONOMY_CONFIG.achievements) {
      const currentTier = achievementTiersClaimed[ach.id] || 0;
      if (currentTier < ach.tiers.length) {
        const tierObj = ach.tiers[currentTier];
        if (metrics[ach.metric] >= tierObj.target) {
          achievementTiersClaimed[ach.id] = currentTier + 1;
          balance += tierObj.reward;
          totalEarned += tierObj.reward;
          dayEarned += tierObj.reward;
          sourceBreakdown.achievements += tierObj.reward;
        }
      }
    }

    // 7. Spending Behavior: Boosters first (up to boosterBudgetShare), then Themes & Cosmetics
    if (profileCfg.boosterBudgetShare > 0) {
      const targetBoosterSpend = totalEarned * profileCfg.boosterBudgetShare;
      const boosterTypes = [
        ECONOMY_CONFIG.boosters.hint,
        ECONOMY_CONFIG.boosters.shuffle,
        ECONOMY_CONFIG.boosters.hammer,
        ECONOMY_CONFIG.boosters.extra_moves,
        ECONOMY_CONFIG.boosters.bomb,
      ];
      while (totalSpentBoosters < targetBoosterSpend) {
        const b = boosterTypes[Math.floor(rng() * boosterTypes.length)];
        if (balance >= b.price) {
          balance -= b.price;
          totalSpentBoosters += b.price;
          boostersBoughtCount += 1;
        } else {
          negativeBalanceAttemptsBlocked += 1;
          break;
        }
      }
    }

    // 8. Permanent Shop Purchases (Themes, Tile Skin Packs, Surfaces, Cosmetics)
    // Reserve a small buffer if booster-heavy so they don't starve booster stock
    const reserveBuffer = profileCfg.id === 'booster_heavy' ? 18 : 0;
    for (const item of purchaseQueue) {
      if (ownedItems.has(item.id)) continue;
      if (balance - reserveBuffer >= item.price) {
        balance -= item.price;
        ownedItems.add(item.id);
        if (item.category === 'theme') {
          totalSpentThemes += item.price;
          themesOwnedCount += 1;
          if (firstThemeUnlockDay === null) firstThemeUnlockDay = day;
          else if (secondThemeUnlockDay === null) secondThemeUnlockDay = day;
          if (item.rarity === 'Epic' && firstEpicThemeUnlockDay === null) {
            firstEpicThemeUnlockDay = day;
          }
        } else {
          totalSpentCosmetics += item.price;
        }
      }
    }

    dailySnapshots.push({
      day,
      active: true,
      dayEarned,
      balance,
      totalEarned,
      themesOwnedCount,
      ownedPermanentCount: ownedItems.size - 6,
    });
  }

  const totalSpent = totalSpentBoosters + totalSpentThemes + totalSpentCosmetics;
  const activeDays = dailySnapshots.filter((d) => d.active).length;

  return {
    profileId: profileCfg.id,
    profileName: profileCfg.name,
    activeDays,
    totalMinutesPlayed,
    onetMinutesPlayed,
    match3MinutesPlayed,
    onetAttempts,
    match3Attempts,
    onetWins,
    match3Wins,
    totalWins,
    totalStars,
    totalEarned,
    totalSpent,
    totalSpentBoosters,
    totalSpentThemes,
    totalSpentCosmetics,
    endingBalance: balance,
    coinsPerMinuteTotal: totalEarned / Math.max(1, totalMinutesPlayed),
    coinsPerMinuteGameplayOnly:
      (sourceBreakdown.onetGameplay + sourceBreakdown.match3Gameplay) / Math.max(1, totalMinutesPlayed),
    onetGameplayCoinsPerMin:
      onetMinutesPlayed > 0 ? sourceBreakdown.onetGameplay / onetMinutesPlayed : 0,
    match3GameplayCoinsPerMin:
      match3MinutesPlayed > 0 ? sourceBreakdown.match3Gameplay / match3MinutesPlayed : 0,
    coinsPerCompletedLevel: totalEarned / Math.max(1, totalWins),
    gameplayCoinsPerCompletedLevel:
      (sourceBreakdown.onetGameplay + sourceBreakdown.match3Gameplay) / Math.max(1, totalWins),
    dailyIncomeAvgAllDays: totalEarned / 30,
    dailyIncomeAvgActiveDays: totalEarned / Math.max(1, activeDays),
    themesPurchased: themesOwnedCount - 2,
    totalThemesUnlocked: themesOwnedCount + 5, // +2 starter +5 milestone reward themes
    permanentItemsPurchased: ownedItems.size - 6,
    catalogCompletionPct: ((ownedItems.size - 6) / ECONOMY_CONFIG.catalog.length) * 100,
    boostersBoughtCount,
    firstThemeUnlockDay: firstThemeUnlockDay ?? 30,
    secondThemeUnlockDay: secondThemeUnlockDay ?? 30,
    firstEpicThemeUnlockDay: firstEpicThemeUnlockDay ?? 30,
    sourceBreakdown,
    dailySnapshots,
    negativeBalanceOccurred: balance < 0,
  };
}

// ============================================================================
// 5. MONTE CARLO AGGREGATOR (N = 500 RUNS PER PROFILE)
// ============================================================================

export function runMonteCarlo(trials = 500) {
  const results = {};

  for (const prof of PLAYER_PROFILES) {
    const runs = [];
    for (let i = 0; i < trials; i++) {
      runs.push(simulateThirtyDays(prof, 10000 + i * 97 + prof.id.length * 31));
    }

    const avg = (fn) => runs.reduce((s, r) => s + fn(r), 0) / trials;
    const pct = (fn, p) => {
      const sorted = runs.map(fn).sort((a, b) => a - b);
      return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    };

    // Representative deterministic trajectory (median-like seed)
    const deterministicRun = simulateThirtyDays(prof, 20261112);

    results[prof.id] = {
      profile: prof,
      trials,
      meanTotalEarned: avg((r) => r.totalEarned),
      p10TotalEarned: pct((r) => r.totalEarned, 0.10),
      p50TotalEarned: pct((r) => r.totalEarned, 0.50),
      p90TotalEarned: pct((r) => r.totalEarned, 0.90),
      meanTotalSpent: avg((r) => r.totalSpent),
      meanSpentBoosters: avg((r) => r.totalSpentBoosters),
      meanSpentThemes: avg((r) => r.totalSpentThemes),
      meanSpentCosmetics: avg((r) => r.totalSpentCosmetics),
      meanEndingBalance: avg((r) => r.endingBalance),
      meanDailyIncome: avg((r) => r.dailyIncomeAvgAllDays),
      meanDailyIncomeActive: avg((r) => r.dailyIncomeAvgActiveDays),
      meanCoinsPerMinTotal: avg((r) => r.coinsPerMinuteTotal),
      meanCoinsPerMinGameplay: avg((r) => r.coinsPerMinuteGameplayOnly),
      meanOnetCoinsPerMin: avg((r) => r.onetGameplayCoinsPerMin),
      meanMatch3CoinsPerMin: avg((r) => r.match3GameplayCoinsPerMin),
      meanCoinsPerWinTotal: avg((r) => r.coinsPerCompletedLevel),
      meanCoinsPerWinGameplay: avg((r) => r.gameplayCoinsPerCompletedLevel),
      meanTotalWins: avg((r) => r.totalWins),
      meanTotalMinutes: avg((r) => r.totalMinutesPlayed),
      meanThemesPurchased: avg((r) => r.themesPurchased),
      meanPermanentPurchased: avg((r) => r.permanentItemsPurchased),
      meanCatalogCompletionPct: avg((r) => r.catalogCompletionPct),
      meanBoostersBought: avg((r) => r.boostersBoughtCount),
      meanFirstThemeDay: avg((r) => r.firstThemeUnlockDay),
      meanSecondThemeDay: avg((r) => r.secondThemeUnlockDay),
      meanFirstEpicThemeDay: avg((r) => r.firstEpicThemeUnlockDay),
      meanSources: {
        onetGameplay: avg((r) => r.sourceBreakdown.onetGameplay),
        match3Gameplay: avg((r) => r.sourceBreakdown.match3Gameplay),
        dailyChallenge: avg((r) => r.sourceBreakdown.dailyChallenge),
        loginRewards: avg((r) => r.sourceBreakdown.loginRewards),
        dailyMissions: avg((r) => r.sourceBreakdown.dailyMissions),
        weeklyMissions: avg((r) => r.sourceBreakdown.weeklyMissions),
        achievements: avg((r) => r.sourceBreakdown.achievements),
      },
      anyNegativeBalance: runs.some((r) => r.negativeBalanceOccurred),
      deterministicRun,
    };
  }

  return results;
}

// ============================================================================
// 6. ANTI-FARMING & EXPLOIT STRESS VERIFICATION SUITE
// ============================================================================

export function runExploitVerificationSuite() {
  // Test 1: Level-1 Replay Farming Bot (grinds Level 1 100 times in a single day)
  const level1BotOutcomes = [];
  let botTotalCoins = 0;
  for (let attempt = 0; attempt < 100; attempt++) {
    let coins = 0;
    if (attempt === 0) {
      // First clear (3★ + perf bonus)
      coins = 3 + 2 + 2 + 1; // 8 coins
    } else {
      const mult = ECONOMY_CONFIG.replayDecay.sameDayMultipliers[Math.min(attempt, 3)];
      coins = Math.floor((3 + 1) * mult);
    }
    botTotalCoins += coins;
    if (attempt < 6 || attempt === 99) {
      level1BotOutcomes.push({ attempt: attempt + 1, coinsGranted: coins, cumulativeCoins: botTotalCoins });
    }
  }

  // Test 2: Idempotent Transaction Ledger (Duplicate runId / opId replay attack)
  const processedTxIds = new Set();
  let walletBalance = 50;
  const applyRewardTx = (txId, amount) => {
    if (processedTxIds.has(txId)) {
      return { status: 'REJECTED_DUPLICATE_TX', balance: walletBalance, delta: 0 };
    }
    processedTxIds.add(txId);
    walletBalance += amount;
    return { status: 'COMMITTED', balance: walletBalance, delta: amount };
  };
  const firstClaim = applyRewardTx('run-uuid-9001', 8);
  const duplicateClaim1 = applyRewardTx('run-uuid-9001', 8);
  const duplicateClaim2 = applyRewardTx('run-uuid-9001', 8);

  // Test 3: Atomic Purchase & Zero-Negative-Balance Guarantee
  const ownedSet = new Set();
  const attemptPurchase = (txId, itemId, price, isPermanent = true) => {
    if (processedTxIds.has(txId)) return { status: 'IDEMPOTENT_NOOP', balance: walletBalance };
    if (isPermanent && ownedSet.has(itemId)) return { status: 'REJECTED_ALREADY_OWNED', balance: walletBalance };
    if (!Number.isInteger(price) || price < 0) return { status: 'REJECTED_INVALID_PRICE', balance: walletBalance };
    if (walletBalance < price) return { status: 'REJECTED_INSUFFICIENT_FUNDS', balance: walletBalance };
    walletBalance -= price;
    if (isPermanent) ownedSet.add(itemId);
    processedTxIds.add(txId);
    return { status: 'COMMITTED', balance: walletBalance };
  };
  const buyOcean = attemptPurchase('tx-buy-1', 'theme_ocean', 60, true); // balance 58 < 60 -> rejected!
  const buyFrame = attemptPurchase('tx-buy-2', 'frame_mint', 50, true); // balance 58 >= 50 -> balance becomes 8
  const buyFrameDup = attemptPurchase('tx-buy-3', 'frame_mint', 50, true); // already owned -> rejected!
  const buyHint = attemptPurchase('tx-buy-4', 'hint', 8, false); // balance 8 >= 8 -> balance becomes 0
  const buyUnderflow = attemptPurchase('tx-buy-5', 'hint', 8, false); // balance 0 < 8 -> rejected!

  return {
    level1BotTotalFrom100Runs: botTotalCoins,
    level1BotOutcomes,
    idempotencyTest: { firstClaim, duplicateClaim1, duplicateClaim2 },
    atomicPurchaseTest: { buyOcean, buyFrame, buyFrameDup, buyHint, buyUnderflow, finalBalance: walletBalance },
  };
}

// ============================================================================
// 7. CLI EXECUTION & JSON / TABLE OUTPUT
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const mc = runMonteCarlo(500);
  const exploits = runExploitVerificationSuite();

  console.log('=== CONNECTIFY ANDROID: 30-DAY ECONOMY SIMULATION (N=500 MONTE CARLO TRIALS PER PROFILE) ===\n');
  console.log(
    'Profile              | 30d Earned (P10 / Mean / P90) | Daily Avg | Coins/Min (All / Game) | Spend (Boost / Theme / Cosm) | End Bal | Themes | Catalog % | 1st Theme'
  );
  console.log('-'.repeat(162));

  for (const key of Object.keys(mc)) {
    const r = mc[key];
    const name = r.profile.name.padEnd(20);
    const earnedStr = `${Math.round(r.p10TotalEarned).toString().padStart(4)} / ${Math.round(r.meanTotalEarned).toString().padStart(4)} / ${Math.round(r.p90TotalEarned).toString().padStart(4)}`.padEnd(29);
    const dailyStr = `${r.meanDailyIncome.toFixed(1).padStart(5)}/d`.padEnd(9);
    const cpmStr = `${r.meanCoinsPerMinTotal.toFixed(2)} / ${r.meanCoinsPerMinGameplay.toFixed(2)}`.padEnd(22);
    const spendStr = `${Math.round(r.meanSpentBoosters).toString().padStart(4)} / ${Math.round(r.meanSpentThemes).toString().padStart(4)} / ${Math.round(r.meanSpentCosmetics).toString().padStart(4)}`.padEnd(28);
    const balStr = Math.round(r.meanEndingBalance).toString().padStart(7);
    const thmStr = `${r.meanThemesPurchased.toFixed(1)}/12`.padStart(6);
    const catStr = `${r.meanCatalogCompletionPct.toFixed(1)}%`.padStart(9);
    const d1Str = `Day ${r.meanFirstThemeDay.toFixed(1)}`.padStart(9);
    console.log(`${name} | ${earnedStr} | ${dailyStr} | ${cpmStr} | ${spendStr} | ${balStr} | ${thmStr} | ${catStr} | ${d1Str}`);
  }

  const onetP = mc.onet_primary;
  const match3P = mc.match3_primary;
  const altP = mc.alternating;
  const parityDiffPct =
    (Math.abs(onetP.meanTotalEarned - match3P.meanTotalEarned) /
      ((onetP.meanTotalEarned + match3P.meanTotalEarned) / 2)) *
    100;
  const gameplayParityDiffPct =
    (Math.abs(onetP.meanOnetCoinsPerMin - match3P.meanMatch3CoinsPerMin) /
      ((onetP.meanOnetCoinsPerMin + match3P.meanMatch3CoinsPerMin) / 2)) *
    100;

  console.log('\n=== ONET VS MATCH 3 EARNING PARITY CHECK ===');
  console.log(`Onet-primary 30d Mean Earned   : ${onetP.meanTotalEarned.toFixed(1)} Coins (${onetP.meanCoinsPerMinTotal.toFixed(3)} total coins/min, ${onetP.meanOnetCoinsPerMin.toFixed(3)} Onet gameplay coins/min)`);
  console.log(`Match3-primary 30d Mean Earned : ${match3P.meanTotalEarned.toFixed(1)} Coins (${match3P.meanCoinsPerMinTotal.toFixed(3)} total coins/min, ${match3P.meanMatch3CoinsPerMin.toFixed(3)} Match3 gameplay coins/min)`);
  console.log(`Alternating 30d Mean Earned    : ${altP.meanTotalEarned.toFixed(1)} Coins (${altP.meanCoinsPerMinTotal.toFixed(3)} total coins/min)`);
  console.log(`30-Day Total Income Divergence : ${parityDiffPct.toFixed(2)}% (Target: < 3.00%)`);
  console.log(`Active Gameplay Rate Divergence: ${gameplayParityDiffPct.toFixed(2)}% (Target: < 3.00%)`);

  console.log('\n=== INCOME SOURCE BREAKDOWN (30-DAY MEAN PER PROFILE) ===');
  console.log('Profile              | OnetGame | M3Game | DailyCh | Login | DailyMis | WeeklyMis | Achiev | Wins | Coins/Win (All/Game)');
  console.log('-'.repeat(120));
  for (const key of Object.keys(mc)) {
    const r = mc[key];
    const s = r.meanSources;
    console.log(
      `${r.profile.name.padEnd(20)} | ${Math.round(s.onetGameplay).toString().padStart(8)} | ${Math.round(s.match3Gameplay).toString().padStart(6)} | ${Math.round(s.dailyChallenge).toString().padStart(7)} | ${Math.round(s.loginRewards).toString().padStart(5)} | ${Math.round(s.dailyMissions).toString().padStart(8)} | ${Math.round(s.weeklyMissions).toString().padStart(9)} | ${Math.round(s.achievements).toString().padStart(6)} | ${Math.round(r.meanTotalWins).toString().padStart(4)} | ${r.meanCoinsPerWinTotal.toFixed(2).padStart(5)} / ${r.meanCoinsPerWinGameplay.toFixed(2).padStart(5)}`
    );
  }

  console.log('\n=== DETERMINISTIC TRAJECTORY CHECKPOINTS (DAY 1, DAY 7, DAY 14, DAY 30) ===');
  console.log('Profile              | D1 Earn/Bal | D7 Cumul/Bal/Thm | D14 Cumul/Bal/Thm | D30 Cumul/Bal/Thm/Items');
  console.log('-'.repeat(105));
  for (const key of Object.keys(mc)) {
    const d = mc[key].deterministicRun.dailySnapshots;
    const d1 = d[0], d7 = d[6], d14 = d[13], d30 = d[29];
    console.log(
      `${mc[key].profile.name.padEnd(20)} | ${String(d1.totalEarned).padStart(4)} / ${String(d1.balance).padStart(3)}  | ${String(d7.totalEarned).padStart(5)} / ${String(d7.balance).padStart(3)} / ${String(d7.themesOwnedCount - 2).padStart(2)} | ${String(d14.totalEarned).padStart(5)} / ${String(d14.balance).padStart(3)} / ${String(d14.themesOwnedCount - 2).padStart(2)}  | ${String(d30.totalEarned).padStart(5)} / ${String(d30.balance).padStart(3)} / ${String(d30.themesOwnedCount - 2).padStart(2)} / ${String(d30.ownedPermanentCount).padStart(2)}`
    );
  }

  console.log('\n=== ANTI-FARMING & EXPLOIT STRESS VERIFICATION ===');
  console.log(`Level-1 Replay Bot (100 clears in 1 day): Total earned = ${exploits.level1BotTotalFrom100Runs} Coins (Attempt 1 = 8, Attempt 2 = 2, Attempt 3 = 1, Attempts 4..100 = 0 Coins)`);
  console.log(`Duplicate runId Claim Test              : 1st = ${exploits.idempotencyTest.firstClaim.status} (+${exploits.idempotencyTest.firstClaim.delta}), 2nd = ${exploits.idempotencyTest.duplicateClaim1.status} (+${exploits.idempotencyTest.duplicateClaim1.delta})`);
  console.log(`Zero-Negative-Balance Purchase Guard    : Final wallet = ${exploits.atomicPurchaseTest.finalBalance} Coins, Underflow attempt = ${exploits.atomicPurchaseTest.buyUnderflow.status}`);
  console.log(`Monte Carlo Negative Balance Incidents  : ${Object.values(mc).filter((r) => r.anyNegativeBalance).length} across ${Object.keys(mc).length * 500} runs (0 expected)`);

  if (process.argv.includes('--json')) {
    console.log('\n---JSON_START---');
    console.log(JSON.stringify({ mc, exploits }, null, 2));
    console.log('---JSON_END---');
  }
}
