#!/usr/bin/env node
/**
 * Connectify Android — Player Progression & Difficulty Curve Simulation
 * Validates:
 * 1. Global Account XP Curve & Rank Pacing (Levels 1 to 60)
 * 2. Onet vs. Match 3 XP/Minute & Session Parity (Mode Independence)
 * 3. 30-Day Retention & Milestone Unlock Timing across 6 Player Archetypes
 * 4. Onet & Match 3 Level Difficulty Curve Validation (Levels 1 to 100)
 * 5. Dynamic Difficulty Adjustment (DDA) & Pity System Convergence
 */

// ============================================================================
// 1. GLOBAL PROGRESSION CONFIGURATION (Connectify Android Unified Config)
// ============================================================================

export const PROGRESSION_CONFIG = {
  xpCurve: {
    baseXpPerLevel: 100,
    linearIncrementPerLevel: 50,
    // Cumulative XP required to reach `level` (Level 1 = 0 XP)
    // Formula from connectify-new/src/core/progression.js:
    // xpForLevel(L) = 100 * (L - 1) + 25 * (L - 1) * (L - 2)
    xpForLevel(level) {
      const L = Math.max(1, Math.floor(level));
      return 100 * (L - 1) + 25 * (L - 1) * (L - 2);
    },
    // Incremental XP needed to advance from L to L + 1: 100 + 50 * (L - 1)
    xpDeltaForNextLevel(level) {
      const L = Math.max(1, Math.floor(level));
      return 100 + 50 * (L - 1);
    },
    // Exact inverse formula: L = floor((-75 + sqrt(5625 + 100 * xp)) / 50) + 1
    levelFromXp(xp) {
      const safeXp = Math.max(0, Number(xp) || 0);
      return Math.floor((-75 + Math.sqrt(5625 + 100 * safeXp)) / 50) + 1;
    },
  },

  ranks: [
    { level: 1, id: 'rank_newcomer', titleId: 'Teman Baru', titleEn: 'New Friend', badge: 'bronze_1' },
    { level: 5, id: 'rank_seeker', titleId: 'Pencari Pasangan', titleEn: 'Pair Seeker', badge: 'bronze_2' },
    { level: 10, id: 'rank_combo', titleId: 'Peracik Kombo', titleEn: 'Combo Crafter', badge: 'silver_1' },
    { level: 15, id: 'rank_tactician', titleId: 'Ahli Strategi', titleEn: 'Board Tactician', badge: 'silver_2' },
    { level: 20, id: 'rank_star', titleId: 'Bintang Klub', titleEn: 'Club Star', badge: 'gold_1' },
    { level: 30, id: 'rank_virtuoso', titleId: 'Virtuoso Visual', titleEn: 'Visual Virtuoso', badge: 'gold_2' },
    { level: 35, id: 'rank_master', titleId: 'Master Puzzle', titleEn: 'Puzzle Master', badge: 'platinum_1' },
    { level: 50, id: 'rank_legend', titleId: 'Legenda Connectify', titleEn: 'Connectify Legend', badge: 'diamond_1' },
  ],

  // Mode-balanced XP formulas: tuned so 1 minute of active play yields ~80-90 XP in both modes
  roundXp: {
    onet: {
      baseWinXp: 95,
      starBonusXp: [0, 10, 20, 35], // 1★: +10, 2★: +20, 3★: +35
      flawlessBonusXp: 20,
      comboXpPerChain: 2,
      maxComboXp: 25,
      speedBonusXp: 15, // Clear with >40% timer remaining
      firstTimeClearBonusXp: 25,
      replayMultiplier: 0.65, // Replaying already-3-starred early levels gives 65% XP
      lossMaxXp: 35,
    },
    match3: {
      baseWinXp: 110, // Match 3 rounds average ~95s vs Onet ~78s (1.22x duration ratio)
      starBonusXp: [0, 12, 24, 40], // 1★: +12, 2★: +24, 3★: +40
      cascadeBonusXpPerChain: 3,
      maxCascadeXp: 30,
      specialTileActivationXp: 3,
      maxSpecialXp: 18,
      firstTimeClearBonusXp: 30,
      replayMultiplier: 0.65,
      lossMaxXp: 40,
    },
  },

  retentionRewards: {
    loginXpPerDay: 25,
    loginStreakBonusXpDay7: 75,
    dailyMissionXp: { Mudah: 30, Menengah: 45, Sulit: 65 },
    dailyAllCompleteBonusXp: 50,
    weeklyMissionXp: { Menengah: 90, Sulit: 130, 'Sangat Sulit': 175 },
    dailySprintChallengeWinXp: 80,
  },

  milestones: [
    { id: 'ms_lv2', type: 'account_level', target: 2, reward: 'unlock_daily_challenges + 50 Coins' },
    { id: 'ms_lv3', type: 'account_level', target: 3, reward: 'reward_sakura (Sakura Theme)' },
    { id: 'ms_lv4', type: 'account_level', target: 4, reward: 'reward_avatar_cat + reward_tile2_mint' },
    { id: 'ms_lv5', type: 'account_level', target: 5, reward: 'reward_bakery (Bakery Theme) + Rank: Pencari Pasangan' },
    { id: 'ms_lv6', type: 'account_level', target: 6, reward: 'reward_tile4_night (Night Cube Skin)' },
    { id: 'ms_lv7', type: 'account_level', target: 7, reward: 'reward_arrow_mint (Mint Arrow Skin)' },
    { id: 'ms_lv10', type: 'account_level', target: 10, reward: 'Rank: Peracik Kombo + 150 Coins + 2 Boosters' },
    { id: 'ms_lv15', type: 'account_level', target: 15, reward: 'Rank: Ahli Strategi + Frame Mint' },
    { id: 'ms_lv20', type: 'account_level', target: 20, reward: 'Rank: Bintang Klub + 300 Coins + Star Shower FX' },
    { id: 'ms_lv35', type: 'account_level', target: 35, reward: 'Rank: Master Puzzle + 500 Coins' },
    { id: 'ms_lv50', type: 'account_level', target: 50, reward: 'Rank: Legenda Connectify + Mythic Crown Frame' },
  ],
};

// ============================================================================
// 2. ONET & MATCH 3 LEVEL DIFFICULTY GENERATORS (Levels 1 to 100)
// ============================================================================

export function getOnetLevelSpec(level) {
  const L = Math.max(1, Math.floor(level));
  // 4 Pacing Bands:
  // Band 1: Early Onboarding (Lv 1-10)
  // Band 2: Intermediate (Lv 11-30)
  // Band 3: Advanced (Lv 31-60)
  // Band 4: Expert / Master (Lv 61-100+)
  const isRecovery = L > 5 && L % 5 === 1; // Every 5th level (+1) is a breather level
  const isMilestoneBoss = L % 10 === 0;

  let band = 'Early Onboarding';
  let rows = 8, cols = 6;
  let uniqueIcons = 10;
  let baseTimerSec = 150;
  let splitGroups = 0; // 1x2 / 2x2 multi-layer tiles
  let arrowPairs = 0;  // Directional open-side locks
  let gravityMode = 'none'; // 'none' | 'down' | 'left' | 'inward' | 'alternating'
  let blockerCells = 0; // Static rock/ice cells on board

  if (L <= 10) {
    band = 'Early Onboarding';
    rows = L <= 3 ? 6 : 8;
    cols = 6;
    uniqueIcons = Math.min(12, 6 + Math.floor(L * 0.6));
    baseTimerSec = 150 - (L - 1) * 2; // 150s -> 132s
    splitGroups = L < 3 ? 0 : L < 7 ? 1 : 2;
    arrowPairs = L < 8 ? 0 : 1;
    gravityMode = 'none';
    blockerCells = 0;
  } else if (L <= 30) {
    band = 'Intermediate';
    rows = 10;
    cols = 6;
    uniqueIcons = Math.min(14, 10 + Math.floor((L - 10) / 5));
    baseTimerSec = Math.max(105, 135 - Math.floor((L - 10) * 1.5));
    splitGroups = isRecovery ? 1 : 2 + Math.floor((L - 10) / 10);
    arrowPairs = isRecovery ? 1 : Math.min(4, 1 + Math.floor((L - 8) / 5));
    gravityMode = L < 16 ? 'none' : L % 2 === 0 ? 'down' : 'left';
    blockerCells = L >= 22 && !isRecovery ? 2 : 0;
  } else if (L <= 60) {
    band = 'Advanced';
    rows = 10;
    cols = 6;
    uniqueIcons = Math.min(16, 13 + Math.floor((L - 30) / 10));
    baseTimerSec = Math.max(85, 105 - Math.floor((L - 30) * 0.65));
    splitGroups = isRecovery ? 2 : 3 + (isMilestoneBoss ? 1 : 0);
    arrowPairs = isRecovery ? 2 : Math.min(6, 3 + Math.floor((L - 30) / 8));
    gravityMode = ['down', 'left', 'inward', 'alternating'][L % 4];
    blockerCells = isRecovery ? 0 : Math.min(4, 2 + Math.floor((L - 30) / 15) * 2);
  } else {
    band = 'Expert';
    rows = 10;
    cols = 6;
    uniqueIcons = 16;
    baseTimerSec = Math.max(75, 85 - Math.floor((L - 60) * 0.25));
    splitGroups = isRecovery ? 2 : 4;
    arrowPairs = isRecovery ? 3 : 6;
    gravityMode = ['inward', 'alternating', 'down', 'left'][L % 4];
    blockerCells = isRecovery ? 2 : 4;
  }

  if (isRecovery) {
    baseTimerSec += 15;
  } else if (isMilestoneBoss) {
    baseTimerSec = Math.max(75, baseTimerSec - 5);
  }

  const playableCells = rows * cols - blockerCells;
  const totalPairs = playableCells / 2 + splitGroups * 2; // Split groups add child pairs
  const star1Score = totalPairs * 100;
  const star2Score = Math.round(totalPairs * 135);
  const star3Score = Math.round(totalPairs * 175);

  // Expected win rate for normal skill player (before DDA)
  const rawDifficultyIndex = Math.min(
    0.95,
    0.12 +
      (L / 120) * 0.45 +
      splitGroups * 0.04 +
      arrowPairs * 0.025 +
      (gravityMode !== 'none' ? 0.05 : 0) +
      (isMilestoneBoss ? 0.08 : 0) -
      (isRecovery ? 0.12 : 0)
  );

  return {
    level: L,
    band,
    grid: `${rows}x${cols}`,
    rows,
    cols,
    uniqueIcons,
    baseTimerSec,
    splitGroups,
    arrowPairs,
    gravityMode,
    blockerCells,
    totalPairs,
    starThresholds: [star1Score, star2Score, star3Score],
    starTimeRemainingPct: [0, 25, 45], // Alternative/combined star criteria
    isRecovery,
    isMilestoneBoss,
    difficultyIndex: Number(rawDifficultyIndex.toFixed(3)),
    expectedWinRateNormal: Number((1 - rawDifficultyIndex * 0.55).toFixed(3)),
    expectedDurationSec: Math.round(baseTimerSec * (0.48 + rawDifficultyIndex * 0.24)),
  };
}

export function getMatch3LevelSpec(level) {
  const L = Math.max(1, Math.floor(level));
  const isRecovery = L > 5 && L % 5 === 1;
  const isMilestoneBoss = L % 10 === 0;

  let band = 'Early Onboarding';
  let rows = 7, cols = 7;
  let colors = 4;
  let moveLimit = 28;
  let objectiveType = 'score'; // 'score' | 'collect_tiles' | 'clear_ice' | 'break_crates' | 'drop_gems' | 'hybrid'
  let blockerBudget = 0;

  const objectiveCycle = ['score', 'collect_tiles', 'clear_ice', 'break_crates', 'drop_gems', 'hybrid'];

  if (L <= 10) {
    band = 'Early Onboarding';
    rows = L <= 4 ? 7 : 8;
    cols = L <= 4 ? 7 : 8;
    colors = 4; // High cascade frequency during onboarding
    moveLimit = 26 + (L <= 3 ? 4 : 0);
    objectiveType = L <= 2 ? 'score' : L <= 5 ? 'collect_tiles' : L <= 8 ? 'clear_ice' : 'break_crates';
    blockerBudget = L <= 5 ? 0 : 4 + (L - 5) * 2;
  } else if (L <= 30) {
    band = 'Intermediate';
    rows = 8;
    cols = 8;
    colors = 5;
    moveLimit = isRecovery ? 28 : Math.max(20, 26 - Math.floor((L - 10) / 5));
    objectiveType = objectiveCycle[(L - 1) % 5];
    blockerBudget = isRecovery ? 6 : 8 + Math.floor((L - 10) * 0.6);
  } else if (L <= 60) {
    band = 'Advanced';
    rows = 8;
    cols = 8;
    colors = L >= 45 && !isRecovery ? 6 : 5;
    moveLimit = isRecovery ? 25 : Math.max(17, 23 - Math.floor((L - 30) / 8));
    objectiveType = isMilestoneBoss ? 'hybrid' : objectiveCycle[(L - 1) % 6];
    blockerBudget = isRecovery ? 10 : Math.min(26, 14 + Math.floor((L - 30) * 0.4));
  } else {
    band = 'Expert';
    rows = 9;
    cols = 9;
    colors = isRecovery ? 5 : 6;
    moveLimit = isRecovery ? 24 : Math.max(15, 20 - Math.floor((L - 60) / 15));
    objectiveType = isMilestoneBoss ? 'hybrid' : objectiveCycle[L % 6];
    blockerBudget = isRecovery ? 12 : Math.min(32, 22 + Math.floor((L - 60) * 0.25));
  }

  const targetScore1Star = Math.round(moveLimit * (colors === 4 ? 180 : colors === 5 ? 160 : 145) * (1 + L * 0.015));
  const targetScore2Star = Math.round(targetScore1Star * 1.45);
  const targetScore3Star = Math.round(targetScore1Star * 1.95);

  const rawDifficultyIndex = Math.min(
    0.95,
    0.14 +
      (L / 120) * 0.44 +
      (colors - 4) * 0.08 +
      (blockerBudget / 40) * 0.15 +
      (isMilestoneBoss ? 0.09 : 0) -
      (isRecovery ? 0.13 : 0)
  );

  // Average ~4.2 seconds per deliberate move + cascade animations
  const avgMovesUsed = Math.round(moveLimit * (0.68 + rawDifficultyIndex * 0.22));
  const expectedDurationSec = Math.round(avgMovesUsed * 4.3);

  return {
    level: L,
    band,
    grid: `${rows}x${cols}`,
    rows,
    cols,
    colors,
    moveLimit,
    objectiveType,
    blockerBudget,
    starThresholds: [targetScore1Star, targetScore2Star, targetScore3Star],
    isRecovery,
    isMilestoneBoss,
    difficultyIndex: Number(rawDifficultyIndex.toFixed(3)),
    expectedWinRateNormal: Number((1 - rawDifficultyIndex * 0.56).toFixed(3)),
    expectedDurationSec,
  };
}

// ============================================================================
// 3. ROUND XP CALCULATOR (Mode-Parity Validated)
// ============================================================================

export function calculateOnetRoundXp({
  won,
  stars = 2,
  isFlawless = false,
  highestCombo = 6,
  remainingTimePct = 35,
  isFirstClear = true,
  score = 2400,
}) {
  const cfg = PROGRESSION_CONFIG.roundXp.onet;
  if (!won) {
    return Math.min(cfg.lossMaxXp, Math.floor(score / 80));
  }
  const raw =
    cfg.baseWinXp +
    (cfg.starBonusXp[stars] || 0) +
    (isFlawless ? cfg.flawlessBonusXp : 0) +
    Math.min(cfg.maxComboXp, highestCombo * cfg.comboXpPerChain) +
    (remainingTimePct >= 40 ? cfg.speedBonusXp : 0) +
    (isFirstClear ? cfg.firstTimeClearBonusXp : 0);
  return isFirstClear ? raw : Math.round(raw * cfg.replayMultiplier);
}

export function calculateMatch3RoundXp({
  won,
  stars = 2,
  maxCascade = 4,
  specialsTriggered = 3,
  isFirstClear = true,
  score = 3200,
}) {
  const cfg = PROGRESSION_CONFIG.roundXp.match3;
  if (!won) {
    return Math.min(cfg.lossMaxXp, Math.floor(score / 100));
  }
  const raw =
    cfg.baseWinXp +
    (cfg.starBonusXp[stars] || 0) +
    Math.min(cfg.maxCascadeXp, maxCascade * cfg.cascadeBonusXpPerChain) +
    Math.min(cfg.maxSpecialXp, specialsTriggered * cfg.specialTileActivationXp) +
    (isFirstClear ? cfg.firstTimeClearBonusXp : 0);
  return isFirstClear ? raw : Math.round(raw * cfg.replayMultiplier);
}

// ============================================================================
// 4. SIMULATE 30-DAY RETENTION & PROGRESSION ACROSS 6 PLAYER ARCHETYPES
// ============================================================================

const ARCHETYPES = [
  {
    id: 'casual_commuter',
    name: 'Casual Commuter (Mixed)',
    activeDaysIn30: 20,
    sessionsPerDay: 1.2,
    roundsPerSession: 4,
    onetShare: 0.5,
    skillFactor: 0.85,
    dailyMissionClaimRate: 0.65,
  },
  {
    id: 'average_regular',
    name: 'Average Regular (Mixed)',
    activeDaysIn30: 26,
    sessionsPerDay: 2.0,
    roundsPerSession: 5,
    onetShare: 0.5,
    skillFactor: 1.0,
    dailyMissionClaimRate: 0.85,
  },
  {
    id: 'onet_purist',
    name: 'Onet Purist (100% Onet)',
    activeDaysIn30: 26,
    sessionsPerDay: 2.0,
    roundsPerSession: 5.5, // Slightly more rounds to match exact session minutes (~7.2 min/session)
    onetShare: 1.0,
    skillFactor: 1.0,
    dailyMissionClaimRate: 0.85,
  },
  {
    id: 'match3_purist',
    name: 'Match 3 Purist (100% Match 3)',
    activeDaysIn30: 26,
    sessionsPerDay: 2.0,
    roundsPerSession: 4.5, // Slightly longer rounds (~95s), same total play time (~7.2 min/session)
    onetShare: 0.0,
    skillFactor: 1.0,
    dailyMissionClaimRate: 0.85,
  },
  {
    id: 'skilled_completionist',
    name: 'Skilled Completionist',
    activeDaysIn30: 29,
    sessionsPerDay: 2.5,
    roundsPerSession: 6,
    onetShare: 0.5,
    skillFactor: 1.2,
    dailyMissionClaimRate: 0.95,
  },
  {
    id: 'hardcore_enthusiast',
    name: 'Hardcore Enthusiast',
    activeDaysIn30: 30,
    sessionsPerDay: 3.5,
    roundsPerSession: 7,
    onetShare: 0.5,
    skillFactor: 1.25,
    dailyMissionClaimRate: 1.0,
  },
];

function simulateArchetype30Days(archetype) {
  let xp = 0;
  let onetLevel = 1;
  let match3Level = 1;
  let onetStars = 0;
  let match3Stars = 0;
  let totalRounds = 0;
  let totalWins = 0;
  let totalPlayTimeSec = 0;
  let loginStreak = 0;
  let ddaSkill = 50;
  let onetRetries = 0;
  let match3Retries = 0;

  const daySnapshots = {};
  const milestoneDays = {};

  for (let day = 1; day <= 30; day++) {
    // Deterministic active day schedule
    const isActive = ((day * 17) % 30) < archetype.activeDaysIn30;
    if (!isActive) {
      loginStreak = 0;
      if ([1, 7, 14, 30].includes(day)) {
        daySnapshots[day] = {
          level: PROGRESSION_CONFIG.xpCurve.levelFromXp(xp),
          xp,
          onetLevel,
          match3Level,
          onetStars,
          match3Stars,
          totalPlayTimeMin: Math.round(totalPlayTimeSec / 60),
        };
      }
      continue;
    }

    loginStreak++;
    // Daily login XP
    xp += PROGRESSION_CONFIG.retentionRewards.loginXpPerDay;
    if (loginStreak % 7 === 0) {
      xp += PROGRESSION_CONFIG.retentionRewards.loginStreakBonusXpDay7;
    }

    const roundsToday = Math.round(archetype.sessionsPerDay * archetype.roundsPerSession);
    for (let r = 0; r < roundsToday; r++) {
      totalRounds++;
      const playOnet = (r / roundsToday) < archetype.onetShare;

      if (playOnet) {
        const spec = getOnetLevelSpec(onetLevel);
        // Apply DDA & Pity boost
        const pityBoost = onetRetries >= 3 ? 0.35 : onetRetries === 2 ? 0.15 : onetRetries === 1 ? 0.08 : 0;
        const winProb = Math.min(0.98, spec.expectedWinRateNormal * archetype.skillFactor + pityBoost);
        // Deterministic pseudo-random check
        const roll = ((day * 31 + r * 19 + onetLevel * 7) % 100) / 100;
        const won = roll < winProb;
        totalPlayTimeSec += spec.expectedDurationSec;

        if (won) {
          totalWins++;
          const stars = roll < winProb * 0.45 ? 3 : roll < winProb * 0.8 ? 2 : 1;
          const isFlawless = stars === 3 && r % 2 === 0;
          const highestCombo = Math.min(20, Math.round(5 * archetype.skillFactor + (stars === 3 ? 4 : 1)));
          xp += calculateOnetRoundXp({
            won: true,
            stars,
            isFlawless,
            highestCombo,
            remainingTimePct: stars === 3 ? 48 : 30,
            isFirstClear: true,
          });
          onetStars += stars;
          onetLevel++;
          onetRetries = 0;
          ddaSkill = Math.min(100, Math.round(ddaSkill * 0.7 + (50 + stars * 10) * 0.3));
        } else {
          xp += calculateOnetRoundXp({ won: false, score: 1400 });
          onetRetries++;
          ddaSkill = Math.max(0, Math.round(ddaSkill * 0.7 + 15 * 0.3));
        }
      } else {
        const spec = getMatch3LevelSpec(match3Level);
        const pityBoost = match3Retries >= 3 ? 0.35 : match3Retries === 2 ? 0.15 : match3Retries === 1 ? 0.08 : 0;
        const winProb = Math.min(0.98, spec.expectedWinRateNormal * archetype.skillFactor + pityBoost);
        const roll = ((day * 29 + r * 23 + match3Level * 11) % 100) / 100;
        const won = roll < winProb;
        totalPlayTimeSec += spec.expectedDurationSec;

        if (won) {
          totalWins++;
          const stars = roll < winProb * 0.45 ? 3 : roll < winProb * 0.8 ? 2 : 1;
          const maxCascade = Math.min(10, Math.round(3 * archetype.skillFactor + stars));
          const specialsTriggered = Math.min(6, Math.round(2 * archetype.skillFactor + stars));
          xp += calculateMatch3RoundXp({
            won: true,
            stars,
            maxCascade,
            specialsTriggered,
            isFirstClear: true,
          });
          match3Stars += stars;
          match3Level++;
          match3Retries = 0;
          ddaSkill = Math.min(100, Math.round(ddaSkill * 0.7 + (50 + stars * 10) * 0.3));
        } else {
          xp += calculateMatch3RoundXp({ won: false, score: 1800 });
          match3Retries++;
          ddaSkill = Math.max(0, Math.round(ddaSkill * 0.7 + 15 * 0.3));
        }
      }
    }

    // Daily Missions XP (3 daily missions available regardless of mode preference!)
    const missionsCompleted = Math.round(3 * archetype.dailyMissionClaimRate);
    const missionXpTable = [30, 45, 65];
    for (let m = 0; m < missionsCompleted; m++) {
      xp += missionXpTable[m];
    }
    if (missionsCompleted === 3) {
      xp += PROGRESSION_CONFIG.retentionRewards.dailyAllCompleteBonusXp;
    }

    // Weekly Missions XP on multiples of 7
    if (day % 7 === 0) {
      const weeklyClaimed = Math.round(2 * archetype.dailyMissionClaimRate);
      xp += weeklyClaimed * 110;
    }

    const currentAccountLevel = PROGRESSION_CONFIG.xpCurve.levelFromXp(xp);
    for (const ms of PROGRESSION_CONFIG.milestones) {
      if (currentAccountLevel >= ms.target && !milestoneDays[ms.id]) {
        milestoneDays[ms.id] = day;
      }
    }

    if ([1, 7, 14, 30].includes(day)) {
      daySnapshots[day] = {
        level: currentAccountLevel,
        xp,
        onetLevel,
        match3Level,
        onetStars,
        match3Stars,
        totalPlayTimeMin: Math.round(totalPlayTimeSec / 60),
      };
    }
  }

  const finalLevel = PROGRESSION_CONFIG.xpCurve.levelFromXp(xp);
  const xpPerPlayMinute = totalPlayTimeSec > 0 ? (xp / (totalPlayTimeSec / 60)).toFixed(1) : '0';

  return {
    archetype: archetype.name,
    finalAccountLevel: finalLevel,
    totalXp: xp,
    totalRounds,
    winRatePct: ((totalWins / totalRounds) * 100).toFixed(1),
    totalPlayHours: (totalPlayTimeSec / 3600).toFixed(1),
    xpPerPlayMinute: Number(xpPerPlayMinute),
    onetHighestLevel: onetLevel,
    match3HighestLevel: match3Level,
    totalStars: onetStars + match3Stars,
    daySnapshots,
    milestoneDays,
  };
}

// ============================================================================
// 5. EXECUTE SIMULATION & PRINT REPORT
// ============================================================================

function main() {
  console.log('=== CONNECTIFY ANDROID: PROGRESSION & DIFFICULTY SIMULATION ===\n');

  // A. XP Curve Table
  console.log('--- 1. GLOBAL ACCOUNT XP CURVE & RANK MILESTONES ---');
  const sampleLevels = [1, 2, 3, 5, 7, 10, 15, 20, 25, 30, 35, 40, 50];
  const xpTable = sampleLevels.map((lvl) => {
    const cumXp = PROGRESSION_CONFIG.xpCurve.xpForLevel(lvl);
    const nextDelta = PROGRESSION_CONFIG.xpCurve.xpDeltaForNextLevel(lvl);
    const rank = [...PROGRESSION_CONFIG.ranks].reverse().find((r) => lvl >= r.level);
    const estWinsNeeded = Math.ceil(cumXp / 165); // ~165 avg XP per win + mission share
    return {
      Level: lvl,
      CumulativeXP: cumXp,
      NextLevelDeltaXP: nextDelta,
      RankTitle: `${rank.titleId} (${rank.titleEn})`,
      ApproxWinsToReach: estWinsNeeded,
    };
  });
  console.table(xpTable);

  // B. Mode XP Parity Check (Onet vs Match 3 per 60 minutes of active play)
  console.log('\n--- 2. ONET VS. MATCH 3 XP PARITY (PER 60 MINUTES OF ACTIVE PLAY) ---');
  const avgOnetWinXp = calculateOnetRoundXp({
    won: true,
    stars: 2,
    isFlawless: false,
    highestCombo: 7,
    remainingTimePct: 38,
    isFirstClear: true,
  });
  const avgMatch3WinXp = calculateMatch3RoundXp({
    won: true,
    stars: 2,
    maxCascade: 4,
    specialsTriggered: 3,
    isFirstClear: true,
  });
  const avgOnetDurationSec = 78;
  const avgMatch3DurationSec = 95;
  const onetRoundsPerHour = 3600 / avgOnetDurationSec;
  const match3RoundsPerHour = 3600 / avgMatch3DurationSec;
  // Assume 82% win rate with DDA
  const onetXpPerHour = Math.round(onetRoundsPerHour * (0.82 * avgOnetWinXp + 0.18 * 20));
  const match3XpPerHour = Math.round(match3RoundsPerHour * (0.82 * avgMatch3WinXp + 0.18 * 24));
  const parityRatio = (onetXpPerHour / match3XpPerHour).toFixed(3);

  console.table([
    {
      Mode: 'Onet Connect',
      AvgRoundSec: avgOnetDurationSec,
      RoundsPerHour: Number(onetRoundsPerHour.toFixed(1)),
      AvgWinXP: avgOnetWinXp,
      HourlyGameplayXP: onetXpPerHour,
      XPPerMinute: Number((onetXpPerHour / 60).toFixed(1)),
    },
    {
      Mode: 'Match 3 Puzzle',
      AvgRoundSec: avgMatch3DurationSec,
      RoundsPerHour: Number(match3RoundsPerHour.toFixed(1)),
      AvgWinXP: avgMatch3WinXp,
      HourlyGameplayXP: match3XpPerHour,
      XPPerMinute: Number((match3XpPerHour / 60).toFixed(1)),
    },
  ]);
  console.log(`Parity Ratio (Onet / Match 3 Hourly XP): ${parityRatio} (Target: 0.95 - 1.05)\n`);

  // C. 30-Day Archetype Progression Simulation
  console.log('--- 3. 30-DAY ARCHETYPE PROGRESSION SIMULATION ---');
  const simResults = ARCHETYPES.map(simulateArchetype30Days);
  console.table(
    simResults.map((r) => ({
      Archetype: r.archetype,
      Day1Lv: r.daySnapshots[1]?.level || 1,
      Day7Lv: r.daySnapshots[7]?.level || 1,
      Day14Lv: r.daySnapshots[14]?.level || 1,
      Day30Lv: r.finalAccountLevel,
      TotalXP: r.totalXp,
      PlayHours: r.totalPlayHours,
      XPPerMin: r.xpPerPlayMinute,
      OnetLv: r.onetHighestLevel,
      Match3Lv: r.match3HighestLevel,
      TotalStars: r.totalStars,
      WinRate: `${r.winRatePct}%`,
    }))
  );

  console.log('\n--- 4. MILESTONE UNLOCK TIMING (DAY UNLOCKED IN 30-DAY WINDOW) ---');
  console.table(
    simResults.map((r) => ({
      Archetype: r.archetype,
      Lv3_Sakura: r.milestoneDays.ms_lv3 ? `Day ${r.milestoneDays.ms_lv3}` : '>30d',
      Lv5_Bakery: r.milestoneDays.ms_lv5 ? `Day ${r.milestoneDays.ms_lv5}` : '>30d',
      Lv10_ComboRank: r.milestoneDays.ms_lv10 ? `Day ${r.milestoneDays.ms_lv10}` : '>30d',
      Lv15_Tactician: r.milestoneDays.ms_lv15 ? `Day ${r.milestoneDays.ms_lv15}` : '>30d',
      Lv20_ClubStar: r.milestoneDays.ms_lv20 ? `Day ${r.milestoneDays.ms_lv20}` : '>30d',
      Lv35_Master: r.milestoneDays.ms_lv35 ? `Day ${r.milestoneDays.ms_lv35}` : '>30d',
    }))
  );

  // D. Level Difficulty Curve Samples (Onet & Match 3 Levels 1-100)
  console.log('\n--- 5. ONET LEVEL DIFFICULTY CURVE SAMPLE (LEVELS 1 - 100) ---');
  const sampleDifficultyLevels = [1, 3, 5, 8, 10, 11, 15, 20, 25, 30, 31, 40, 50, 60, 75, 100];
  console.table(
    sampleDifficultyLevels.map((l) => {
      const s = getOnetLevelSpec(l);
      return {
        Lv: s.level,
        Band: s.band,
        Grid: s.grid,
        Icons: s.uniqueIcons,
        Timer: `${s.baseTimerSec}s`,
        Splits: s.splitGroups,
        Arrows: s.arrowPairs,
        Gravity: s.gravityMode,
        Blockers: s.blockerCells,
        DiffIdx: s.difficultyIndex,
        BaseWinRate: `${(s.expectedWinRateNormal * 100).toFixed(0)}%`,
        Note: s.isRecovery ? 'Breather' : s.isMilestoneBoss ? 'Boss' : 'Standard',
      };
    })
  );

  console.log('\n--- 6. MATCH 3 LEVEL DIFFICULTY CURVE SAMPLE (LEVELS 1 - 100) ---');
  console.table(
    sampleDifficultyLevels.map((l) => {
      const s = getMatch3LevelSpec(l);
      return {
        Lv: s.level,
        Band: s.band,
        Grid: s.grid,
        Colors: s.colors,
        Moves: s.moveLimit,
        Objective: s.objectiveType,
        Blockers: s.blockerBudget,
        Star1_2_3: s.starThresholds.join('/'),
        DiffIdx: s.difficultyIndex,
        BaseWinRate: `${(s.expectedWinRateNormal * 100).toFixed(0)}%`,
        Note: s.isRecovery ? 'Breather' : s.isMilestoneBoss ? 'Boss' : 'Standard',
      };
    })
  );
}

main();
