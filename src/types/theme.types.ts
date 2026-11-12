/**
 * Visual Theme, Tile Catalog & Cosmetic Type Contracts
 * Owned by @art-director
 */

import type { GameId } from './game.types';

export type ThemeRarity = 'starter' | 'milestone' | 'common' | 'rare' | 'epic';

export type ThemeUnlockMethod =
  | { type: 'free' }
  | { type: 'coins'; price: number }
  | {
      type: 'milestone';
      label: string;
      ruleType: 'level_any' | 'achievements' | 'login_streak';
      target: number;
    };

export type ThemeAudioTimbre = 'triangle' | 'sine' | 'square';

export interface ThemeSoundPairing {
  presetName: string;
  timbre: ThemeAudioTimbre;
  semitoneOffset: number;
  echoMix: number;
}

export interface ThemeColorPalette {
  backgroundMain: string;
  backgroundBoard: string;
  backgroundTile: string;
  tileBorder: string;
  tileSelected: string;
  tileHint: string;
  textPrimary: string;
  textSecondary: string;
  accentPrimary: string;
  accentSecondary: string;
  darkBackgroundMain: string;
  darkBackgroundBoard: string;
  darkBackgroundTile: string;
  darkTileBorder: string;
}

export interface ThemePreviewMetadata {
  tagline: string;
  badgeText?: string;
  preview4Indices: [number, number, number, number];
  recommendedAvatarId: string;
  recommendedFrameId: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  rarity: ThemeRarity;
  unlock: ThemeUnlockMethod;
  isDarkSurface: boolean;
  /** Ordered list of all tile asset URLs (10, 15, or 16 items) */
  tileUrls: string[];
  /** Curated 6 silhouette-distinct indices into tileUrls for Match 3 levels */
  match3TileIndices: [number, number, number, number, number, number];
  defaultSurfaceId: string;
  defaultEffectId: string;
  palette: ThemeColorPalette;
  soundPairing: ThemeSoundPairing;
  preview: ThemePreviewMetadata;
  supportedGames: readonly GameId[];
}

export interface SurfaceSkinItem {
  id: string;
  name: string;
  category: 'surface' | 'tile_pack' | 'arrow_skin';
  rarity: ThemeRarity;
  priceCoins: number;
  assetUrl: string;
  trayTint: string;
  isMilestoneReward?: boolean;
}

export interface EffectCosmeticItem {
  id: string;
  name: string;
  rarity: ThemeRarity;
  priceCoins: number;
  particleUrl: string;
  accentHex: string;
  animationStyle: 'drift' | 'orbit' | 'pop' | 'bloom';
  isStarterFree?: boolean;
}

export interface AvatarItem {
  id: string;
  name: string;
  assetUrl: string;
  rarity: ThemeRarity;
  unlock: ThemeUnlockMethod;
  defaultBgColor: string;
}

export interface AvatarFrameItem {
  id: string;
  name: string;
  assetUrl: string;
  rarity: ThemeRarity;
  priceCoins: number;
}

export interface ArtRewardUnlockItem {
  id: string;
  targetType: 'theme' | 'avatar' | 'surface';
  name: string;
  ruleType: 'level_any' | 'achievements' | 'login_streak' | 'total_wins';
  threshold: number;
  description: string;
  previewUrl: string;
}

export type ThemeEquipScope = 'both' | 'onet' | 'match3';
