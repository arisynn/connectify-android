/**
 * Core Persistence & Authoritative Local Save Schema Types (Schema v1)
 * Owned by: @data-eng
 */

import type {
  BoosterId as SharedBoosterId,
  GameId,
  GameModeProgressionState,
  LevelMasteryRecord,
} from './game.types';

export const CURRENT_SCHEMA_VERSION = 1 as const;
export const SAVE_MAGIC = 'CONNECTIFY_SAVE' as const;

export type GameModeId = GameId;

export type BoosterId = SharedBoosterId | 'extra_moves' | 'color_burst';

export type Match3SpecialType = 'none' | 'striped_h' | 'striped_v' | 'wrapped' | 'color_bomb';
export type Match3BlockerType = 'none' | 'ice_1' | 'ice_2' | 'wood' | 'stone' | 'honey';

export type { GameModeProgressionState, LevelMasteryRecord };

export interface SaveEnvelopeV1<T = ConnectifySaveDataV1> {
  magic: typeof SAVE_MAGIC;
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  revision: number;
  updatedAt: number;
  checksum: string;
  data: T;
}

export interface SharedPlayerProfileState {
  playerId: string;
  playerName: string;
  avatarId: string;
  avatarBackground: string;
  frameId: string | null;

  xp: number;
  level: number;
  rankTitle: string;

  /** Authoritative Connect Coins (Permen) balance. Invariant: integer >= 0 */
  coins: number;
  lifetimeCoinsEarned: number;
  lifetimeCoinsSpent: number;

  currentWinStreak: number;
  bestWinStreak: number;

  loginStreak: {
    lastClaimedDate: string | null;
    lastCheckInDate: string | null;
    currentStreak: number;
    bestStreak: number;
    totalLoginDays: number;
  };

  dailyEconomy: {
    dateKey: string;
    coinsEarnedToday: number;
    levelCompletionCountsToday: Record<string, number>;
  };

  createdAt: number;
  lastActiveAt: number;
}

export interface BaseActiveSessionState {
  runId: string;
  gameId: GameModeId;
  level: number;
  isDailyChallenge: boolean;
  dailyChallengeDateKey: string | null;
  themeId: string;
  score: number;
  combo: number;
  highestCombo: number;
  elapsedMs: number;
  mistakes: number;
  boostersUsed: Record<string, number>;
  rngState: number;
  startedAt: number;
  savedAt: number;
}

export interface OnetTileCellSnapshot {
  id: string;
  icon: string;
  footprint: '1x1' | '1x2' | '2x1' | '2x2';
  isSlave?: boolean;
  masterR?: number;
  masterC?: number;
  shiftDirection?: 'up' | 'down' | 'left' | 'right' | 'none';
  obstacleType?: 'none' | 'ice' | 'locked';
}

export interface ActiveOnetSessionState extends BaseActiveSessionState {
  gameId: 'onet';
  remainingTimeSec: number;
  totalTimeSec: number;
  board: (OnetTileCellSnapshot | null)[][];
  matchesCompleted: number;
  splitsCompleted: number;
  selectedCoord: { r: number; c: number } | null;
}

export interface Match3CellSnapshot {
  tileId: string | null;
  special: Match3SpecialType;
  blocker: Match3BlockerType;
  isHole?: boolean;
}

export interface Match3ObjectiveProgress {
  type: 'score' | 'collect_tile' | 'clear_blocker' | 'use_special';
  targetId?: string;
  current: number;
  target: number;
}

export interface ActiveMatch3SessionState extends BaseActiveSessionState {
  gameId: 'match3';
  movesRemaining: number;
  totalMoves: number;
  board: Match3CellSnapshot[][];
  objectives: Match3ObjectiveProgress[];
  starThresholds: [number, number, number];
  cascadesTriggered: number;
}

export type ActiveGameSession = ActiveOnetSessionState | ActiveMatch3SessionState;

export interface EquippedThemeConfig {
  globalThemeId: string;
  onetThemeOverride: string | null;
  match3ThemeOverride: string | null;
}

export interface EquippedCosmeticSlots {
  tile1: string;
  tile2: string;
  tile4: string;
  arrow: string;
  block: string;
  effect: string;
  onetAnimation: string | null;
  match3Animation: string | null;
  frame: string | null;
}

export interface PlayerInventoryAndThemesState {
  unlockedThemes: string[];
  unseenThemes: string[];
  equippedThemes: EquippedThemeConfig;
  ownedCosmetics: string[];
  equippedCosmetics: EquippedCosmeticSlots;
  unlockedAvatars: string[];
  boosters: Record<BoosterId, number>;
}

export interface PlayerAchievementsState {
  claimedTiers: Record<string, number>;
  claimHistory: Record<string, number>;
}

export interface MissionProgressRecord {
  id: string;
  game: GameModeId | 'hub';
  type: string;
  title: string;
  desc: string;
  difficulty: 'Mudah' | 'Menengah' | 'Sulit' | 'Sangat Sulit';
  target: number;
  progress: number;
  rewardCoins: number;
  rewardXp: number;
  claimed: boolean;
  claimedAt?: number;
}

export interface DailyChallengesAndMissionsState {
  dailyDateKey: string;
  weeklyPeriodKey: string;
  dailyMissions: MissionProgressRecord[];
  dailyAllCompletedBonusClaimed: boolean;
  weeklyMissions: MissionProgressRecord[];
  unclaimedArchive: (MissionProgressRecord & { savedFromPeriod: string; scope: 'daily' | 'weekly' })[];
  dailyPuzzle: {
    dateKey: string;
    onetCompleted: boolean;
    onetScore: number;
    match3Completed: boolean;
    match3Score: number;
  };
}

export interface PlayerSettingsState {
  audio: {
    muteMusic: boolean;
    muteSfx: boolean;
    musicVolume: number;
    sfxVolume: number;
  };
  haptics: {
    enabled: boolean;
    intensity: 'light' | 'medium' | 'strong';
  };
  display: {
    darkMode: boolean;
    reducedMotion: boolean;
    highContrastTiles: boolean;
    showTimerWarning: boolean;
    showHintPromptAfterIdleSec: number;
  };
  locale: 'id-ID' | 'en-US';
}

export interface GlobalAndPerGameStatistics {
  totalGamesPlayed: number;
  totalWins: number;
  totalLosses: number;
  totalScore: number;
  highestSingleScore: number;
  highestCombo: number;
  totalPlayTimeMs: number;
  totalFlawlessWins: number;
  totalDailyMissionsCompleted: number;
  totalWeeklyMissionsCompleted: number;
  totalDailyChallengesWon: number;
  totalThemesUnlocked: number;
  totalBoostersUsed: number;
  onet: {
    gamesPlayed: number;
    wins: number;
    highScore: number;
    bestCombo: number;
    totalPairsMatched: number;
    totalSplits: number;
    totalPlayTimeMs: number;
    speedrunWinsUnder45s: number;
    survivorWinsOver50PctTime: number;
    nearDeathWinsUnder1s: number;
    hintsUsed: number;
    shufflesUsed: number;
  };
  match3: {
    gamesPlayed: number;
    wins: number;
    highScore: number;
    bestCombo: number;
    totalTilesCleared: number;
    totalCascades: number;
    specialTilesCreated: number;
    specialCombosTriggered: number;
    blockersCleared: number;
    totalPlayTimeMs: number;
    boostersUsed: number;
  };
}

export type TransactionSourceType =
  | 'LEVEL_WIN_REWARD'
  | 'DAILY_CHALLENGE_REWARD'
  | 'CLAIM_DAILY_MISSION'
  | 'CLAIM_WEEKLY_MISSION'
  | 'CLAIM_DAILY_BONUS'
  | 'CLAIM_ACHIEVEMENT'
  | 'CLAIM_LOGIN_REWARD'
  | 'PURCHASE_THEME'
  | 'PURCHASE_COSMETIC'
  | 'PURCHASE_BOOSTER'
  | 'LEVEL_UP_MILESTONE'
  | 'STARTER_GRANT';

export interface WalletTransactionEntry {
  id: string;
  idempotencyKey: string;
  amount: number;
  balanceAfter: number;
  source: TransactionSourceType;
  label: string;
  timestampIso: string;
  timestampMs: number;
}

export interface TransactionLedgerState {
  processedKeys: string[];
  ledger: WalletTransactionEntry[];
}

export interface ConnectifySaveDataV1 {
  profile: SharedPlayerProfileState;
  progression: {
    onet: GameModeProgressionState;
    match3: GameModeProgressionState;
  };
  activeSession: {
    onet: ActiveOnetSessionState | null;
    match3: ActiveMatch3SessionState | null;
    lastPlayedGame: GameModeId;
  };
  inventory: PlayerInventoryAndThemesState;
  achievements: PlayerAchievementsState;
  dailyChallenges: DailyChallengesAndMissionsState;
  settings: PlayerSettingsState;
  statistics: GlobalAndPerGameStatistics;
  transactionLog: TransactionLedgerState;
}

export interface PersistenceNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'achievement' | 'mission' | 'reward';
  timestamp: number;
  read: boolean;
}

export interface MutationResult<T = ConnectifySaveDataV1> {
  success: boolean;
  idempotent: boolean;
  error?: string;
  revision: number;
  data: T;
}

export interface PersistenceBootReport {
  source: 'primary' | 'wal_recovery' | 'backup_recovery' | 'indexeddb_recovery' | 'legacy_migration' | 'fresh_install';
  recoveredFromCorruption: boolean;
  revision: number;
}
