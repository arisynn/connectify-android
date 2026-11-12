/**
 * Atomic, Offline-First Virtual Economy Engine for Connectify Android.
 * Owned by: @economy-designer
 *
 * Guarantees:
 * - Zero-negative-balance invariant (`coins >= 0` enforced prior to state mutation)
 * - Idempotent `opId`/`runId` transaction deduplication via LocalPersistenceEngine
 * - Anti-farming diminishing returns & soft/hard daily gameplay caps
 * - Relative earning parity between Onet and Match 3
 */

import { ECONOMY_CONFIG } from '@/config/economy.config';
import type {
  EconomyTransactionOutcome,
  GameplayCapStatus,
  LevelCoinCalculationInput,
  LevelCoinCalculationResult,
} from '@/types/economy.types';
import type { GameId } from '@/types/game.types';
import type { ConnectifySaveDataV1, TransactionSourceType } from '@/types/persistence.types';
import type { LocalPersistenceEngine, TransactionRequest } from '@/services/persistence/LocalPersistenceEngine';
import { ShopCatalogService } from './ShopCatalogService';

export const EconomyEngine = {
  /**
   * Canonical key for tracking same-day clears per (game, level) in `dailyEconomy.levelCompletionCountsToday`.
   */
  getLevelCompletionKey(game: GameId, level: number): string {
    return `${game}:${Math.max(1, Math.floor(level))}`;
  },

  /**
   * Returns current status of today's repeatable gameplay cap (does not block missions/login/achievements).
   */
  getGameplayCapStatus(dailyGameplayCoinsEarned: number): GameplayCapStatus {
    const earned = Math.max(0, Math.floor(dailyGameplayCoinsEarned));
    const { softCap, softCapMultiplier, hardCap } = ECONOMY_CONFIG.dailyGameplayCaps;

    if (earned < softCap) {
      return {
        earnedToday: earned,
        softCap,
        hardCap,
        remainingAtFullRate: softCap - earned,
        remainingBeforeHardCap: hardCap - earned,
        currentMultiplier: 1.0,
        tier: 'full',
      };
    }

    if (earned < hardCap) {
      return {
        earnedToday: earned,
        softCap,
        hardCap,
        remainingAtFullRate: 0,
        remainingBeforeHardCap: hardCap - earned,
        currentMultiplier: softCapMultiplier,
        tier: 'soft_capped',
      };
    }

    return {
      earnedToday: earned,
      softCap,
      hardCap,
      remainingAtFullRate: 0,
      remainingBeforeHardCap: 0,
      currentMultiplier: 0,
      tier: 'hard_capped',
    };
  },

  /**
   * Pure deterministic calculation of Connect Coins earned from a single Onet or Match 3 level attempt.
   * Implements:
   * - Direct fresh clear & star-delta rewards
   * - Onet vs Match 3 duration parity
   * - Same-day replay decay + low-level farming guard
   * - Anti-frustration pity coin on 3rd consecutive loss
   * - Daily soft/hard gameplay caps
   */
  calculateLevelCoins(input: LevelCoinCalculationInput): LevelCoinCalculationResult {
    const isOnet = input.game === 'onet';
    const cfg = isOnet ? ECONOMY_CONFIG.levelRewards.onet : ECONOMY_CONFIG.levelRewards.match3;

    // Daily Challenge uses fixed bonus payout on win and is exempt from replay decay/gameplay cap
    if (input.isDailyChallenge) {
      const bonus = input.isWinner ? ECONOMY_CONFIG.dailyChallenge.rewardCoins : 0;
      return {
        coinsEarned: bonus,
        rawCoins: bonus,
        baseWinCoins: 0,
        firstClearCoins: 0,
        starUpgradeCoins: 0,
        performanceCoins: 0,
        pityCoins: 0,
        replayMultiplier: 1,
        dailyCapMultiplier: 1,
        isFirstClear: false,
        isDailyChallengeBonus: input.isWinner,
        isSoftCapped: false,
        isHardCapped: false,
      };
    }

    const capStatus = this.getGameplayCapStatus(input.dailyGameplayCoinsEarned);

    // Handle defeat: grant +1 anti-frustration pity coin every Nth consecutive loss (if under hard cap)
    if (!input.isWinner) {
      const nextFailCount = Math.max(0, input.consecutiveFailuresBeforeAttempt) + 1;
      const grantPity =
        nextFailCount > 0 &&
        nextFailCount % cfg.pityFailThreshold === 0 &&
        capStatus.tier !== 'hard_capped';
      const pityCoins = grantPity ? cfg.pityCoin : 0;

      return {
        coinsEarned: pityCoins,
        rawCoins: pityCoins,
        baseWinCoins: 0,
        firstClearCoins: 0,
        starUpgradeCoins: 0,
        performanceCoins: 0,
        pityCoins,
        replayMultiplier: 1,
        dailyCapMultiplier: 1,
        isFirstClear: false,
        isDailyChallengeBonus: false,
        isSoftCapped: capStatus.tier === 'soft_capped',
        isHardCapped: capStatus.tier === 'hard_capped',
      };
    }

    // Handle victory
    const isFirstClear = input.previousBestStars === 0;
    const prevStarBonus =
      input.previousBestStars > 0 ? cfg.starBonuses[input.previousBestStars - 1] ?? 0 : 0;
    const newStarBonus = input.stars > 0 ? cfg.starBonuses[input.stars - 1] ?? 0 : 0;
    const starUpgradeCoins = Math.max(0, newStarBonus - prevStarBonus);

    // Performance & super-performance criteria
    let performanceCoins = 0;
    if (isOnet) {
      const onetCfg = ECONOMY_CONFIG.levelRewards.onet;
      const metPerf =
        input.isFlawless ||
        (input.timeElapsedMs > 0 && input.timeElapsedMs < onetCfg.speedrunThresholdMs) ||
        input.highestCombo >= onetCfg.comboThreshold;
      if (metPerf) performanceCoins += onetCfg.perfBonus;
    } else {
      const m3Cfg = ECONOMY_CONFIG.levelRewards.match3;
      const cascades = input.cascadesTriggered ?? 0;
      const movesLeft = input.movesRemaining ?? 0;
      const metPerf =
        cascades >= m3Cfg.cascadeThreshold || movesLeft >= m3Cfg.movesLeftThreshold;
      if (metPerf) {
        performanceCoins += m3Cfg.perfBonus;
        if (
          cascades >= m3Cfg.superCascadeThreshold &&
          (input.specialCombosTriggered ?? 0) > 0
        ) {
          performanceCoins += m3Cfg.superPerfBonus;
        }
      }
    }

    let rawCoins = 0;
    let baseWinCoins = 0;
    let firstClearCoins = 0;
    let replayMultiplier = 1.0;

    if (isFirstClear) {
      baseWinCoins = cfg.baseWin;
      firstClearCoins = cfg.firstClearBonus;
      rawCoins = baseWinCoins + firstClearCoins + starUpgradeCoins + performanceCoins;
    } else {
      // Replaying an already-completed level: apply same-day diminishing returns
      const decayArr = ECONOMY_CONFIG.replayDecay.sameDayMultipliers;
      const idx = Math.min(Math.max(1, input.sameDayClearCount), decayArr.length - 1);
      replayMultiplier = decayArr[idx];

      // Trivial low-level farming guard (already 3★ and >10 levels below frontier)
      if (
        input.previousBestStars >= 3 &&
        input.level < input.highestUnlockedLevel - ECONOMY_CONFIG.replayDecay.lowLevelGapThreshold
      ) {
        replayMultiplier = Math.min(
          replayMultiplier,
          ECONOMY_CONFIG.replayDecay.lowLevelGapMultiplier,
        );
      }

      baseWinCoins = Math.floor((cfg.baseWin + performanceCoins) * replayMultiplier);
      rawCoins = baseWinCoins + starUpgradeCoins;
      performanceCoins = 0; // folded into decayed baseWinCoins
    }

    // Apply Daily Gameplay Soft-Cap / Hard-Cap
    let coinsEarned = 0;
    let dailyCapMultiplier = 1.0;

    if (capStatus.tier === 'full') {
      coinsEarned = rawCoins;
      dailyCapMultiplier = 1.0;
    } else if (capStatus.tier === 'soft_capped') {
      dailyCapMultiplier = ECONOMY_CONFIG.dailyGameplayCaps.softCapMultiplier;
      coinsEarned = rawCoins > 0 ? Math.max(1, Math.round(rawCoins * dailyCapMultiplier)) : 0;
    } else {
      dailyCapMultiplier = 0;
      coinsEarned = isFirstClear
        ? ECONOMY_CONFIG.dailyGameplayCaps.postHardCapNewClearCoin
        : 0;
    }

    return {
      coinsEarned: Math.max(0, Math.floor(coinsEarned)),
      rawCoins,
      baseWinCoins,
      firstClearCoins,
      starUpgradeCoins,
      performanceCoins,
      pityCoins: 0,
      replayMultiplier,
      dailyCapMultiplier,
      isFirstClear,
      isDailyChallengeBonus: false,
      isSoftCapped: capStatus.tier === 'soft_capped',
      isHardCapped: capStatus.tier === 'hard_capped',
    };
  },

  /**
   * Validates that a coin spend amount is a safe positive integer and will not produce a negative balance.
   */
  validateSpend(
    currentBalance: number,
    amount: number,
  ): { ok: true } | { ok: false; error: 'INVALID_AMOUNT' | 'INSUFFICIENT_FUNDS' } {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      return { ok: false, error: 'INVALID_AMOUNT' };
    }
    if (!Number.isSafeInteger(currentBalance) || currentBalance < amount) {
      return { ok: false, error: 'INSUFFICIENT_FUNDS' };
    }
    return { ok: true };
  },

  /**
   * Constructs an atomic TransactionRequest for purchasing any catalog item or booster bundle.
   * Rejects client-tampered prices by resolving strictly from ShopCatalogService.
   */
  buildPurchaseTransaction(
    state: Readonly<ConnectifySaveDataV1>,
    opId: string,
    itemId: string,
    quantity: 1 | 3 = 1,
  ): { request: TransactionRequest; totalPrice: number } | { error: string } {
    const quote = ShopCatalogService.quotePurchase(state, itemId, quantity);
    if (quote.error) {
      return { error: quote.error };
    }

    const spendCheck = this.validateSpend(state.profile.coins, quote.totalPrice);
    if (!spendCheck.ok) {
      return { error: spendCheck.error };
    }

    const booster = ShopCatalogService.getBoosterById(itemId);
    if (booster) {
      const source: TransactionSourceType = 'PURCHASE_BOOSTER';
      const request: TransactionRequest = {
        idempotencyKey: `purchase:${opId}`,
        type: source,
        label: `Beli ${booster.name}${quantity === 3 ? ' (×3)' : ''}`,
        mutate: (draft) => {
          const check = this.validateSpend(draft.profile.coins, quote.totalPrice);
          if (!check.ok) {
            throw new Error(check.error);
          }
          const current = draft.inventory.boosters[booster.id] ?? 0;
          if (current + quantity > booster.maxStock) {
            throw new Error('STOCK_LIMIT_REACHED');
          }
          draft.inventory.boosters[booster.id] = current + quantity;
          return { coinsDelta: -quote.totalPrice };
        },
      };
      return { request, totalPrice: quote.totalPrice };
    }

    const perm = ShopCatalogService.getPermanentItemById(itemId);
    if (!perm) {
      return { error: 'ITEM_NOT_FOUND' };
    }

    const source: TransactionSourceType =
      perm.category === 'theme' ? 'PURCHASE_THEME' : 'PURCHASE_COSMETIC';

    const request: TransactionRequest = {
      idempotencyKey: `purchase:${opId}`,
      type: source,
      label: `Beli ${perm.name}`,
      mutate: (draft) => {
        const check = this.validateSpend(draft.profile.coins, quote.totalPrice);
        if (!check.ok) {
          throw new Error(check.error);
        }
        if (ShopCatalogService.isItemOwned(draft, perm.id)) {
          throw new Error('ALREADY_OWNED');
        }

        if (perm.category === 'theme' && perm.themeId) {
          draft.inventory.unlockedThemes = Array.from(
            new Set([...draft.inventory.unlockedThemes, perm.themeId]),
          );
          draft.inventory.unseenThemes = Array.from(
            new Set([...draft.inventory.unseenThemes, perm.themeId]),
          );
          draft.statistics.totalThemesUnlocked = draft.inventory.unlockedThemes.length;
        } else {
          const idsToAdd = perm.members?.length ? [perm.id, ...perm.members] : [perm.id];
          draft.inventory.ownedCosmetics = Array.from(
            new Set([...draft.inventory.ownedCosmetics, ...idsToAdd]),
          );
          if (perm.category === 'avatar') {
            draft.inventory.unlockedAvatars = Array.from(
              new Set([...draft.inventory.unlockedAvatars, perm.id]),
            );
          }
        }

        return { coinsDelta: -quote.totalPrice };
      },
    };

    return { request, totalPrice: quote.totalPrice };
  },

  /**
   * Executes an atomic, idempotent shop purchase against LocalPersistenceEngine.
   */
  purchaseCatalogItem(
    persistence: LocalPersistenceEngine,
    opId: string,
    itemId: string,
    quantity: 1 | 3 = 1,
  ): EconomyTransactionOutcome {
    const state = persistence.getState();
    const built = this.buildPurchaseTransaction(state, opId, itemId, quantity);
    if ('error' in built) {
      return {
        success: false,
        idempotent: false,
        coinsDelta: 0,
        newBalance: state.profile.coins,
        itemId,
        error: built.error,
      };
    }

    const result = persistence.executeTransaction(built.request);
    if (!result.success) {
      return {
        success: false,
        idempotent: result.idempotent,
        coinsDelta: 0,
        newBalance: result.data.profile.coins,
        itemId,
        error: result.error,
      };
    }

    return {
      success: true,
      idempotent: result.idempotent,
      coinsDelta: result.idempotent ? 0 : -built.totalPrice,
      newBalance: result.data.profile.coins,
      source: built.request.type as TransactionSourceType,
      itemId,
      quantityAdded: result.idempotent ? 0 : quantity,
    };
  },

  /**
   * Executes an idempotent positive coin grant (e.g., Login Streak, Mission, Achievement, Daily Challenge).
   */
  grantCoins(
    persistence: LocalPersistenceEngine,
    idempotencyKey: string,
    amount: number,
    source: TransactionSourceType,
    label: string,
    xpDelta = 0,
  ): EconomyTransactionOutcome {
    const safeAmount = Math.max(0, Math.floor(amount));
    if (!Number.isSafeInteger(safeAmount) || safeAmount <= 0) {
      return {
        success: false,
        idempotent: false,
        coinsDelta: 0,
        newBalance: persistence.getState().profile.coins,
        error: 'INVALID_GRANT_AMOUNT',
      };
    }

    const result = persistence.executeTransaction({
      idempotencyKey,
      type: source,
      label,
      mutate: () => ({ coinsDelta: safeAmount, xpDelta: Math.max(0, Math.floor(xpDelta)) }),
    });

    return {
      success: result.success,
      idempotent: result.idempotent,
      coinsDelta: result.success && !result.idempotent ? safeAmount : 0,
      newBalance: result.data.profile.coins,
      source,
      error: result.error,
    };
  },
};
