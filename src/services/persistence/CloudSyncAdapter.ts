/**
 * Optional Cloud Sync Hook Interface (Disabled by Default, Never Blocks Offline Boot)
 * Owned by: @data-eng
 */

import type { SaveEnvelopeV1 } from '../../types/persistence.types';

export interface CloudSyncReceipt {
  syncedAt: number;
  remoteRevision: number;
}

export interface ICloudSyncAdapter {
  readonly isConfigured: boolean;
  pushSnapshot(envelope: SaveEnvelopeV1): Promise<CloudSyncReceipt | null>;
  pullSnapshot(): Promise<SaveEnvelopeV1 | null>;
}

/**
 * Default no-op cloud adapter for 100% offline-first Android APK builds.
 */
export class DisabledCloudSyncAdapter implements ICloudSyncAdapter {
  readonly isConfigured = false;

  async pushSnapshot(_envelope: SaveEnvelopeV1): Promise<CloudSyncReceipt | null> {
    return null;
  }

  async pullSnapshot(): Promise<SaveEnvelopeV1 | null> {
    return null;
  }
}
