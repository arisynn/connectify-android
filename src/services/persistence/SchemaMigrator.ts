/**
 * Schema Versioning, Legacy `connectify-new` Importer & Forward Migration Pipeline
 * Owned by: @data-eng
 */

import {
  CURRENT_SCHEMA_VERSION,
  type ConnectifySaveDataV1,
  type GameModeProgressionState,
  type SaveEnvelopeV1,
} from '../../types/persistence.types';
import { getTodayKey, getWeekKey } from '../../utils/time';
import { createEnvelope } from './ChecksumEngine';
import type { StorageDriver } from './StorageDriver';

export interface SchemaMigration<From = unknown, To = unknown> {
  fromVersion: number;
  toVersion: number;
  migrate(oldData: From): To;
}

const MIGRATION_REGISTRY: Record<number, SchemaMigration> = {};

function generatePlayerUuid(): string {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Returns WIB (UTC+7) YYYY-MM-DD key using shared time helper.
 */
export function getWibDateKey(nowMs = Date.now()): string {
  return getTodayKey(nowMs);
}

export function getWibWeekKey(nowMs = Date.now()): string {
  return getWeekKey(nowMs);
}

function createEmptyProgression(gameId: 'onet' | 'match3'): GameModeProgressionState {
  return {
    gameId,
    currentLevel: 1,
    highestUnlockedLevel: 1,
    totalStars: 0,
    allTimeHighScore: 0,
    skillRating: 50,
    levels: {},
  };
}

export function createDefaultSaveDataV1(nowMs = Date.now()): ConnectifySaveDataV1 {
  const todayKey = getWibDateKey(nowMs);
  const weekKey = getWibWeekKey(nowMs);

  return {
    profile: {
      playerId: generatePlayerUuid(),
      playerName: 'Player',
      avatarId: 'avatar_male',
      avatarBackground: '#bde0fe',
      frameId: null,
      xp: 0,
      level: 1,
      rankTitle: 'Teman Baru',
      coins: 25,
      lifetimeCoinsEarned: 25,
      lifetimeCoinsSpent: 0,
      currentWinStreak: 0,
      bestWinStreak: 0,
      loginStreak: {
        lastClaimedDate: null,
        lastCheckInDate: null,
        currentStreak: 0,
        bestStreak: 0,
        totalLoginDays: 0,
      },
      dailyEconomy: {
        dateKey: todayKey,
        coinsEarnedToday: 0,
        levelCompletionCountsToday: {},
      },
      createdAt: nowMs,
      lastActiveAt: nowMs,
    },
    progression: {
      onet: createEmptyProgression('onet'),
      match3: createEmptyProgression('match3'),
    },
    activeSession: {
      onet: null,
      match3: null,
      lastPlayedGame: 'onet',
    },
    inventory: {
      unlockedThemes: ['sweets', 'meadow'],
      unseenThemes: [],
      equippedThemes: {
        globalThemeId: 'sweets',
        onetThemeOverride: null,
        match3ThemeOverride: null,
      },
      ownedCosmetics: [
        'tile1_pearl',
        'tile2_pearl',
        'tile4_pearl',
        'tilepack_pearl',
        'arrow_pearl',
        'block_pearl',
        'effect_blossom',
      ],
      equippedCosmetics: {
        tile1: 'tile1_pearl',
        tile2: 'tile2_pearl',
        tile4: 'tile4_pearl',
        arrow: 'arrow_pearl',
        block: 'block_pearl',
        effect: 'effect_blossom',
        onetAnimation: null,
        match3Animation: null,
        frame: null,
      },
      unlockedAvatars: ['avatar_male', 'avatar_female'],
      boosters: {
        hint: 3,
        shuffle: 3,
        hammer: 3,
        bomb: 2,
        extra_time: 2,
        extra_moves: 2,
        color_burst: 1,
      },
    },
    achievements: {
      claimedTiers: {},
      claimHistory: {},
    },
    dailyChallenges: {
      dailyDateKey: todayKey,
      weeklyPeriodKey: weekKey,
      dailyMissions: [],
      dailyAllCompletedBonusClaimed: false,
      weeklyMissions: [],
      unclaimedArchive: [],
      dailyPuzzle: {
        dateKey: todayKey,
        onetCompleted: false,
        onetScore: 0,
        match3Completed: false,
        match3Score: 0,
      },
    },
    settings: {
      audio: {
        muteMusic: false,
        muteSfx: false,
        musicVolume: 60,
        sfxVolume: 85,
      },
      haptics: {
        enabled: true,
        intensity: 'medium',
      },
      display: {
        darkMode: false,
        reducedMotion: false,
        highContrastTiles: false,
        showTimerWarning: true,
        showHintPromptAfterIdleSec: 12,
      },
      locale: 'id-ID',
    },
    statistics: {
      totalGamesPlayed: 0,
      totalWins: 0,
      totalLosses: 0,
      totalScore: 0,
      highestSingleScore: 0,
      highestCombo: 0,
      totalPlayTimeMs: 0,
      totalFlawlessWins: 0,
      totalDailyMissionsCompleted: 0,
      totalWeeklyMissionsCompleted: 0,
      totalDailyChallengesWon: 0,
      totalThemesUnlocked: 2,
      totalBoostersUsed: 0,
      onet: {
        gamesPlayed: 0,
        wins: 0,
        highScore: 0,
        bestCombo: 0,
        totalPairsMatched: 0,
        totalSplits: 0,
        totalPlayTimeMs: 0,
        speedrunWinsUnder45s: 0,
        survivorWinsOver50PctTime: 0,
        nearDeathWinsUnder1s: 0,
        hintsUsed: 0,
        shufflesUsed: 0,
      },
      match3: {
        gamesPlayed: 0,
        wins: 0,
        highScore: 0,
        bestCombo: 0,
        totalTilesCleared: 0,
        totalCascades: 0,
        specialTilesCreated: 0,
        specialCombosTriggered: 0,
        blockersCleared: 0,
        totalPlayTimeMs: 0,
        boostersUsed: 0,
      },
    },
    transactionLog: {
      processedKeys: ['starter_grant_v1'],
      ledger: [
        {
          id: 'starter_grant_v1',
          idempotencyKey: 'starter_grant_v1',
          amount: 25,
          balanceAfter: 25,
          source: 'STARTER_GRANT',
          label: 'Bonus Pemain Baru',
          timestampIso: new Date(nowMs).toISOString(),
          timestampMs: nowMs,
        },
      ],
    },
  };
}

export class SchemaMigrator {
  /**
   * Attempts to import legacy settings & backup payloads from `connectify-new`
   * if present in browser localStorage.
   */
  static tryImportLegacyConnectifyNew(driver?: StorageDriver): ConnectifySaveDataV1 | null {
    if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
      return null;
    }

    try {
      const ls = globalThis.localStorage;
      const legacyName = ls.getItem('pkmnPlayerName');
      const legacyAudioRaw = ls.getItem('sweetConnectAudioSettings');
      const legacyDark = ls.getItem('connectify-dark');
      const legacyBackupRaw = legacyName ? ls.getItem(`SC_BACKUP_${legacyName}`) : null;
      const legacySaveRaw = ls.getItem('sweetConnectSave');

      if (!legacyName && !legacyAudioRaw && !legacyDark && !legacyBackupRaw && !legacySaveRaw) {
        return null;
      }

      const data = createDefaultSaveDataV1();

      if (legacyName && legacyName.trim()) {
        data.profile.playerName = legacyName.trim().slice(0, 24);
      }

      if (legacyDark === 'true') {
        data.settings.display.darkMode = true;
      }

      if (legacyAudioRaw) {
        try {
          const audio = JSON.parse(legacyAudioRaw);
          if (typeof audio.muteMusic === 'boolean') data.settings.audio.muteMusic = audio.muteMusic;
          if (typeof audio.muteSfx === 'boolean') data.settings.audio.muteSfx = audio.muteSfx;
          if (Number.isFinite(audio.musicVol)) {
            data.settings.audio.musicVolume = Math.min(100, Math.max(0, Number(audio.musicVol)));
          }
          if (Number.isFinite(audio.sfxVol)) {
            data.settings.audio.sfxVolume = Math.min(100, Math.max(0, Number(audio.sfxVol)));
          }
        } catch {
          // Ignore malformed legacy audio JSON
        }
      }

      const rawGamePayload = legacyBackupRaw || legacySaveRaw;
      if (rawGamePayload) {
        try {
          if (driver) {
            driver.writeRawSlot('PRE_MIGRATION_BACKUP', rawGamePayload);
          }
          const parsed = JSON.parse(rawGamePayload);
          const gameData = parsed?.gameData && typeof parsed.gameData === 'object' ? parsed.gameData : parsed;
          if (gameData && typeof gameData === 'object') {
            const legacyCoins = Number(gameData.permen ?? gameData.coins);
            if (Number.isFinite(legacyCoins) && legacyCoins > 0) {
              data.profile.coins = Math.floor(legacyCoins);
              data.profile.lifetimeCoinsEarned = Math.max(data.profile.lifetimeCoinsEarned, data.profile.coins);
            }
            if (Number.isFinite(gameData.accountXP) && gameData.accountXP > 0) {
              data.profile.xp = Math.floor(gameData.accountXP);
            }
            const highestOnet = Number(gameData.highestLevel);
            if (Number.isInteger(highestOnet) && highestOnet >= 1) {
              data.progression.onet.highestUnlockedLevel = highestOnet;
              data.progression.onet.currentLevel = Math.min(
                highestOnet,
                Math.max(1, Number(gameData.currentLevel) || highestOnet),
              );
            }
            if (Array.isArray(gameData.unlockedThemes)) {
              const validThemes = gameData.unlockedThemes.filter((t: unknown): t is string => typeof t === 'string');
              data.inventory.unlockedThemes = Array.from(new Set([...data.inventory.unlockedThemes, ...validThemes]));
            }
            if (typeof gameData.activeTheme === 'string' && data.inventory.unlockedThemes.includes(gameData.activeTheme)) {
              data.inventory.equippedThemes.globalThemeId = gameData.activeTheme;
            }
            if (Number.isInteger(gameData.hints) && gameData.hints >= 0) data.inventory.boosters.hint = gameData.hints;
            if (Number.isInteger(gameData.shuffles) && gameData.shuffles >= 0) data.inventory.boosters.shuffle = gameData.shuffles;
            if (Number.isInteger(gameData.hammers) && gameData.hammers >= 0) data.inventory.boosters.hammer = gameData.hammers;
            if (Number.isInteger(gameData.bombs) && gameData.bombs >= 0) data.inventory.boosters.bomb = gameData.bombs;
            if (gameData.achievements && typeof gameData.achievements === 'object') {
              for (const [achId, tier] of Object.entries(gameData.achievements)) {
                if (typeof tier === 'number' && tier >= 0) {
                  data.achievements.claimedTiers[achId] = Math.floor(tier);
                }
              }
            }
          }
        } catch {
          // Ignore malformed legacy save
        }
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Runs registered forward migrations if a loaded envelope has an older schemaVersion.
   */
  static migrateEnvelopeIfNeeded(rawEnvelope: unknown, driver?: StorageDriver): SaveEnvelopeV1 | null {
    if (!rawEnvelope || typeof rawEnvelope !== 'object') return null;
    const env = rawEnvelope as { schemaVersion?: number; revision?: number; data?: unknown };
    if (typeof env.schemaVersion !== 'number' || !env.data) return null;

    if (env.schemaVersion === CURRENT_SCHEMA_VERSION) {
      return env as SaveEnvelopeV1;
    }

    if (driver) {
      try {
        driver.writeRawSlot('PRE_MIGRATION_BACKUP', JSON.stringify(rawEnvelope));
      } catch {
        // Best-effort backup
      }
    }

    let version = env.schemaVersion;
    let currentData: unknown = env.data;
    while (version < CURRENT_SCHEMA_VERSION) {
      const migration = MIGRATION_REGISTRY[version];
      if (!migration) return null;
      currentData = migration.migrate(currentData);
      version = migration.toVersion;
    }

    return createEnvelope(currentData as ConnectifySaveDataV1, Math.max(1, Number(env.revision) || 1));
  }
}
