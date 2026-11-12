/**
 * Shop Catalog & Ownership Resolution Service for Connectify Android.
 * Owned by: @economy-designer
 */

import {
  BOOSTER_CATALOG,
  PERMANENT_CATALOG,
  PERMANENT_CATALOG_MAP,
} from '@/config/economy.config';
import type {
  BoosterCatalogDefinition,
  CatalogItemDefinition,
  PurchaseQuote,
  ShopCategory,
  ShopGameScope,
} from '@/types/economy.types';
import type { BoosterId, ConnectifySaveDataV1 } from '@/types/persistence.types';

export const ShopCatalogService = {
  getBoosters(): BoosterCatalogDefinition[] {
    return Object.values(BOOSTER_CATALOG);
  },

  getBoosterById(id: string): BoosterCatalogDefinition | null {
    return (BOOSTER_CATALOG as Record<string, BoosterCatalogDefinition | undefined>)[id] ?? null;
  },

  getAllPermanentItems(includeNonPurchasable = false): CatalogItemDefinition[] {
    if (includeNonPurchasable) {
      return [...PERMANENT_CATALOG];
    }
    return PERMANENT_CATALOG.filter((item) => item.price !== null && item.price > 0);
  },

  getPermanentItemById(id: string): CatalogItemDefinition | null {
    return PERMANENT_CATALOG_MAP[id] ?? null;
  },

  /**
   * Resolves authoritative price from immutable catalog config.
   * Never trusts client-supplied UI prices. Returns null for unknown or milestone-only items.
   */
  getAuthoritativePrice(itemId: string, quantity: 1 | 3 = 1): number | null {
    const booster = this.getBoosterById(itemId);
    if (booster) {
      return quantity === 3 ? booster.bundle3Price : booster.singlePrice;
    }
    if (quantity !== 1) return null;
    const perm = this.getPermanentItemById(itemId);
    if (!perm || perm.price === null) return null;
    return perm.price;
  },

  /**
   * Checks whether a permanent item (theme, tilepack, surface, cosmetic) is already owned.
   * Always returns false for consumable boosters.
   */
  isItemOwned(state: Readonly<ConnectifySaveDataV1>, itemId: string): boolean {
    if (this.getBoosterById(itemId)) {
      return false;
    }

    const perm = this.getPermanentItemById(itemId);
    if (!perm) return false;

    if (perm.isFreeStarter || perm.price === 0) {
      return true;
    }

    if (perm.category === 'theme' && perm.themeId) {
      return state.inventory.unlockedThemes.includes(perm.themeId);
    }

    const owned = state.inventory.ownedCosmetics;
    if (owned.includes(perm.id)) {
      return true;
    }

    if (perm.members?.length) {
      return perm.members.every((memberId) => owned.includes(memberId));
    }

    if (perm.category === 'avatar') {
      return state.inventory.unlockedAvatars.includes(perm.id);
    }

    return false;
  },

  getItemsForScope(
    scope: ShopGameScope | 'all',
    category?: ShopCategory,
  ): { boosters: BoosterCatalogDefinition[]; permanents: CatalogItemDefinition[] } {
    const matchesScope = (itemScope: ShopGameScope): boolean => {
      if (scope === 'all') return true;
      if (scope === 'profile') return itemScope === 'profile';
      return itemScope === scope || itemScope === 'both';
    };

    const boosters =
      category && category !== 'booster'
        ? []
        : this.getBoosters().filter((b) => matchesScope(b.gameScope));

    const permanents =
      category === 'booster'
        ? []
        : this.getAllPermanentItems(false).filter(
            (item) => matchesScope(item.gameScope) && (!category || item.category === category),
          );

    return { boosters, permanents };
  },

  quotePurchase(
    state: Readonly<ConnectifySaveDataV1>,
    itemId: string,
    quantity: 1 | 3 = 1,
  ): PurchaseQuote {
    const currentBalance = Math.max(0, Math.floor(state.profile.coins));
    const booster = this.getBoosterById(itemId);

    if (booster) {
      const totalPrice = quantity === 3 ? booster.bundle3Price : booster.singlePrice;
      const currentStock = state.inventory.boosters[booster.id] ?? 0;
      const stockLimitReached = currentStock + quantity > booster.maxStock;
      const canAfford = !stockLimitReached && currentBalance >= totalPrice;
      const error = stockLimitReached
        ? 'STOCK_LIMIT_REACHED'
        : currentBalance < totalPrice
          ? 'INSUFFICIENT_FUNDS'
          : undefined;

      return {
        itemId: booster.id,
        itemName: booster.name,
        category: 'booster',
        quantity,
        unitPrice: booster.singlePrice,
        totalPrice,
        isBundle: quantity === 3,
        isConsumable: true,
        alreadyOwned: false,
        isPurchasable: true,
        canAfford,
        currentBalance,
        balanceAfter: canAfford ? currentBalance - totalPrice : currentBalance,
        error,
      };
    }

    const perm = this.getPermanentItemById(itemId);
    if (!perm) {
      return {
        itemId,
        itemName: 'Unknown Item',
        category: 'theme',
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        isBundle: false,
        isConsumable: false,
        alreadyOwned: false,
        isPurchasable: false,
        canAfford: false,
        currentBalance,
        balanceAfter: currentBalance,
        error: 'ITEM_NOT_FOUND',
      };
    }

    const alreadyOwned = this.isItemOwned(state, itemId);
    if (perm.price === null || perm.isMilestoneReward) {
      return {
        itemId: perm.id,
        itemName: perm.name,
        category: perm.category,
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        isBundle: false,
        isConsumable: false,
        alreadyOwned,
        isPurchasable: false,
        canAfford: false,
        currentBalance,
        balanceAfter: currentBalance,
        error: 'NOT_PURCHASABLE_MILESTONE',
      };
    }

    const totalPrice = perm.price;
    const canAfford = !alreadyOwned && currentBalance >= totalPrice;
    const error = alreadyOwned
      ? 'ALREADY_OWNED'
      : currentBalance < totalPrice
        ? 'INSUFFICIENT_FUNDS'
        : undefined;

    return {
      itemId: perm.id,
      itemName: perm.name,
      category: perm.category,
      quantity: 1,
      unitPrice: totalPrice,
      totalPrice,
      isBundle: false,
      isConsumable: false,
      alreadyOwned,
      isPurchasable: true,
      canAfford,
      currentBalance,
      balanceAfter: canAfford ? currentBalance - totalPrice : currentBalance,
      error,
    };
  },

  getBoosterStock(state: Readonly<ConnectifySaveDataV1>, boosterId: BoosterId): number {
    return Math.max(0, Math.floor(state.inventory.boosters[boosterId] ?? 0));
  },

  getCatalogSummary(state: Readonly<ConnectifySaveDataV1>): {
    themesUnlocked: number;
    themesTotal: number;
    permanentsOwned: number;
    permanentsTotal: number;
  } {
    const purchasableThemes = PERMANENT_CATALOG.filter(
      (i) => i.category === 'theme' && i.price !== null && i.price > 0,
    );
    const purchasablePermanents = this.getAllPermanentItems(false);
    return {
      themesUnlocked: purchasableThemes.filter((t) => this.isItemOwned(state, t.id)).length,
      themesTotal: purchasableThemes.length,
      permanentsOwned: purchasablePermanents.filter((p) => this.isItemOwned(state, p.id)).length,
      permanentsTotal: purchasablePermanents.length,
    };
  },
};
