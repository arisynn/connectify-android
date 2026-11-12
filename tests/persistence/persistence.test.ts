import { describe, it, expect, beforeEach } from 'vitest';
import { LocalPersistenceEngine } from '@/services/persistence/LocalPersistenceEngine';
import { STORAGE_KEYS, type KeyValueStorageAdapter } from '@/services/persistence/StorageDriver';
import { createEnvelope, computeChecksum, parseAndVerifyEnvelope } from '@/services/persistence/ChecksumEngine';
import { EconomyEngine } from '@/services/economy/EconomyEngine';
import { RewardEngine } from '@/services/progression/RewardEngine';
import type { ActiveMatch3SessionState, ActiveOnetSessionState } from '@/types/persistence.types';

function createMemoryAdapter(): KeyValueStorageAdapter & { dump: () => Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
    dump: () => Object.fromEntries(map.entries()),
  };
}

describe('LocalPersistenceEngine & Crash Recovery (PERS-01..05)', () => {
  let kv: ReturnType<typeof createMemoryAdapter>;

  beforeEach(() => {
    kv = createMemoryAdapter();
    globalThis.localStorage.clear();
  });

  it('PERS-01: performs deterministic round-trip save/load with valid fnv1a64 checksum', async () => {
    const engine1 = new LocalPersistenceEngine({ storage: kv, nowMs: 1_762_900_000_000 });
    await engine1.initialize();
    expect(engine1.getBootReport()?.source).toBe('fresh_install');

    // Mutate economy, progression, settings, and inventory
    EconomyEngine.grantCoins(engine1, 'grant-test-1', 150, 'STARTER_GRANT', 'Test Grant');
    EconomyEngine.purchaseCatalogItem(engine1, 'buy-ocean-test', 'theme_ocean', 1);
    engine1.updateSettings({
      audio: { muteMusic: true, musicVolume: 20, sfxVolume: 75 },
      haptics: { enabled: false, intensity: 'light' },
      display: { darkMode: true, highContrastTiles: true },
    });

    const savedSnapshot = structuredClone(engine1.getState());
    const rawPrimary = kv.getItem(STORAGE_KEYS.PRIMARY);
    expect(rawPrimary).toBeTruthy();
    expect(parseAndVerifyEnvelope(rawPrimary)).not.toBeNull();

    // Cold boot a brand new engine instance from the same storage
    const engine2 = new LocalPersistenceEngine({ storage: kv });
    const loaded = await engine2.initialize();

    expect(engine2.getBootReport()?.source).toBe('primary');
    expect(engine2.getBootReport()?.recoveredFromCorruption).toBe(false);
    expect(loaded).toEqual(savedSnapshot);
  });

  it('PERS-02: recovers cleanly from truncated/corrupted Primary slot using Backup slot', async () => {
    const engine1 = new LocalPersistenceEngine({ storage: kv, nowMs: 1_762_900_000_000 });
    await engine1.initialize();

    // Commit revision 2 (Primary=rev2, Backup=rev1) and revision 3 (Primary=rev3, Backup=rev2)
    EconomyEngine.grantCoins(engine1, 'tx-r2', 100, 'STARTER_GRANT', 'R2');
    const stateAtRev2 = structuredClone(engine1.getState());
    EconomyEngine.grantCoins(engine1, 'tx-r3', 50, 'STARTER_GRANT', 'R3');

    // Inject truncated JSON into PRIMARY simulating mid-write crash
    kv.setItem(STORAGE_KEYS.PRIMARY, '{"magic":"CONNECTIFY_SAVE","schemaVersion":1,"revision":3,"data":{"profile":{"coins":99');
    // Ensure WAL is absent so engine falls back to Backup
    kv.removeItem(STORAGE_KEYS.WAL);

    const recoveredEngine = new LocalPersistenceEngine({ storage: kv });
    const loaded = await recoveredEngine.initialize();

    expect(recoveredEngine.getBootReport()?.source).toBe('backup_recovery');
    expect(recoveredEngine.getBootReport()?.recoveredFromCorruption).toBe(true);
    expect(loaded.profile.coins).toBe(stateAtRev2.profile.coins);

    // Primary slot should be self-healed now
    expect(parseAndVerifyEnvelope(kv.getItem(STORAGE_KEYS.PRIMARY))).not.toBeNull();
  });

  it('PERS-03: detects tampered checksum / negative coins and recovers safely instead of loading tampered data', async () => {
    const engine1 = new LocalPersistenceEngine({ storage: kv, nowMs: 1_762_900_000_000 });
    await engine1.initialize();
    EconomyEngine.grantCoins(engine1, 'legit-1', 80, 'STARTER_GRANT', 'Legit');
    const legitCoins = engine1.getState().profile.coins;

    // Tamper with Primary JSON coins without updating checksum
    const primaryEnv = JSON.parse(kv.getItem(STORAGE_KEYS.PRIMARY)!);
    primaryEnv.data.profile.coins = 999_999;
    kv.setItem(STORAGE_KEYS.PRIMARY, JSON.stringify(primaryEnv));

    expect(parseAndVerifyEnvelope(kv.getItem(STORAGE_KEYS.PRIMARY))).toBeNull();

    // Also test tampered negative coins even if someone recomputed checksum
    const badData = structuredClone(primaryEnv.data);
    badData.profile.coins = -500;
    const forgedNegativeEnv = {
      ...primaryEnv,
      data: badData,
      checksum: computeChecksum(1, primaryEnv.revision, badData),
    };
    expect(parseAndVerifyEnvelope(JSON.stringify(forgedNegativeEnv))).toBeNull();

    // Recovery engine rejects tampered Primary and restores Backup
    const engine2 = new LocalPersistenceEngine({ storage: kv });
    const loaded = await engine2.initialize();
    expect(engine2.getBootReport()?.recoveredFromCorruption).toBe(true);
    expect(loaded.profile.coins).toBeLessThanOrEqual(legitCoins);
    expect(loaded.profile.coins).toBeGreaterThanOrEqual(0);
  });

  it('PERS-03b: recovers newer interrupted commit from Write-Ahead Log (WAL) slot', async () => {
    const engine1 = new LocalPersistenceEngine({ storage: kv, nowMs: 1_762_900_000_000 });
    await engine1.initialize();

    // Create a valid newer envelope (revision + 1) sitting in WAL as if process died after Step 1
    const nextData = structuredClone(engine1.getState());
    nextData.profile.coins = 777;
    const walEnvelope = createEnvelope(nextData, engine1.getRevision() + 1, Date.now());
    kv.setItem(STORAGE_KEYS.WAL, JSON.stringify(walEnvelope));

    const engine2 = new LocalPersistenceEngine({ storage: kv });
    const loaded = await engine2.initialize();

    expect(engine2.getBootReport()?.source).toBe('wal_recovery');
    expect(loaded.profile.coins).toBe(777);
    expect(kv.getItem(STORAGE_KEYS.WAL)).toBeNull();
  });

  it('PERS-04: migrates legacy connectify-new localStorage profile data cleanly on first boot', async () => {
    globalThis.localStorage.setItem('pkmnPlayerName', 'SintaTester');
    globalThis.localStorage.setItem('connectify-dark', 'true');
    globalThis.localStorage.setItem(
      'sweetConnectAudioSettings',
      JSON.stringify({ muteMusic: true, muteSfx: false, musicVol: 35, sfxVol: 90 }),
    );
    globalThis.localStorage.setItem(
      'SC_BACKUP_SintaTester',
      JSON.stringify({
        gameData: {
          permen: 240,
          accountXP: 525,
          highestLevel: 12,
          currentLevel: 9,
          unlockedThemes: ['sweets', 'ocean', 'sakura'],
          activeTheme: 'sakura',
          hints: 7,
          shuffles: 4,
          hammers: 5,
          bombs: 6,
          achievements: { first_win: 1 },
        },
      }),
    );

    const engine = new LocalPersistenceEngine({ storage: kv });
    const loaded = await engine.initialize();

    expect(engine.getBootReport()?.source).toBe('legacy_migration');
    expect(loaded.profile.playerName).toBe('SintaTester');
    expect(loaded.profile.coins).toBe(240);
    expect(loaded.profile.xp).toBe(525);
    expect(loaded.progression.onet.highestUnlockedLevel).toBe(12);
    expect(loaded.progression.onet.currentLevel).toBe(9);
    expect(loaded.inventory.unlockedThemes).toContain('sakura');
    expect(loaded.inventory.equippedThemes.globalThemeId).toBe('sakura');
    expect(loaded.inventory.boosters.hint).toBe(7);
    expect(loaded.settings.display.darkMode).toBe(true);
    expect(loaded.settings.audio.muteMusic).toBe(true);
    expect(loaded.settings.audio.musicVolume).toBe(35);
    expect(loaded.achievements.claimedTiers.first_win).toBe(1);
    expect(kv.getItem(STORAGE_KEYS.PRE_MIGRATION_BACKUP)).toBeTruthy();
  });

  it('PERS-05: persists and restores active mid-game Onet & Match 3 sessions across flushNow() and cold boot', async () => {
    const engine1 = new LocalPersistenceEngine({ storage: kv, nowMs: 1_762_900_000_000 });
    await engine1.initialize();

    const onetSession: ActiveOnetSessionState = {
      runId: 'onet-active-1',
      gameId: 'onet',
      level: 4,
      isDailyChallenge: false,
      dailyChallengeDateKey: null,
      themeId: 'ocean',
      score: 950,
      combo: 3,
      highestCombo: 4,
      elapsedMs: 32_000,
      mistakes: 1,
      boostersUsed: { hint: 1 },
      rngState: 12345,
      startedAt: 1_762_900_000_000,
      savedAt: Date.now(),
      remainingTimeSec: 88,
      totalTimeSec: 120,
      board: [[null, { id: 'ocean_0', icon: 'ocean_0', footprint: '1x1' }]],
      matchesCompleted: 9,
      splitsCompleted: 1,
      selectedCoord: { r: 1, c: 1 },
    };

    const match3Session: ActiveMatch3SessionState = {
      runId: 'm3-active-1',
      gameId: 'match3',
      level: 7,
      isDailyChallenge: false,
      dailyChallengeDateKey: null,
      themeId: 'candy',
      score: 3100,
      combo: 2,
      highestCombo: 3,
      elapsedMs: 41_000,
      mistakes: 0,
      boostersUsed: { hammer: 1 },
      rngState: 98765,
      startedAt: 1_762_900_000_000,
      savedAt: Date.now(),
      movesRemaining: 14,
      totalMoves: 24,
      board: [[{ tileId: 'candy_0', special: 'striped_h', blocker: 'ice_1' }]],
      objectives: [{ type: 'score', current: 3100, target: 4500 }],
      starThresholds: [4500, 7000, 9500],
      cascadesTriggered: 5,
    };

    engine1.saveActiveSession('onet', onetSession);
    engine1.saveActiveSession('match3', match3Session);
    engine1.flushNow();

    const engine2 = new LocalPersistenceEngine({ storage: kv });
    await engine2.initialize();

    const restoredOnet = engine2.getActiveSession('onet');
    const restoredM3 = engine2.getActiveSession('match3');
    expect(restoredOnet?.runId).toBe('onet-active-1');
    expect(restoredOnet?.remainingTimeSec).toBe(88);
    expect(restoredOnet?.score).toBe(950);
    expect(restoredM3?.runId).toBe('m3-active-1');
    expect(restoredM3?.movesRemaining).toBe(14);
    expect(restoredM3?.board[0][0].special).toBe('striped_h');

    // Completing round clears that game's active session while keeping the other intact
    RewardEngine.commitRoundResult(engine2, {
      game: 'onet',
      runId: 'onet-active-1',
      level: 4,
      isWinner: true,
      isFlawless: false,
      stars: 2,
      score: 2100,
      timeElapsedMs: 55_000,
      remainingTimeSec: 65,
      totalTimeSec: 120,
      matches: 30,
      highestCombo: 5,
      mistakes: 1,
      boostersUsed: { hint: 1 },
      isDailyChallenge: false,
      dailyDateKey: null,
    });

    expect(engine2.getActiveSession('onet')).toBeNull();
    expect(engine2.getActiveSession('match3')?.runId).toBe('m3-active-1');
  });
});
