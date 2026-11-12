/**
 * Centralized Match 3 Gameplay Configuration, Manual Levels (1-20),
 * 4-Band Sawtooth Curve Parameters, DDA Settings & Scoring Constants.
 * Owned by @match3-eng.
 */

import type { DdaBracket, DifficultyBand, GridCoord } from '@/types/game.types';
import type { Match3Objective, ObstacleType } from '@/types/match3.types';

export const MATCH3_SCORING_CONFIG = {
  baseTilePoints: 50,
  specialCreationBonus: {
    none: 0,
    striped_h: 100,
    striped_v: 100,
    bomb_3x3: 200,
    rainbow: 350,
  } as const,
  specialDetonationBonus: 150,
  specialComboBonus: {
    line_line: 350,
    line_bomb: 600,
    bomb_bomb: 500,
    rainbow_color: 400,
    rainbow_line: 900,
    rainbow_bomb: 1000,
    rainbow_rainbow: 1500,
  } as const,
  blastedTilePoints: 60,
  gemCollectedBonus: 150,
  unusedMoveBonus: 200,
  cascadeMultiplierStep: 0.25,
  cascadeMultiplierMax: 4.0,
  moveStreakBonusPerChain: 25,
  maxCascadeIterations: 25,
  idleHintDelayMs: 6500,
} as const;

export const MATCH3_DDA_CONFIG = {
  skillEmaAlpha: 0.3,
  defaultSkill: 50,
  easyMaxSkill: 40,
  normalMaxSkill: 70,
  pityFailThreshold: 3,
} as const;

export interface Match3ColorToken {
  index: number;
  label: string;
  tintBg: string;
  tintBorder: string;
  glow: string;
}

export const MATCH3_COLOR_TOKENS: readonly Match3ColorToken[] = [
  { index: 0, label: 'Merah', tintBg: '#FFE5EC', tintBorder: '#FF6B8A', glow: 'rgba(255, 107, 138, 0.45)' },
  { index: 1, label: 'Biru', tintBg: '#E0F2FE', tintBorder: '#38BDF8', glow: 'rgba(56, 189, 248, 0.45)' },
  { index: 2, label: 'Hijau', tintBg: '#DCFCE7', tintBorder: '#34D399', glow: 'rgba(52, 211, 153, 0.45)' },
  { index: 3, label: 'Kuning', tintBg: '#FEF3C7', tintBorder: '#FBBF24', glow: 'rgba(251, 191, 36, 0.45)' },
  { index: 4, label: 'Ungu', tintBg: '#F3E8FF', tintBorder: '#A78BFA', glow: 'rgba(167, 139, 250, 0.45)' },
  { index: 5, label: 'Oranye', tintBg: '#FFEDD5', tintBorder: '#FB923C', glow: 'rgba(251, 146, 60, 0.45)' },
] as const;

export const MATCH3_FALLBACK_TILE_POOL: readonly string[] = [
  '/art/candy/0.webp',
  '/art/candy/1.webp',
  '/art/candy/2.webp',
  '/art/candy/3.webp',
  '/art/candy/4.webp',
  '/art/candy/5.webp',
];

export interface Match3ManualLevelBlueprint {
  level: number;
  rows: number;
  cols: number;
  tileColorCount: 4 | 5 | 6;
  maxMoves: number;
  missions: [Match3Objective, Match3Objective, Match3Objective];
  starScoreThresholds: [number, number, number];
  holes: GridCoord[];
  obstacles: { r: number; c: number; type: ObstacleType }[];
}

export function resolveMatch3DifficultyBand(level: number): DifficultyBand {
  const safe = Math.max(1, Math.floor(level));
  if (safe <= 10) return 'onboarding';
  if (safe <= 30) return 'intermediate';
  if (safe <= 60) return 'advanced';
  return 'expert';
}

export function resolveMatch3DdaBracket(
  skillRating: number,
  consecutiveFailures: number,
): DdaBracket {
  if (consecutiveFailures >= MATCH3_DDA_CONFIG.pityFailThreshold) return 'pity';
  if (skillRating < MATCH3_DDA_CONFIG.easyMaxSkill) return 'easy';
  if (skillRating >= MATCH3_DDA_CONFIG.normalMaxSkill) return 'hard';
  return 'normal';
}

/**
 * Handcrafted Levels 1-20 following LEVEL_DIFFICULTY_PLAN.md:
 * - L1-4: 7x7, 4 colors (Score -> Collect Tiles)
 * - L5-10: 8x8, 4 colors (Collect -> Ice -> Wood Crates -> Boss L10)
 * - L11-20: 8x8, 5 colors (Breather L11 & L16, Shaped cutouts, Gems L15+, Boss L20)
 */
export const MATCH3_MANUAL_LEVELS: Record<number, Match3ManualLevelBlueprint> = {
  1: {
    level: 1,
    rows: 7,
    cols: 7,
    tileColorCount: 4,
    maxMoves: 30,
    missions: [
      { type: 'score', target: 1800, description: 'Raih 1.800 skor' },
      { type: 'create_specials', target: 1, description: 'Buat 1 tile spesial' },
      { type: 'score', target: 3200, description: 'Raih 3.200 skor' },
    ],
    starScoreThresholds: [1800, 2600, 3400],
    holes: [],
    obstacles: [],
  },
  2: {
    level: 2,
    rows: 7,
    cols: 7,
    tileColorCount: 4,
    maxMoves: 28,
    missions: [
      { type: 'score', target: 2400, description: 'Raih 2.400 skor' },
      { type: 'clear_tiles', target: 45, description: 'Hapus 45 tile' },
      { type: 'create_specials', target: 2, description: 'Buat 2 tile spesial' },
    ],
    starScoreThresholds: [2400, 3300, 4200],
    holes: [],
    obstacles: [],
  },
  3: {
    level: 3,
    rows: 7,
    cols: 7,
    tileColorCount: 4,
    maxMoves: 28,
    missions: [
      { type: 'collect_color', colorIndex: 0, target: 24, description: 'Kumpulkan 24 tile Merah' },
      { type: 'score', target: 2800, description: 'Raih 2.800 skor' },
      { type: 'create_specials', target: 2, description: 'Buat 2 tile spesial' },
    ],
    starScoreThresholds: [2600, 3600, 4600],
    holes: [],
    obstacles: [],
  },
  4: {
    level: 4,
    rows: 7,
    cols: 7,
    tileColorCount: 4,
    maxMoves: 26,
    missions: [
      { type: 'collect_color', colorIndex: 1, target: 26, description: 'Kumpulkan 26 tile Biru' },
      { type: 'score', target: 3200, description: 'Raih 3.200 skor' },
      { type: 'create_specials', target: 3, description: 'Buat 3 tile spesial' },
    ],
    starScoreThresholds: [2800, 3900, 5000],
    holes: [],
    obstacles: [],
  },
  5: {
    level: 5,
    rows: 8,
    cols: 8,
    tileColorCount: 4,
    maxMoves: 26,
    missions: [
      { type: 'collect_color', colorIndex: 2, target: 32, description: 'Kumpulkan 32 tile Hijau' },
      { type: 'score', target: 3600, description: 'Raih 3.600 skor' },
      { type: 'create_specials', target: 3, description: 'Buat 3 tile spesial' },
    ],
    starScoreThresholds: [3200, 4400, 5600],
    holes: [],
    obstacles: [],
  },
  6: {
    level: 6,
    rows: 8,
    cols: 8,
    tileColorCount: 4,
    maxMoves: 27,
    missions: [
      { type: 'destroy_ice', target: 6, description: 'Pecahkan 6 lapisan Es' },
      { type: 'score', target: 3400, description: 'Raih 3.400 skor' },
      { type: 'create_specials', target: 2, description: 'Buat 2 tile spesial' },
    ],
    starScoreThresholds: [3000, 4200, 5400],
    holes: [],
    obstacles: [
      { r: 2, c: 2, type: 'ice' },
      { r: 2, c: 5, type: 'ice' },
      { r: 3, c: 3, type: 'ice' },
      { r: 3, c: 4, type: 'ice' },
      { r: 4, c: 3, type: 'ice' },
      { r: 4, c: 4, type: 'ice' },
    ],
  },
  7: {
    level: 7,
    rows: 8,
    cols: 8,
    tileColorCount: 4,
    maxMoves: 26,
    missions: [
      { type: 'destroy_ice', target: 8, description: 'Pecahkan 8 lapisan Es' },
      { type: 'score', target: 3800, description: 'Raih 3.800 skor' },
      { type: 'create_specials', target: 3, description: 'Buat 3 tile spesial' },
    ],
    starScoreThresholds: [3400, 4600, 5800],
    holes: [],
    obstacles: [
      { r: 1, c: 3, type: 'ice' },
      { r: 1, c: 4, type: 'ice' },
      { r: 3, c: 1, type: 'ice' },
      { r: 3, c: 6, type: 'ice' },
      { r: 4, c: 1, type: 'ice' },
      { r: 4, c: 6, type: 'ice' },
      { r: 6, c: 3, type: 'ice' },
      { r: 6, c: 4, type: 'ice' },
    ],
  },
  8: {
    level: 8,
    rows: 8,
    cols: 8,
    tileColorCount: 4,
    maxMoves: 26,
    missions: [
      { type: 'destroy_ice', target: 10, description: 'Pecahkan 10 lapisan Es' },
      { type: 'score', target: 4200, description: 'Raih 4.200 skor' },
      { type: 'clear_tiles', target: 75, description: 'Hapus 75 tile' },
    ],
    starScoreThresholds: [3600, 4900, 6200],
    holes: [],
    obstacles: [
      { r: 2, c: 2, type: 'ice' },
      { r: 2, c: 3, type: 'ice' },
      { r: 2, c: 4, type: 'ice' },
      { r: 2, c: 5, type: 'ice' },
      { r: 3, c: 3, type: 'ice' },
      { r: 3, c: 4, type: 'ice' },
      { r: 5, c: 2, type: 'ice' },
      { r: 5, c: 3, type: 'ice' },
      { r: 5, c: 4, type: 'ice' },
      { r: 5, c: 5, type: 'ice' },
    ],
  },
  9: {
    level: 9,
    rows: 8,
    cols: 8,
    tileColorCount: 4,
    maxMoves: 26,
    missions: [
      { type: 'destroy_wood', target: 6, description: 'Hancurkan 6 peti Kayu' },
      { type: 'score', target: 4000, description: 'Raih 4.000 skor' },
      { type: 'create_specials', target: 3, description: 'Buat 3 tile spesial' },
    ],
    starScoreThresholds: [3600, 4900, 6200],
    holes: [],
    obstacles: [
      { r: 2, c: 1, type: 'wood' },
      { r: 2, c: 6, type: 'wood' },
      { r: 3, c: 3, type: 'wood' },
      { r: 3, c: 4, type: 'wood' },
      { r: 5, c: 2, type: 'wood' },
      { r: 5, c: 5, type: 'wood' },
    ],
  },
  10: {
    level: 10,
    rows: 8,
    cols: 8,
    tileColorCount: 4,
    maxMoves: 25,
    missions: [
      { type: 'destroy_wood', target: 8, description: 'Hancurkan 8 peti Kayu' },
      { type: 'destroy_ice', target: 6, description: 'Pecahkan 6 lapisan Es' },
      { type: 'score', target: 4800, description: 'Raih 4.800 skor' },
    ],
    starScoreThresholds: [4000, 5500, 7000],
    holes: [],
    obstacles: [
      { r: 2, c: 2, type: 'wood' },
      { r: 2, c: 5, type: 'wood' },
      { r: 3, c: 2, type: 'ice' },
      { r: 3, c: 3, type: 'wood' },
      { r: 3, c: 4, type: 'wood' },
      { r: 3, c: 5, type: 'ice' },
      { r: 4, c: 2, type: 'ice' },
      { r: 4, c: 3, type: 'wood' },
      { r: 4, c: 4, type: 'wood' },
      { r: 4, c: 5, type: 'ice' },
      { r: 5, c: 2, type: 'wood' },
      { r: 5, c: 5, type: 'wood' },
      { r: 1, c: 3, type: 'ice' },
      { r: 1, c: 4, type: 'ice' },
    ],
  },
  11: {
    level: 11,
    rows: 8,
    cols: 8,
    tileColorCount: 5,
    maxMoves: 28,
    missions: [
      { type: 'score', target: 4200, description: 'Raih 4.200 skor' },
      { type: 'create_specials', target: 3, description: 'Buat 3 tile spesial' },
      { type: 'score', target: 6400, description: 'Raih 6.400 skor' },
    ],
    starScoreThresholds: [4200, 5600, 7000],
    holes: [],
    obstacles: [
      { r: 3, c: 3, type: 'ice' },
      { r: 3, c: 4, type: 'ice' },
      { r: 4, c: 3, type: 'ice' },
      { r: 4, c: 4, type: 'ice' },
    ],
  },
  12: {
    level: 12,
    rows: 8,
    cols: 8,
    tileColorCount: 5,
    maxMoves: 25,
    missions: [
      { type: 'collect_color', colorIndex: 4, target: 30, description: 'Kumpulkan 30 tile Ungu' },
      { type: 'destroy_ice', target: 6, description: 'Pecahkan 6 lapisan Es' },
      { type: 'score', target: 5000, description: 'Raih 5.000 skor' },
    ],
    starScoreThresholds: [4000, 5500, 7000],
    holes: [],
    obstacles: [
      { r: 2, c: 3, type: 'ice' },
      { r: 2, c: 4, type: 'ice' },
      { r: 5, c: 2, type: 'ice' },
      { r: 5, c: 3, type: 'ice' },
      { r: 5, c: 4, type: 'ice' },
      { r: 5, c: 5, type: 'ice' },
    ],
  },
  13: {
    level: 13,
    rows: 8,
    cols: 8,
    tileColorCount: 5,
    maxMoves: 25,
    missions: [
      { type: 'destroy_wood', target: 8, description: 'Hancurkan 8 peti Kayu' },
      { type: 'score', target: 4800, description: 'Raih 4.800 skor' },
      { type: 'create_specials', target: 3, description: 'Buat 3 tile spesial' },
    ],
    starScoreThresholds: [4100, 5600, 7100],
    holes: [],
    obstacles: [
      { r: 1, c: 2, type: 'wood' },
      { r: 1, c: 5, type: 'wood' },
      { r: 3, c: 1, type: 'wood' },
      { r: 3, c: 6, type: 'wood' },
      { r: 4, c: 3, type: 'wood' },
      { r: 4, c: 4, type: 'wood' },
      { r: 6, c: 2, type: 'wood' },
      { r: 6, c: 5, type: 'wood' },
    ],
  },
  14: {
    level: 14,
    rows: 8,
    cols: 8,
    tileColorCount: 5,
    maxMoves: 24,
    missions: [
      { type: 'destroy_ice', target: 10, description: 'Pecahkan 10 lapisan Es' },
      { type: 'score', target: 5000, description: 'Raih 5.000 skor' },
      { type: 'create_specials', target: 3, description: 'Buat 3 tile spesial' },
    ],
    starScoreThresholds: [4200, 5800, 7300],
    holes: [
      { r: 0, c: 0 },
      { r: 0, c: 7 },
      { r: 7, c: 0 },
      { r: 7, c: 7 },
    ],
    obstacles: [
      { r: 2, c: 2, type: 'ice' },
      { r: 2, c: 5, type: 'ice' },
      { r: 3, c: 2, type: 'ice' },
      { r: 3, c: 5, type: 'ice' },
      { r: 4, c: 2, type: 'ice' },
      { r: 4, c: 5, type: 'ice' },
      { r: 5, c: 2, type: 'ice' },
      { r: 5, c: 5, type: 'ice' },
      { r: 3, c: 3, type: 'ice' },
      { r: 4, c: 4, type: 'ice' },
    ],
  },
  15: {
    level: 15,
    rows: 8,
    cols: 8,
    tileColorCount: 5,
    maxMoves: 25,
    missions: [
      { type: 'collect_gems', target: 2, description: 'Kumpulkan 2 Permata' },
      { type: 'score', target: 4600, description: 'Raih 4.600 skor' },
      { type: 'create_specials', target: 3, description: 'Buat 3 tile spesial' },
    ],
    starScoreThresholds: [4000, 5600, 7200],
    holes: [],
    obstacles: [
      { r: 0, c: 2, type: 'gem' },
      { r: 0, c: 5, type: 'gem' },
      { r: 4, c: 2, type: 'wood' },
      { r: 4, c: 5, type: 'wood' },
      { r: 5, c: 3, type: 'ice' },
      { r: 5, c: 4, type: 'ice' },
    ],
  },
  16: {
    level: 16,
    rows: 8,
    cols: 8,
    tileColorCount: 5,
    maxMoves: 26,
    missions: [
      { type: 'collect_gems', target: 3, description: 'Kumpulkan 3 Permata' },
      { type: 'score', target: 4800, description: 'Raih 4.800 skor' },
      { type: 'clear_tiles', target: 85, description: 'Hapus 85 tile' },
    ],
    starScoreThresholds: [4200, 5800, 7400],
    holes: [],
    obstacles: [
      { r: 0, c: 1, type: 'gem' },
      { r: 0, c: 4, type: 'gem' },
      { r: 1, c: 6, type: 'gem' },
      { r: 4, c: 3, type: 'ice' },
      { r: 4, c: 4, type: 'ice' },
    ],
  },
  17: {
    level: 17,
    rows: 8,
    cols: 8,
    tileColorCount: 5,
    maxMoves: 24,
    missions: [
      { type: 'destroy_metal', target: 4, description: 'Hancurkan 4 kotak Besi' },
      { type: 'score', target: 5200, description: 'Raih 5.200 skor' },
      { type: 'create_specials', target: 4, description: 'Buat 4 tile spesial' },
    ],
    starScoreThresholds: [4400, 6000, 7600],
    holes: [],
    obstacles: [
      { r: 2, c: 2, type: 'metal-2' },
      { r: 2, c: 5, type: 'metal-2' },
      { r: 5, c: 2, type: 'metal-2' },
      { r: 5, c: 5, type: 'metal-2' },
      { r: 3, c: 3, type: 'ice' },
      { r: 4, c: 4, type: 'ice' },
    ],
  },
  18: {
    level: 18,
    rows: 8,
    cols: 8,
    tileColorCount: 5,
    maxMoves: 24,
    missions: [
      { type: 'destroy_wood', target: 8, description: 'Hancurkan 8 peti Kayu' },
      { type: 'destroy_metal', target: 2, description: 'Hancurkan 2 kotak Besi' },
      { type: 'score', target: 5400, description: 'Raih 5.400 skor' },
    ],
    starScoreThresholds: [4500, 6100, 7800],
    holes: [
      { r: 0, c: 0 },
      { r: 0, c: 7 },
    ],
    obstacles: [
      { r: 2, c: 1, type: 'wood' },
      { r: 2, c: 6, type: 'wood' },
      { r: 3, c: 3, type: 'metal-2' },
      { r: 3, c: 4, type: 'metal-2' },
      { r: 4, c: 2, type: 'wood' },
      { r: 4, c: 5, type: 'wood' },
      { r: 5, c: 1, type: 'wood' },
      { r: 5, c: 6, type: 'wood' },
      { r: 6, c: 3, type: 'wood' },
      { r: 6, c: 4, type: 'wood' },
    ],
  },
  19: {
    level: 19,
    rows: 8,
    cols: 8,
    tileColorCount: 5,
    maxMoves: 23,
    missions: [
      { type: 'collect_gems', target: 3, description: 'Kumpulkan 3 Permata' },
      { type: 'destroy_ice', target: 8, description: 'Pecahkan 8 lapisan Es' },
      { type: 'score', target: 5600, description: 'Raih 5.600 skor' },
    ],
    starScoreThresholds: [4600, 6300, 8000],
    holes: [],
    obstacles: [
      { r: 0, c: 1, type: 'gem' },
      { r: 0, c: 3, type: 'gem' },
      { r: 0, c: 6, type: 'gem' },
      { r: 3, c: 2, type: 'stone' },
      { r: 3, c: 5, type: 'stone' },
      { r: 4, c: 1, type: 'ice' },
      { r: 4, c: 2, type: 'ice' },
      { r: 4, c: 5, type: 'ice' },
      { r: 4, c: 6, type: 'ice' },
      { r: 5, c: 2, type: 'ice' },
      { r: 5, c: 3, type: 'ice' },
      { r: 5, c: 4, type: 'ice' },
      { r: 5, c: 5, type: 'ice' },
    ],
  },
  20: {
    level: 20,
    rows: 8,
    cols: 8,
    tileColorCount: 5,
    maxMoves: 24,
    missions: [
      { type: 'collect_gems', target: 3, description: 'Kumpulkan 3 Permata' },
      { type: 'destroy_metal', target: 4, description: 'Hancurkan 4 kotak Besi' },
      { type: 'score', target: 6200, description: 'Raih 6.200 skor' },
    ],
    starScoreThresholds: [5000, 6800, 8600],
    holes: [
      { r: 0, c: 0 },
      { r: 0, c: 7 },
      { r: 7, c: 0 },
      { r: 7, c: 7 },
    ],
    obstacles: [
      { r: 0, c: 2, type: 'gem' },
      { r: 0, c: 4, type: 'gem' },
      { r: 0, c: 5, type: 'gem' },
      { r: 3, c: 2, type: 'metal-2' },
      { r: 3, c: 5, type: 'metal-2' },
      { r: 5, c: 2, type: 'metal-2' },
      { r: 5, c: 5, type: 'metal-2' },
      { r: 4, c: 3, type: 'stone' },
      { r: 4, c: 4, type: 'stone' },
      { r: 6, c: 3, type: 'ice' },
      { r: 6, c: 4, type: 'ice' },
    ],
  },
};
