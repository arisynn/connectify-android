/**
 * Shared domain types for Connectify Android (Onet & Match 3).
 * Owned by @architect. Lower-layer contract consumed by engines, services, and UI.
 */

export type GameId = 'onet' | 'match3';

export type GameMode = 'normal' | 'daily';

export type StarRating = 0 | 1 | 2 | 3;

export type ThemeId = string;

export type BoosterId = 'hint' | 'shuffle' | 'hammer' | 'bomb' | 'extra_time';

export type OnetBoosterId = Extract<BoosterId, 'hint' | 'shuffle' | 'extra_time'>;
export type Match3BoosterId = Extract<BoosterId, 'hint' | 'shuffle' | 'hammer' | 'bomb'>;

export interface GridCoord {
  r: number;
  c: number;
}

export type DifficultyBand = 'onboarding' | 'intermediate' | 'advanced' | 'expert';

export type DdaBracket = 'pity' | 'easy' | 'normal' | 'hard';

export type ScreenId =
  | 'boot'
  | 'startup'
  | 'home'
  | 'level-select'
  | 'play-onet'
  | 'play-match3'
  | 'shop'
  | 'collection'
  | 'profile'
  | 'ledger';

export type ModalId =
  | 'pause'
  | 'result'
  | 'settings'
  | 'theme-preview'
  | 'daily-challenges'
  | 'quick-theme'
  | 'edit-avatar'
  | 'exit-confirm'
  | null;

export interface LevelMasteryRecord {
  level: number;
  completed: boolean;
  stars: StarRating;
  highScore: number;
  bestTimeMs: number | null;
  bestMovesRemaining: number | null;
  attempts: number;
  wins: number;
  consecutiveFailures: number;
  firstClearedAt: number | null;
  lastClearedAt: number | null;
}

export interface GameModeProgressionState {
  gameId: GameId;
  currentLevel: number;
  highestUnlockedLevel: number;
  totalStars: number;
  allTimeHighScore: number;
  skillRating: number;
  levels: Record<number, LevelMasteryRecord>;
}

export interface GameResultPayload {
  game: GameId;
  runId: string;
  level: number;
  isWinner: boolean;
  isFlawless: boolean;
  stars: StarRating;
  score: number;
  timeElapsedMs: number;
  remainingTimeSec?: number;
  totalTimeSec?: number;
  movesUsed?: number;
  movesRemaining?: number;
  matches: number;
  splits?: number;
  tilesCleared?: number;
  specialsCreated?: number;
  obstaclesDestroyed?: number;
  highestCombo: number;
  mistakes: number;
  boostersUsed: Partial<Record<BoosterId, number>>;
  isDailyChallenge: boolean;
  dailyDateKey: string | null;
}

export interface RewardBreakdown {
  coinsEarned: number;
  xpEarned: number;
  starsEarned: StarRating;
  isNewBestScore: boolean;
  isFirstClear: boolean;
  diminishingFactor: number;
  previousAccountLevel: number;
  newAccountLevel: number;
  leveledUp: boolean;
  newHighestUnlockedLevel: number;
  completedMissionIds: string[];
  unlockedAchievementIds: string[];
}

export interface DailyChallengeConfig {
  dateKey: string;
  gameId: GameId;
  seed: string;
  levelEquivalent: number;
  timeLimitSec?: number;
  moveLimit?: number;
  bonusCoins: number;
  bonusXp: number;
}

export type OnetSfxKey =
  | 'click'
  | 'select'
  | 'match'
  | 'split'
  | 'wrong'
  | 'hint'
  | 'shuffle'
  | 'win'
  | 'lose';

export type Match3SfxKey =
  | 'click'
  | 'select'
  | 'swap'
  | 'wrong'
  | 'match'
  | 'combo'
  | 'special_create'
  | 'line_blast'
  | 'bomb_blast'
  | 'rainbow_blast'
  | 'ice_break'
  | 'shuffle'
  | 'hint'
  | 'win'
  | 'lose';

export type SfxKey =
  | OnetSfxKey
  | Match3SfxKey
  | 'place'
  | 'clear'
  | 'purchase'
  | 'uiReward'
  | 'error'
  | 'cascade_2'
  | 'cascade_3'
  | 'cascade_4plus';

export type BgmScene = 'menu' | 'game' | 'off';

export type HapticPatternKey =
  | 'tileSelect'
  | 'matchClear'
  | 'comboOrSpecial'
  | 'invalidMove'
  | 'levelVictory'
  | 'uiTap';
