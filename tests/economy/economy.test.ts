import { describe, it, expect, beforeEach } from 'vitest';
import { EconomyEngine } from '@/services/economy/EconomyEngine';
import { ShopCatalogService } from '@/services/economy/ShopCatalogService';
import { ECONOMY_CONFIG } from '@/config/economy.config';
import { LocalPersistenceEngine } from '@/services/persistence/LocalPersistenceEngine';
import { type KeyValueStorageAdapter } from '@/services/persistence/StorageDriver';
import { RewardEngine } from '@/services/progression/RewardEngine';
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

function makeWinPayload(overrides: Partial<GameResultPayload> = {}): GameResultPayload {
  return {
    game: 'onet',
    runId: `run-${Math.random().toString(36).slice(2)}`,
    level: 1,
    isWinner: true,
    isFlawless: false,
    stars: 3,
    score: 1800,
    timeElapsedMs: 65_000,
    remainingTimeSec: 55,
    totalTimeSec: 120,
    matches: 18,
    highestCombo: 5,
    mistakes: 0,
    boostersUsed: {},
    isDailyChallenge: false,
    dailyDateKey: null,
    ...overrides,
  };
}

describe('EconomyEngine & ShopCatalogService (ECON-01..06)', () => {
  let persistence: LocalPersistenceEngine;

  beforeEach(async () => {
    persistence = new LocalPersistenceEngine({ storage: createMemoryAdapter(), nowMs: 1_762_900_000_000 });
    await persistence.initialize();
  });

  it('ECON-01: enforces zero-negative-balance invariant and rejects invalid/overdraft amounts', () => {
    // Starter balance is 25
    expect(persistence.getState().profile.coins).toBe(25);

    // Invalid spend quantities
    expect(EconomyEngine.validateSpend(25, 0)).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    expect(EconomyEngine.validateSpend(25, -10)).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    expect(EconomyEngine.validateSpend(25, Number.NaN)).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    expect(EconomyEngine.validateSpend(25, 12.5)).toEqual({ ok: false, error: 'INVALID_AMOUNT' });
    expect(EconomyEngine.validateSpend(25, Number.POSITIVE_INFINITY)).toEqual({ ok: false, error: 'INVALID_AMOUNT' });

    // Overdraft attempt on expensive theme (sakura = 120 > 25)
    const buyFail = EconomyEngine.purchaseCatalogItem(persistence, 'op-overdraft-1', 'theme_sakura', 1);
    expect(buyFail.success).toBe(false);
    expect(buyFail.error).toBe('INSUFFICIENT_FUNDS');
    expect(persistence.getState().profile.coins).toBe(25);
    expect(persistence.getState().inventory.unlockedThemes).not.toContain('sakura');

    // Direct negative transaction attempt through LocalPersistenceEngine
    const rawNeg = persistence.executeTransaction({
      idempotencyKey: 'direct-overdraft',
      type: 'PURCHASE_THEME',
      mutate: () => ({ coinsDelta: -26 }),
    });
    expect(rawNeg.success).toBe(false);
    expect(rawNeg.error).toBe('INSUFFICIENT_FUNDS');
    expect(persistence.getState().profile.coins).toBe(25);
  });

  it('ECON-02: guarantees idempotent runId and opId deduplication against replay/double-claim exploits', () => {
    const startCoins = persistence.getState().profile.coins;
    const startXp = persistence.getState().profile.xp;

    // 1. Replay same game win 10 times with identical runId
    const fixedRunId = 'fixed-win-run-123';
    const firstWin = RewardEngine.commitRoundResult(
      persistence,
      makeWinPayload({ runId: fixedRunId, level: 1, stars: 3 }),
    );
    expect(firstWin.success).toBe(true);
    expect(firstWin.idempotent).toBe(false);
    expect(firstWin.breakdown.coinsEarned).toBeGreaterThan(0);

    const coinsAfterFirst = persistence.getState().profile.coins;
    const xpAfterFirst = persistence.getState().profile.xp;
    expect(coinsAfterFirst).toBeGreaterThan(startCoins);
    expect(xpAfterFirst).toBeGreaterThan(startXp);

    for (let i = 0; i < 9; i++) {
      const replay = RewardEngine.commitRoundResult(
        persistence,
        makeWinPayload({ runId: fixedRunId, level: 1, stars: 3 }),
      );
      expect(replay.success).toBe(true);
      expect(replay.idempotent).toBe(true);
      expect(replay.breakdown.coinsEarned).toBe(0);
      expect(replay.breakdown.xpEarned).toBe(0);
      expect(persistence.getState().profile.coins).toBe(coinsAfterFirst);
      expect(persistence.getState().profile.xp).toBe(xpAfterFirst);
    }

    // 2. Replay same booster purchase opId multiple times (should debit & grant stock only once)
    const stockBefore = persistence.getState().inventory.boosters.hint;
    const buy1 = EconomyEngine.purchaseCatalogItem(persistence, 'buy-hint-op-1', 'hint', 1);
    expect(buy1.success).toBe(true);
    expect(buy1.idempotent).toBe(false);
    expect(buy1.coinsDelta).toBe(-8);
    expect(persistence.getState().inventory.boosters.hint).toBe(stockBefore + 1);

    const balanceAfterBuy = persistence.getState().profile.coins;
    for (let i = 0; i < 4; i++) {
      const buyDup = EconomyEngine.purchaseCatalogItem(persistence, 'buy-hint-op-1', 'hint', 1);
      expect(buyDup.success).toBe(true);
      expect(buyDup.idempotent).toBe(true);
      expect(buyDup.coinsDelta).toBe(0);
      expect(persistence.getState().profile.coins).toBe(balanceAfterBuy);
      expect(persistence.getState().inventory.boosters.hint).toBe(stockBefore + 1);
    }

    // 3. Replay login streak claim on the same WIB day
    const nowMs = 1_762_900_000_000;
    const login1 = RewardEngine.commitLoginRewardClaim(persistence, nowMs);
    expect(login1.success).toBe(true);
    expect(login1.idempotent).toBe(false);
    const coinsAfterLogin = persistence.getState().profile.coins;

    const loginDup = RewardEngine.commitLoginRewardClaim(persistence, nowMs + 60_000);
    expect(loginDup.idempotent).toBe(true);
    expect(loginDup.coinsEarned).toBe(0);
    expect(persistence.getState().profile.coins).toBe(coinsAfterLogin);
  });

  it('ECON-03: resolves authoritative catalog prices and performs atomic rollback on mid-transaction failure', () => {
    // Reject milestone-only or unknown items
    expect(ShopCatalogService.getAuthoritativePrice('theme_reward_sakura')).toBeNull();
    expect(ShopCatalogService.getAuthoritativePrice('non_existent_item')).toBeNull();

    const milestoneBuy = EconomyEngine.purchaseCatalogItem(persistence, 'op-milestone', 'theme_reward_sakura', 1);
    expect(milestoneBuy.success).toBe(false);
    expect(milestoneBuy.error).toBe('NOT_PURCHASABLE_MILESTONE');

    // Grant coins to afford booster and test booster stock cap rollback
    EconomyEngine.grantCoins(persistence, 'seed-coins-1', 1000, 'STARTER_GRANT', 'Test Seed');
    const preBalance = persistence.getState().profile.coins;

    // Max stock is 99; force stock to 98 and attempt bundle of 3 -> must fail atomically with no debit
    persistence.executeTransaction({
      idempotencyKey: 'set-stock-98',
      type: 'STATE_UPDATE',
      mutate: (draft) => {
        draft.inventory.boosters.hint = 98;
      },
    });

    const overStockBuy = EconomyEngine.purchaseCatalogItem(persistence, 'op-overstock', 'hint', 3);
    expect(overStockBuy.success).toBe(false);
    expect(overStockBuy.error).toBe('STOCK_LIMIT_REACHED');
    expect(persistence.getState().profile.coins).toBe(preBalance);
    expect(persistence.getState().inventory.boosters.hint).toBe(98);
  });

  it('ECON-04: rejects duplicate permanent theme or cosmetic purchases', () => {
    EconomyEngine.grantCoins(persistence, 'seed-coins-dup', 500, 'STARTER_GRANT', 'Test Seed');
    const oceanPrice = ShopCatalogService.getAuthoritativePrice('theme_ocean')!;
    expect(oceanPrice).toBe(60);

    const before = persistence.getState().profile.coins;
    const first = EconomyEngine.purchaseCatalogItem(persistence, 'op-ocean-1', 'theme_ocean', 1);
    expect(first.success).toBe(true);
    expect(persistence.getState().profile.coins).toBe(before - oceanPrice);
    expect(persistence.getState().inventory.unlockedThemes).toContain('ocean');

    // Attempt second purchase with a DIFFERENT opId
    const second = EconomyEngine.purchaseCatalogItem(persistence, 'op-ocean-2', 'theme_ocean', 1);
    expect(second.success).toBe(false);
    expect(second.error).toBe('ALREADY_OWNED');
    expect(persistence.getState().profile.coins).toBe(before - oceanPrice);
    expect(
      persistence.getState().inventory.unlockedThemes.filter((t) => t === 'ocean').length,
    ).toBe(1);
  });

  it('ECON-05: enforces anti-farming diminishing returns on repeated level replays & daily gameplay caps', () => {
    // First clear of Level 1 (3 stars, normal perf)
    const first = EconomyEngine.calculateLevelCoins({
      game: 'onet',
      level: 1,
      isWinner: true,
      isFlawless: false,
      stars: 3,
      previousBestStars: 0,
      highestUnlockedLevel: 1,
      timeElapsedMs: 60_000,
      highestCombo: 4,
      sameDayClearCount: 0,
      consecutiveFailuresBeforeAttempt: 0,
      dailyGameplayCoinsEarned: 0,
      isDailyChallenge: false,
    });
    expect(first.isFirstClear).toBe(true);
    expect(first.coinsEarned).toBe(7); // base(3) + firstClear(2) + 3star(2)

    // Same-day replays decay: 50% -> 25% -> 0%
    const replay1 = EconomyEngine.calculateLevelCoins({
      game: 'onet',
      level: 1,
      isWinner: true,
      isFlawless: false,
      stars: 3,
      previousBestStars: 3,
      highestUnlockedLevel: 2,
      timeElapsedMs: 60_000,
      highestCombo: 4,
      sameDayClearCount: 1,
      consecutiveFailuresBeforeAttempt: 0,
      dailyGameplayCoinsEarned: 7,
      isDailyChallenge: false,
    });
    expect(replay1.replayMultiplier).toBe(0.5);
    expect(replay1.coinsEarned).toBeLessThan(first.coinsEarned);

    const replay3 = EconomyEngine.calculateLevelCoins({
      game: 'onet',
      level: 1,
      isWinner: true,
      isFlawless: false,
      stars: 3,
      previousBestStars: 3,
      highestUnlockedLevel: 2,
      timeElapsedMs: 60_000,
      highestCombo: 4,
      sameDayClearCount: 3,
      consecutiveFailuresBeforeAttempt: 0,
      dailyGameplayCoinsEarned: 10,
      isDailyChallenge: false,
    });
    expect(replay3.replayMultiplier).toBe(0);
    expect(replay3.coinsEarned).toBe(0);

    // Low-level farming guard (>10 levels behind frontier at 3 stars)
    const lowFarm = EconomyEngine.calculateLevelCoins({
      game: 'match3',
      level: 1,
      isWinner: true,
      isFlawless: false,
      stars: 3,
      previousBestStars: 3,
      highestUnlockedLevel: 20,
      timeElapsedMs: 70_000,
      highestCombo: 2,
      sameDayClearCount: 1,
      consecutiveFailuresBeforeAttempt: 0,
      dailyGameplayCoinsEarned: 10,
      isDailyChallenge: false,
    });
    expect(lowFarm.replayMultiplier).toBeLessThanOrEqual(ECONOMY_CONFIG.replayDecay.lowLevelGapMultiplier);

    // Daily soft cap (80) & hard cap (120)
    const softCapped = EconomyEngine.calculateLevelCoins({
      game: 'match3',
      level: 20,
      isWinner: true,
      isFlawless: false,
      stars: 3,
      previousBestStars: 0,
      highestUnlockedLevel: 20,
      timeElapsedMs: 85_000,
      highestCombo: 2,
      sameDayClearCount: 0,
      consecutiveFailuresBeforeAttempt: 0,
      dailyGameplayCoinsEarned: ECONOMY_CONFIG.dailyGameplayCaps.softCap,
      isDailyChallenge: false,
    });
    expect(softCapped.isSoftCapped).toBe(true);
    expect(softCapped.dailyCapMultiplier).toBe(ECONOMY_CONFIG.dailyGameplayCaps.softCapMultiplier);

    const hardCappedReplay = EconomyEngine.calculateLevelCoins({
      game: 'match3',
      level: 19,
      isWinner: true,
      isFlawless: false,
      stars: 3,
      previousBestStars: 3,
      highestUnlockedLevel: 20,
      timeElapsedMs: 85_000,
      highestCombo: 2,
      sameDayClearCount: 1,
      consecutiveFailuresBeforeAttempt: 0,
      dailyGameplayCoinsEarned: ECONOMY_CONFIG.dailyGameplayCaps.hardCap,
      isDailyChallenge: false,
    });
    expect(hardCappedReplay.isHardCapped).toBe(true);
    expect(hardCappedReplay.coinsEarned).toBe(0);

    // Anti-frustration pity coin on 3rd consecutive failure
    const pity = EconomyEngine.calculateLevelCoins({
      game: 'onet',
      level: 10,
      isWinner: false,
      isFlawless: false,
      stars: 0,
      previousBestStars: 0,
      highestUnlockedLevel: 10,
      timeElapsedMs: 110_000,
      highestCombo: 2,
      sameDayClearCount: 0,
      consecutiveFailuresBeforeAttempt: 2,
      dailyGameplayCoinsEarned: 10,
      isDailyChallenge: false,
    });
    expect(pity.pityCoins).toBe(1);
    expect(pity.coinsEarned).toBe(1);
  });

  it('ECON-06: maintains Onet vs Match 3 earning rate parity within +-15% over equivalent play time', () => {
    // 10 minutes = 600s -> 8 Onet rounds (75s avg) vs 6.67 Match 3 rounds (~7 rounds at 90s)
    const onetSec = ECONOMY_CONFIG.durations.onetAvgAttemptSec;
    const m3Sec = ECONOMY_CONFIG.durations.match3AvgAttemptSec;

    const onetFirstClear = EconomyEngine.calculateLevelCoins({
      game: 'onet',
      level: 5,
      isWinner: true,
      isFlawless: false,
      stars: 2,
      previousBestStars: 0,
      highestUnlockedLevel: 5,
      timeElapsedMs: onetSec * 1000,
      highestCombo: 4,
      sameDayClearCount: 0,
      consecutiveFailuresBeforeAttempt: 0,
      dailyGameplayCoinsEarned: 0,
      isDailyChallenge: false,
    }).coinsEarned;

    const m3FirstClear = EconomyEngine.calculateLevelCoins({
      game: 'match3',
      level: 5,
      isWinner: true,
      isFlawless: false,
      stars: 2,
      previousBestStars: 0,
      highestUnlockedLevel: 5,
      timeElapsedMs: m3Sec * 1000,
      highestCombo: 2,
      sameDayClearCount: 0,
      consecutiveFailuresBeforeAttempt: 0,
      dailyGameplayCoinsEarned: 0,
      isDailyChallenge: false,
    }).coinsEarned;

    const onetPerMin = (onetFirstClear / onetSec) * 60;
    const m3PerMin = (m3FirstClear / m3Sec) * 60;
    const ratio = onetPerMin / m3PerMin;
    expect(ratio).toBeGreaterThanOrEqual(0.85);
    expect(ratio).toBeLessThanOrEqual(1.15);
  });
});
