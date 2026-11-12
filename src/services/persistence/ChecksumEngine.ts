/**
 * Deterministic Synchronous Integrity Checksum & Envelope Validator
 * Owned by: @data-eng
 */

import {
  CURRENT_SCHEMA_VERSION,
  SAVE_MAGIC,
  type ConnectifySaveDataV1,
  type SaveEnvelopeV1,
} from '../../types/persistence.types';

const CHECKSUM_SALT = 'CONNECTIFY_ANDROID_V1_SALT';

/**
 * Deterministic canonical JSON serialization with sorted keys so object key insertion
 * order never invalidates integrity checksums.
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => (item === undefined ? 'null' : canonicalizeJson(item))).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const parts: string[] = [];
  for (const key of keys) {
    const val = obj[key];
    if (val === undefined) continue;
    parts.push(`${JSON.stringify(key)}:${canonicalizeJson(val)}`);
  }
  return `{${parts.join(',')}}`;
}

/**
 * Computes a fast, synchronous dual 32-bit (64-bit hex) FNV-1a + Murmur-mix digest.
 * Safe for synchronous lifecycle flush (`pagehide` / Android `pause`) and Node/Vitest.
 */
export function computeChecksum(schemaVersion: number, revision: number, data: unknown): string {
  const payload = `${schemaVersion}:${revision}:${canonicalizeJson(data)}:${CHECKSUM_SALT}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ ch, 0x5bd1e995);
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `fnv1a64:${hex1}${hex2}`;
}

export function createEnvelope(
  data: ConnectifySaveDataV1,
  revision: number,
  updatedAt = Date.now(),
): SaveEnvelopeV1 {
  const checksum = computeChecksum(CURRENT_SCHEMA_VERSION, revision, data);
  return {
    magic: SAVE_MAGIC,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    revision,
    updatedAt,
    checksum,
    data,
  };
}

export function isValidSaveDataShape(data: unknown): data is ConnectifySaveDataV1 {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  const d = data as Partial<ConnectifySaveDataV1>;
  if (!d.profile || typeof d.profile !== 'object') return false;
  if (typeof d.profile.playerId !== 'string' || !d.profile.playerId) return false;
  if (!Number.isInteger(d.profile.coins) || d.profile.coins < 0) return false;
  if (!Number.isFinite(d.profile.xp) || d.profile.xp < 0) return false;
  if (!d.progression || !d.progression.onet || !d.progression.match3) return false;
  if (d.progression.onet.highestUnlockedLevel < 1 || d.progression.match3.highestUnlockedLevel < 1) {
    return false;
  }
  if (!d.inventory || !Array.isArray(d.inventory.unlockedThemes)) return false;
  if (!d.settings || !d.settings.audio || !d.settings.haptics || !d.settings.display) return false;
  if (!d.transactionLog || !Array.isArray(d.transactionLog.processedKeys)) return false;
  return true;
}

export function parseAndVerifyEnvelope(raw: string | null | undefined): SaveEnvelopeV1 | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SaveEnvelopeV1>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.magic !== SAVE_MAGIC) return null;
    if (parsed.schemaVersion !== CURRENT_SCHEMA_VERSION) return null;
    if (!Number.isInteger(parsed.revision) || (parsed.revision as number) < 1) return null;
    if (typeof parsed.checksum !== 'string' || !parsed.checksum.startsWith('fnv1a64:')) return null;
    if (!isValidSaveDataShape(parsed.data)) return null;

    const expected = computeChecksum(parsed.schemaVersion, parsed.revision as number, parsed.data);
    if (expected !== parsed.checksum) return null;

    return parsed as SaveEnvelopeV1;
  } catch {
    return null;
  }
}
