/**
 * Economy & Shop Domain Types for Connectify Android (Onet & Match 3).
 * Owned by: @economy-designer
 * Aligns with src/types/game.types.ts (@architect) and src/types/persistence.types.ts (@data-eng).
 */

import type { GameId, StarRating } from './game.types';
import type { BoosterId, TransactionSourceType } from './persistence.types';

export type CurrencyId = 'permen';

export type ItemRarity =
  | 'starter'
  | 'milestone'
  | 'common'
  | 'rare'
  | 'epic'
  | 'legendary';

export type ShopCategory =
  | 'theme'
  | 'tilepack'
  | 'surface'
  | 'avatar'
  | 'frame'
  | 'effect'
  | 'animation'
  | 'compass'
  | 'booster';

export type ShopGameScope = 'both' | 'onet' | 'match3' | 'profile';

export type CosmeticSlotKey =
  | 'tile1'
  | 'tile2'
  | 'tile4'
  | 'arrow'
  | 'block'
  | 'effect'
  | 'onetAnimation'
  | 'match3Animation'
  | 'frame'
  | 'avatar';

export interface CatalogItemDefinition {
  id: string;
  name: string;
  description: string;
  category: Exclude<ShopCategory, 'booster'>;
  slot?: CosmeticSlotKey;
  rarity: ItemRarity;
  /** Price in Connect Coins (0 for free starter, null for non-purchasable milestone rewards) */
  price: number | null;
  gameScope: ShopGameScope;
  assetPath: string;
  /** For theme_* items, maps to the themeId stored in inventory.unlockedThemes */
  themeId?: string;
  /** For tilepack_* items, lists individual cosmetic member IDs unlocked together */
  members?: readonly string[];
  isFreeStarter?: boolean;
  isMilestoneReward?: boolean;
  rewardHint?: string;
}

export interface BoosterCatalogDefinition {
  id: BoosterId;
  name: string;
  description: string;
  gameScope: Extract<ShopGameScope, 'both' | 'onet' | 'match3'>;
  singlePrice: number;
  bundle3Price: number;
  freeStarterCount: number;
  maxStock: number;
  assetPath: string;
}

export interface LevelCoinCalculationInput {
  game: GameId;
  level: number;
  isWinner: boolean;
  isFlawless: boolean;
  stars: StarRating;
  /** Highest star rating already earned on this level prior to this run (0 if never cleared) */
  previousBestStars: StarRating;
  highestUnlockedLevel: number;
  timeElapsedMs: number;
  remainingTimeSec?: number;
  movesRemaining?: number;
  highestCombo: number;
  cascadesTriggered?: number;
  specialCombosTriggered?: number;
  /** Number of times this exact (game, level) was already cleared earlier today (0 = first clear today) */
  sameDayClearCount: number;
  /** Consecutive failures on this level prior to this attempt */
  consecutiveFailuresBeforeAttempt: number;
  /** Gameplay coins already earned today from repeatable level clears */
  dailyGameplayCoinsEarned: number;
  isDailyChallenge: boolean;
}

export interface LevelCoinCalculationResult {
  coinsEarned: number;
  rawCoins: number;
  baseWinCoins: number;
  firstClearCoins: number;
  starUpgradeCoins: number;
  performanceCoins: number;
  pityCoins: number;
  replayMultiplier: number;
  dailyCapMultiplier: number;
  isFirstClear: boolean;
  isDailyChallengeBonus: boolean;
  isSoftCapped: boolean;
  isHardCapped: boolean;
}

export interface GameplayCapStatus {
  earnedToday: number;
  softCap: number;
  hardCap: number;
  remainingAtFullRate: number;
  remainingBeforeHardCap: number;
  currentMultiplier: number;
  tier: 'full' | 'soft_capped' | 'hard_capped';
}

export interface PurchaseQuote {
  itemId: string;
  itemName: string;
  category: ShopCategory;
  quantity: 1 | 3;
  unitPrice: number;
  totalPrice: number;
  isBundle: boolean;
  isConsumable: boolean;
  alreadyOwned: boolean;
  isPurchasable: boolean;
  canAfford: boolean;
  currentBalance: number;
  balanceAfter: number;
  error?:
    | 'ITEM_NOT_FOUND'
    | 'NOT_PURCHASABLE_MILESTONE'
    | 'ALREADY_OWNED'
    | 'STOCK_LIMIT_REACHED'
    | 'INSUFFICIENT_FUNDS';
}

export interface EconomyTransactionOutcome {
  success: boolean;
  idempotent: boolean;
  coinsDelta: number;
  newBalance: number;
  source?: TransactionSourceType;
  itemId?: string;
  quantityAdded?: number;
  error?: string;
}
