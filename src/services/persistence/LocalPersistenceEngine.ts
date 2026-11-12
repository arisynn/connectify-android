/**
 * 100% Offline-First, Deterministic Authoritative Local Persistence Engine
 * Owned by: @data-eng
 *
 * Guarantees:
 * - Zero mandatory login / zero network requirement on boot or gameplay.
 * - Atomic Write-Ahead Backup Protocol (WAL -> Backup -> Primary + IndexedDB mirror).
 * - Synchronous integrity checksum (fnv1a64) & automatic corruption self-healing.
 * - Idempotent transaction ledger (`processedKeys` + `ledger`) preventing duplicate claims.
 * - Strict invariants: `coins >= 0`, `xp >= 0`, `highestUnlockedLevel >= 1`, monotonic star mastery.
 */

import type {
  ActiveGameSession,
  ActiveMatch3SessionState,
  ActiveOnetSessionState,
  BoosterId,
  ConnectifySaveDataV1,
  GameModeId,
  MutationResult,
  PersistenceBootReport,
  PlayerSettingsState,
  SaveEnvelopeV1,
  TransactionSourceType,
} from '../../types/persistence.types';
import { createEnvelope, isValidSaveDataShape, parseAndVerifyEnvelope } from './ChecksumEngine';
import { DisabledCloudSyncAdapter, type ICloudSyncAdapter } from './CloudSyncAdapter';
import { createDefaultSaveDataV1, getWibDateKey, SchemaMigrator } from './SchemaMigrator';
import { type KeyValueStorageAdapter, StorageDriver } from './StorageDriver';

const MAX_PROCESSED_KEYS = 500;
const MAX_LEDGER_ENTRIES = 200;

export interface TransactionRequest {
  idempotencyKey: string;
  type: TransactionSourceType | 'STATE_UPDATE';
  label?: string;
  mutate: (draft: ConnectifySaveDataV1) => { coinsDelta?: number; xpDelta?: number } | void;
}

export class LocalPersistenceEngine {
  private static defaultInstance: LocalPersistenceEngine | null = null;

  private driver: StorageDriver;
  private cloudAdapter: ICloudSyncAdapter;
  private state: ConnectifySaveDataV1;
  private revision = 1;
  private initialized = false;
  private bootReport: PersistenceBootReport | null = null;
  private processedKeySet = new Set<string>();
  private listeners = new Set<() => void>();
  private snapshotCache: ConnectifySaveDataV1;

  constructor(options?: {
    storage?: KeyValueStorageAdapter;
    cloudAdapter?: ICloudSyncAdapter;
    nowMs?: number;
  }) {
    this.driver = new StorageDriver(options?.storage);
    this.cloudAdapter = options?.cloudAdapter ?? new DisabledCloudSyncAdapter();
    this.state = createDefaultSaveDataV1(options?.nowMs ?? Date.now());
    this.snapshotCache = this.state;
    this.hydrateKeySet();
  }

  static getInstance(): LocalPersistenceEngine {
    if (!LocalPersistenceEngine.defaultInstance) {
      LocalPersistenceEngine.defaultInstance = new LocalPersistenceEngine();
    }
    return LocalPersistenceEngine.defaultInstance;
  }

  private hydrateKeySet(): void {
    this.processedKeySet = new Set(this.state.transactionLog.processedKeys || []);
  }

  private cloneState(source: ConnectifySaveDataV1 = this.state): ConnectifySaveDataV1 {
    return typeof structuredClone === 'function'
      ? structuredClone(source)
      : (JSON.parse(JSON.stringify(source)) as ConnectifySaveDataV1);
  }

  private emit(): void {
    this.snapshotCache = this.state;
    for (const listener of this.listeners) {
      listener();
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): Readonly<ConnectifySaveDataV1> => {
    return this.snapshotCache;
  };

  getRevision(): number {
    return this.revision;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getBootReport(): PersistenceBootReport | null {
    return this.bootReport;
  }

  /**
   * Initializes local persistence with automatic WAL/Backup/IndexedDB crash recovery.
   * Never requires network or authentication.
   */
  async initialize(): Promise<ConnectifySaveDataV1> {
    if (this.initialized) {
      return this.snapshotCache;
    }

    const rawWal = this.driver.readRawSlot('WAL');
    const rawPrimary = this.driver.readRawSlot('PRIMARY');
    const rawBackup = this.driver.readRawSlot('BACKUP');

    const envWal = parseAndVerifyEnvelope(rawWal);
    const envPrimary = parseAndVerifyEnvelope(rawPrimary);
    const envBackup = parseAndVerifyEnvelope(rawBackup);

    let chosen: SaveEnvelopeV1 | null = null;
    let source: PersistenceBootReport['source'] = 'fresh_install';
    let recoveredFromCorruption = false;

    // Case A: Interrupted write in WAL with strictly newer valid revision
    if (envWal && (!envPrimary || envWal.revision > envPrimary.revision)) {
      chosen = envWal;
      source = 'wal_recovery';
    } else if (envPrimary) {
      // Case B: Normal boot from valid primary
      chosen = envPrimary;
      source = 'primary';
    } else if (envBackup) {
      // Case C: Primary missing or corrupted; restore from Backup
      chosen = envBackup;
      source = 'backup_recovery';
      recoveredFromCorruption = Boolean(rawPrimary);
    } else {
      // Case D: Attempt recovery from IndexedDB mirror
      const rawIdb = await this.driver.readFromIndexedDB();
      const envIdb = parseAndVerifyEnvelope(rawIdb);
      if (envIdb) {
        chosen = envIdb;
        source = 'indexeddb_recovery';
        recoveredFromCorruption = Boolean(rawPrimary || rawBackup);
      }
    }

    // Case E: Check for legacy `connectify-new` save data or provision fresh install
    if (!chosen) {
      const legacy = SchemaMigrator.tryImportLegacyConnectifyNew(this.driver);
      if (legacy) {
        chosen = createEnvelope(legacy, 1);
        source = 'legacy_migration';
      } else {
        chosen = createEnvelope(createDefaultSaveDataV1(), 1);
        source = 'fresh_install';
      }
    }

    // Merge any newer fast-path active game session saved on crash/kill
    const fastSessions = this.driver.readFastSession();
    if (fastSessions) {
      const envUpdatedAt = chosen.updatedAt || 0;
      if (fastSessions.onet && fastSessions.onet.savedAt >= envUpdatedAt) {
        chosen.data.activeSession.onet = fastSessions.onet as ActiveOnetSessionState;
      }
      if (fastSessions.match3 && fastSessions.match3.savedAt >= envUpdatedAt) {
        chosen.data.activeSession.match3 = fastSessions.match3 as ActiveMatch3SessionState;
      }
    }

    this.state = chosen.data;
    this.revision = chosen.revision;
    this.hydrateKeySet();

    // Ensure Primary & Backup slots are synchronized and WAL is clean
    const cleanEnvelope = createEnvelope(this.state, this.revision, chosen.updatedAt);
    if (source !== 'primary' || !envBackup || envBackup.revision !== envPrimary?.revision) {
      this.driver.commitAtomicEnvelope(cleanEnvelope);
    } else if (rawWal) {
      this.driver.removeSlot('WAL');
    }

    this.initialized = true;
    this.bootReport = {
      source,
      recoveredFromCorruption,
      revision: this.revision,
    };
    this.emit();
    return this.snapshotCache;
  }

  /**
   * Executes an atomic, idempotent mutation with strict invariant enforcement
   * and WAL-protected commit.
   */
  executeTransaction(tx: TransactionRequest): MutationResult {
    const key = tx.idempotencyKey?.trim();
    if (!key) {
      return {
        success: false,
        idempotent: false,
        error: 'MISSING_IDEMPOTENCY_KEY',
        revision: this.revision,
        data: this.snapshotCache,
      };
    }

    if (tx.type !== 'STATE_UPDATE' && this.processedKeySet.has(key)) {
      return {
        success: true,
        idempotent: true,
        revision: this.revision,
        data: this.snapshotCache,
      };
    }

    const draft = this.cloneState();
    const nowMs = Date.now();
    const todayKey = getWibDateKey(nowMs);

    if (draft.profile.dailyEconomy.dateKey !== todayKey) {
      draft.profile.dailyEconomy = {
        dateKey: todayKey,
        coinsEarnedToday: 0,
        levelCompletionCountsToday: {},
      };
    }

    if (draft.dailyChallenges.dailyDateKey !== todayKey) {
      // Preserve dailyPuzzle score reset on new WIB day while leaving mission rollover to MissionEngine
      draft.dailyChallenges.dailyPuzzle = {
        dateKey: todayKey,
        onetCompleted: false,
        onetScore: 0,
        match3Completed: false,
        match3Score: 0,
      };
    }

    let deltaInfo: { coinsDelta?: number; xpDelta?: number } | void;
    try {
      deltaInfo = tx.mutate(draft);
    } catch (err) {
      return {
        success: false,
        idempotent: false,
        error: err instanceof Error ? err.message : 'MUTATION_FAILED',
        revision: this.revision,
        data: this.snapshotCache,
      };
    }

    const coinsDelta = Math.trunc(deltaInfo?.coinsDelta ?? 0);
    const xpDelta = Math.max(0, Math.trunc(deltaInfo?.xpDelta ?? 0));

    const nextCoins = draft.profile.coins + coinsDelta;
    if (!Number.isInteger(nextCoins) || nextCoins < 0) {
      return {
        success: false,
        idempotent: false,
        error: 'INSUFFICIENT_FUNDS',
        revision: this.revision,
        data: this.snapshotCache,
      };
    }

    draft.profile.coins = nextCoins;
    if (coinsDelta > 0) {
      draft.profile.lifetimeCoinsEarned += coinsDelta;
      draft.profile.dailyEconomy.coinsEarnedToday += coinsDelta;
    } else if (coinsDelta < 0) {
      draft.profile.lifetimeCoinsSpent += Math.abs(coinsDelta);
    }

    if (xpDelta > 0) {
      draft.profile.xp += xpDelta;
    }

    draft.profile.lastActiveAt = nowMs;

    // Enforce progression & inventory invariants
    draft.progression.onet.highestUnlockedLevel = Math.max(1, Math.floor(draft.progression.onet.highestUnlockedLevel));
    draft.progression.onet.currentLevel = Math.min(
      draft.progression.onet.highestUnlockedLevel,
      Math.max(1, Math.floor(draft.progression.onet.currentLevel)),
    );
    draft.progression.match3.highestUnlockedLevel = Math.max(
      1,
      Math.floor(draft.progression.match3.highestUnlockedLevel),
    );
    draft.progression.match3.currentLevel = Math.min(
      draft.progression.match3.highestUnlockedLevel,
      Math.max(1, Math.floor(draft.progression.match3.currentLevel)),
    );

    for (const boosterKey of Object.keys(draft.inventory.boosters) as BoosterId[]) {
      draft.inventory.boosters[boosterKey] = Math.min(
        999,
        Math.max(0, Math.floor(draft.inventory.boosters[boosterKey] ?? 0)),
      );
    }

    // Record idempotency key & financial ledger entry
    if (tx.type !== 'STATE_UPDATE') {
      const nextKeys = [key, ...draft.transactionLog.processedKeys.filter((k) => k !== key)].slice(
        0,
        MAX_PROCESSED_KEYS,
      );
      draft.transactionLog.processedKeys = nextKeys;

      if (coinsDelta !== 0) {
        draft.transactionLog.ledger = [
          {
            id: key,
            idempotencyKey: key,
            amount: coinsDelta,
            balanceAfter: draft.profile.coins,
            source: tx.type,
            label: tx.label || tx.type,
            timestampIso: new Date(nowMs).toISOString(),
            timestampMs: nowMs,
          },
          ...draft.transactionLog.ledger,
        ].slice(0, MAX_LEDGER_ENTRIES);
      }
    }

    if (!isValidSaveDataShape(draft)) {
      return {
        success: false,
        idempotent: false,
        error: 'INVALID_STATE_INVARIANT',
        revision: this.revision,
        data: this.snapshotCache,
      };
    }

    const nextRevision = this.revision + 1;
    const envelope = createEnvelope(draft, nextRevision, nowMs);
    this.driver.commitAtomicEnvelope(envelope);
    this.driver.writeFastSession({
      onet: draft.activeSession.onet,
      match3: draft.activeSession.match3,
    });

    this.state = draft;
    this.revision = nextRevision;
    this.hydrateKeySet();
    this.initialized = true;
    this.emit();

    if (this.cloudAdapter.isConfigured) {
      void this.cloudAdapter.pushSnapshot(envelope);
    }

    return {
      success: true,
      idempotent: false,
      revision: this.revision,
      data: this.snapshotCache,
    };
  }

  /**
   * High-frequency active board checkpoint (called on settled moves and Android pause).
   */
  saveActiveSession(
    gameId: GameModeId,
    session: ActiveOnetSessionState | ActiveMatch3SessionState | null,
  ): void {
    const draft = this.cloneState();
    if (gameId === 'onet') {
      draft.activeSession.onet = session as ActiveOnetSessionState | null;
    } else {
      draft.activeSession.match3 = session as ActiveMatch3SessionState | null;
    }
    if (session) {
      draft.activeSession.lastPlayedGame = gameId;
    }
    this.state = draft;
    this.driver.writeFastSession({
      onet: draft.activeSession.onet,
      match3: draft.activeSession.match3,
    });
    this.emit();
  }

  getActiveSession(gameId: 'onet'): ActiveOnetSessionState | null;
  getActiveSession(gameId: 'match3'): ActiveMatch3SessionState | null;
  getActiveSession(gameId?: GameModeId): ActiveGameSession | null;
  getActiveSession(gameId?: GameModeId): ActiveGameSession | null {
    const target = gameId ?? this.state.activeSession.lastPlayedGame;
    return target === 'onet' ? this.state.activeSession.onet : this.state.activeSession.match3;
  }

  /**
   * Synchronous flush called on Android `appStateChange` (pause), `visibilitychange`,
   * and `pagehide` so active in-progress board state is durably committed to Primary + Backup.
   */
  flushNow(): void {
    const nowMs = Date.now();
    const draft = this.cloneState();
    draft.profile.lastActiveAt = nowMs;
    const nextRevision = this.revision + 1;
    const envelope = createEnvelope(draft, nextRevision, nowMs);
    this.driver.commitAtomicEnvelope(envelope);
    this.driver.writeFastSession({
      onet: draft.activeSession.onet,
      match3: draft.activeSession.match3,
    });
    this.state = draft;
    this.revision = nextRevision;
    this.snapshotCache = this.state;
  }

  updateSettings(patch: {
    audio?: Partial<PlayerSettingsState['audio']>;
    haptics?: Partial<PlayerSettingsState['haptics']>;
    display?: Partial<PlayerSettingsState['display']>;
    locale?: PlayerSettingsState['locale'];
  }): MutationResult {
    return this.executeTransaction({
      idempotencyKey: `settings:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`,
      type: 'STATE_UPDATE',
      mutate: (draft) => {
        if (patch.audio) {
          draft.settings.audio = {
            ...draft.settings.audio,
            ...patch.audio,
            musicVolume: Math.min(100, Math.max(0, Math.round(patch.audio.musicVolume ?? draft.settings.audio.musicVolume))),
            sfxVolume: Math.min(100, Math.max(0, Math.round(patch.audio.sfxVolume ?? draft.settings.audio.sfxVolume))),
          };
        }
        if (patch.haptics) {
          draft.settings.haptics = { ...draft.settings.haptics, ...patch.haptics };
        }
        if (patch.display) {
          draft.settings.display = { ...draft.settings.display, ...patch.display };
        }
        if (patch.locale) {
          draft.settings.locale = patch.locale;
        }
      },
    });
  }

  exportBackupPayload(): string {
    const envelope = createEnvelope(this.cloneState(), this.revision, Date.now());
    return JSON.stringify(envelope);
  }

  importBackupPayload(rawPayload: string): MutationResult {
    let verified = parseAndVerifyEnvelope(rawPayload);
    if (!verified) {
      try {
        const parsed = JSON.parse(rawPayload);
        const migrated = SchemaMigrator.migrateEnvelopeIfNeeded(parsed, this.driver);
        if (migrated && isValidSaveDataShape(migrated.data)) {
          verified = migrated;
        }
      } catch {
        verified = null;
      }
    }

    if (!verified) {
      return {
        success: false,
        idempotent: false,
        error: 'CORRUPTED_OR_INVALID_BACKUP',
        revision: this.revision,
        data: this.snapshotCache,
      };
    }

    const nextRevision = Math.max(this.revision + 1, verified.revision + 1);
    const envelope = createEnvelope(verified.data, nextRevision, Date.now());
    this.driver.commitAtomicEnvelope(envelope);
    this.driver.writeFastSession({
      onet: verified.data.activeSession.onet,
      match3: verified.data.activeSession.match3,
    });

    this.state = verified.data;
    this.revision = nextRevision;
    this.hydrateKeySet();
    this.initialized = true;
    this.emit();

    return {
      success: true,
      idempotent: false,
      revision: this.revision,
      data: this.snapshotCache,
    };
  }

  async resetAllData(): Promise<ConnectifySaveDataV1> {
    await this.driver.clearAll();
    const fresh = createDefaultSaveDataV1();
    const envelope = createEnvelope(fresh, 1);
    this.driver.commitAtomicEnvelope(envelope);
    this.state = fresh;
    this.revision = 1;
    this.hydrateKeySet();
    this.initialized = true;
    this.bootReport = {
      source: 'fresh_install',
      recoveredFromCorruption: false,
      revision: 1,
    };
    this.emit();
    return this.snapshotCache;
  }
}
