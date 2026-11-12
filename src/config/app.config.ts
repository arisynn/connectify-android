/**
 * Centralized application metadata & game registry configuration.
 * Owned by @architect. Strictly scoped to Onet and Match 3.
 */

import type { BoosterId, GameId } from '@/types/game.types';

export interface GameMetadata {
  id: GameId;
  name: string;
  eyebrow: string;
  tagline: string;
  description: string;
  iconAsset: string;
  accentColor: string;
  softColor: string;
  paperColor: string;
  inkColor: string;
  coverSprites: string[];
  supportedBoosters: BoosterId[];
  dailyChallengeLabel: string;
}

export const APP_CONFIG = {
  appId: 'com.connectify.android',
  appName: 'Connectify',
  subtitle: 'Onet & Match 3 Puzzle Club',
  currencyName: 'Permen',
  currencyPlural: 'Permen',
  currencyIconAsset: '/art/premium/ui/permen.webp',
  defaultThemeId: 'sweets',
  freeThemeIds: ['sweets', 'meadow'] as const,
  backgroundColor: '#fffaf5',
  darkBackgroundColor: '#101b2b',
  supportedGames: ['onet', 'match3'] as readonly GameId[],
} as const;

export const GAME_IDS: readonly GameId[] = ['onet', 'match3'];

export const GAME_METADATA: Record<GameId, GameMetadata> = {
  onet: {
    id: 'onet',
    name: 'Onet Connect',
    eyebrow: 'PASANGKAN · PECAHKAN · BERSIHKAN',
    tagline: 'Dua gambar, satu jalur.',
    description:
      'Hubungkan pasangan tile dengan maksimal 2 belokan. Tile besar pecah menjadi pasangan baru!',
    iconAsset: '/art/premium/ui/onet.webp',
    accentColor: '#ff7a9c',
    softColor: '#ffd3df',
    paperColor: '#fff0f3',
    inkColor: '#3a1f2b',
    coverSprites: [
      '/art/premium/sakura/0.webp',
      '/art/premium/sakura/3.webp',
      '/art/premium/sakura/8.webp',
      '/art/premium/sakura/14.webp',
    ],
    supportedBoosters: ['hint', 'shuffle', 'extra_time'],
    dailyChallengeLabel: 'Onet Sprint · 90 Detik',
  },
  match3: {
    id: 'match3',
    name: 'Match 3',
    eyebrow: 'GESER · PADUKAN · LEDAKKAN',
    tagline: 'Tiga atau lebih jadi kejutan.',
    description:
      'Geser tile untuk menyusun 3+ gambar, ciptakan bom spesial, dan selesaikan target tiap level.',
    iconAsset: '/art/premium/ui/triple.webp',
    accentColor: '#38c189',
    softColor: '#c9f2dd',
    paperColor: '#eefaf2',
    inkColor: '#14332a',
    coverSprites: [
      '/art/premium/bakery/1.webp',
      '/art/premium/bakery/4.webp',
      '/art/premium/bakery/9.webp',
      '/art/premium/bakery/12.webp',
    ],
    supportedBoosters: ['hint', 'shuffle', 'hammer', 'bomb'],
    dailyChallengeLabel: 'Match 3 Harian · Papan Spesial',
  },
};
