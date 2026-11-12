/**
 * Dual-Layer Storage Driver:
 *  - Synchronous 3-slot atomic rotation in localStorage (WAL -> Backup -> Primary)
 *  - Fast-path active game session slot
 *  - Asynchronous IndexedDB mirror (ConnectifyLocalDB) for deep redundancy
 * Owned by: @data-eng
 */

import type { ActiveGameSession, GameModeId, SaveEnvelopeV1 } from '../../types/persistence.types';

export const STORAGE_KEYS = {
  PRIMARY: 'connectify.v1.primary',
  BACKUP: 'connectify.v1.backup',
  WAL: 'connectify.v1.wal',
  SESSION: 'connectify.v1.session',
  PRE_MIGRATION_BACKUP: 'connectify.pre_migration_backup',
} as const;

const IDB_NAME = 'ConnectifyLocalDB';
const IDB_VERSION = 1;
const IDB_STORE = 'snapshots';
const IDB_SNAPSHOT_KEY = 'authoritative_v1';

export interface KeyValueStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class InMemoryStorageAdapter implements KeyValueStorageAdapter {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

function resolveDefaultKV(): KeyValueStorageAdapter {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      const testKey = '__connectify_kv_probe__';
      globalThis.localStorage.setItem(testKey, '1');
      globalThis.localStorage.removeItem(testKey);
      return globalThis.localStorage;
    }
  } catch {
    // Fall back to in-memory storage in restricted environments or headless Node tests
  }
  return new InMemoryStorageAdapter();
}

export class StorageDriver {
  private kv: KeyValueStorageAdapter;
  private idbAvailable: boolean;
  private idbPromise: Promise<IDBDatabase | null> | null = null;

  constructor(customKv?: KeyValueStorageAdapter) {
    this.kv = customKv ?? resolveDefaultKV();
    this.idbAvailable = typeof globalThis !== 'undefined' && 'indexedDB' in globalThis && !!globalThis.indexedDB;
  }

  readRawSlot(slot: keyof typeof STORAGE_KEYS): string | null {
    try {
      return this.kv.getItem(STORAGE_KEYS[slot]);
    } catch {
      return null;
    }
  }

  writeRawSlot(slot: keyof typeof STORAGE_KEYS, raw: string): void {
    this.kv.setItem(STORAGE_KEYS[slot], raw);
  }

  removeSlot(slot: keyof typeof STORAGE_KEYS): void {
    try {
      this.kv.removeItem(STORAGE_KEYS[slot]);
    } catch {
      // Ignore removal failures on restricted storage
    }
  }

  /**
   * 5-step atomic Write-Ahead Backup commit:
   * 1. Write new envelope to WAL slot
   * 2. Rotate current verified Primary -> Backup
   * 3. Write new envelope to Primary slot
   * 4. Clear WAL slot
   * 5. Mirror asynchronously to IndexedDB
   */
  commitAtomicEnvelope(envelope: SaveEnvelopeV1): void {
    const serialized = JSON.stringify(envelope);

    // Step 1: Write-Ahead Log intent
    this.kv.setItem(STORAGE_KEYS.WAL, serialized);

    // Step 2: Rotate existing Primary to Backup if present
    const existingPrimary = this.readRawSlot('PRIMARY');
    if (existingPrimary) {
      this.kv.setItem(STORAGE_KEYS.BACKUP, existingPrimary);
    }

    // Step 3: Commit Primary
    this.kv.setItem(STORAGE_KEYS.PRIMARY, serialized);

    // Step 4: Clear WAL
    this.removeSlot('WAL');

    // Step 5: Async mirror to IndexedDB (non-blocking)
    void this.mirrorToIndexedDB(serialized);
  }

  /**
   * High-frequency active session fast-path slot so every tile match/swap does not
   * need to re-serialize the entire transaction ledger.
   */
  writeFastSession(sessions: Record<GameModeId, ActiveGameSession | null>): void {
    try {
      this.kv.setItem(STORAGE_KEYS.SESSION, JSON.stringify(sessions));
    } catch {
      // Non-fatal if quota is tight; main envelope still holds latest checkpoint
    }
  }

  readFastSession(): Partial<Record<GameModeId, ActiveGameSession | null>> | null {
    const raw = this.readRawSlot('SESSION');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  private openIndexedDB(): Promise<IDBDatabase | null> {
    if (!this.idbAvailable) return Promise.resolve(null);
    if (this.idbPromise) return this.idbPromise;

    this.idbPromise = new Promise((resolve) => {
      try {
        const request = globalThis.indexedDB.open(IDB_NAME, IDB_VERSION);
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE, { keyPath: 'id' });
          }
        };
        request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
        request.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return this.idbPromise;
  }

  async mirrorToIndexedDB(serializedEnvelope: string): Promise<void> {
    const db = await this.openIndexedDB();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction([IDB_STORE], 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put({ id: IDB_SNAPSHOT_KEY, raw: serializedEnvelope, savedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }

  async readFromIndexedDB(): Promise<string | null> {
    const db = await this.openIndexedDB();
    if (!db) return null;
    return new Promise<string | null>((resolve) => {
      try {
        const tx = db.transaction([IDB_STORE], 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(IDB_SNAPSHOT_KEY);
        req.onsuccess = () => resolve(req.result?.raw ?? null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  async clearAll(): Promise<void> {
    this.removeSlot('WAL');
    this.removeSlot('PRIMARY');
    this.removeSlot('BACKUP');
    this.removeSlot('SESSION');
    const db = await this.openIndexedDB();
    if (!db) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction([IDB_STORE], 'readwrite');
        tx.objectStore(IDB_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
}
