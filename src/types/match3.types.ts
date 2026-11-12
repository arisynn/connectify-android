/**
 * Core TypeScript Contracts for Match 3 Puzzle Gameplay.
 * Owned by @match3-eng.
 */

import type React from 'react';
import type {
  DdaBracket,
  DifficultyBand,
  GameMode,
  GameResultPayload,
  GridCoord,
  Match3BoosterId,
  RewardBreakdown,
  StarRating,
} from './game.types';

export type SpecialTileType = 'none' | 'striped_h' | 'striped_v' | 'bomb_3x3' | 'rainbow';

export type ObstacleType = '' | 'ice' | 'wood' | 'metal-2' | 'metal-1' | 'stone' | 'gem';

export type MatchShapeType =
  | 'match_3'
  | 'match_4_h'
  | 'match_4_v'
  | 'match_L'
  | 'match_T'
  | 'match_5_line'
  | 'match_5_cross'
  | 'special_combo';

export interface Match3Tile {
  /** Unique monotonic instance ID for React key stability and drop animations */
  uid: string;
  /** Logical color index (0..tileColorCount-1); -1 for color-agnostic rainbow or gem */
  colorIndex: number;
  /** Special booster status embedded on this tile */
  special: SpecialTileType;
  /** Animation metadata: number of rows dropped in the current gravity step */
  dropRows: number;
  /** True if spawned from the top refill chute on the current cascade step */
  isNewSpawn: boolean;
}

export interface Match3Cell {
  r: number;
  c: number;
  /** Cutout / masked non-playable cell (shaped board topology) */
  isHole?: boolean;
  /** Playable tile in this cell, or null if empty / hole / solid blocker */
  tile: Match3Tile | null;
  /** Obstacle or collectible modifier on this cell */
  obstacle: ObstacleType;
}

export type Match3Board = Match3Cell[][];

export interface MatchGroup {
  shape: MatchShapeType;
  colorIndex: number;
  cells: GridCoord[];
  /** Coordinate where a synthesized special tile should spawn, if any */
  spawnSpecialAt: GridCoord | null;
  spawnSpecialType: SpecialTileType;
}

export interface ValidSwapMove {
  from: GridCoord;
  to: GridCoord;
  /** Heuristic priority score for Hint selection (Match-5 > L/T > Match-4 > Obstacle hit > Match-3) */
  priorityScore: number;
  expectedShape: MatchShapeType;
}

export interface ObstacleDamageEvent {
  coord: GridCoord;
  from: ObstacleType;
  to: ObstacleType;
}

export interface CascadeWaveSnapshot {
  stepIndex: number;
  clearedCoords: GridCoord[];
  blastedCoords: GridCoord[];
  spawnedSpecials: { coord: GridCoord; type: SpecialTileType; colorIndex: number }[];
  triggeredSpecials: { coord: GridCoord; type: SpecialTileType }[];
  obstaclesDamaged: ObstacleDamageEvent[];
  gemsCollectedCoords: GridCoord[];
  scoreDelta: number;
  comboMultiplier: number;
  tilesClearedCount: number;
  colorClearedCounts: Record<number, number>;
  boardAfterClear: Match3Board;
  boardAfterGravity: Match3Board;
}

export interface SwapResolutionResult {
  valid: boolean;
  isSpecialCombo: boolean;
  waves: CascadeWaveSnapshot[];
  finalBoard: Match3Board;
  totalScoreDelta: number;
  totalTilesCleared: number;
  totalSpecialsCreated: number;
  totalSpecialCombosTriggered: number;
  totalObstaclesDestroyed: number;
  totalGemsCollected: number;
  colorClearedCounts: Record<number, number>;
  iceDestroyed: number;
  woodDestroyed: number;
  metalDestroyed: number;
  cascadeCount: number;
  maxComboMultiplier: number;
}

export type Match3ObjectiveType =
  | 'score'
  | 'clear_tiles'
  | 'collect_color'
  | 'destroy_ice'
  | 'destroy_wood'
  | 'destroy_metal'
  | 'collect_gems'
  | 'create_specials'
  | 'max_moves';

export interface Match3Objective {
  type: Match3ObjectiveType;
  target: number;
  /** Optional target colorIndex when type === 'collect_color' */
  colorIndex?: number;
  description: string;
}

export interface Match3ProgressCounters {
  score: number;
  tilesCleared: number;
  colorCollected: Record<number, number>;
  iceDestroyed: number;
  woodDestroyed: number;
  metalDestroyed: number;
  gemsCollected: number;
  specialsCreated: number;
  specialCombosTriggered: number;
  obstaclesDestroyed: number;
  movesUsed: number;
}

export interface Match3LevelConfig {
  level: number;
  band: DifficultyBand;
  rows: number;
  cols: number;
  tileColorCount: 4 | 5 | 6;
  maxMoves: number;
  /** Primary objective (index 0) wins the level; index 1 & 2 award 2nd and 3rd stars */
  missions: [Match3Objective, Match3Objective, Match3Objective];
  /** Score thresholds for 1, 2, and 3 stars */
  starScoreThresholds: [number, number, number];
  /** Optional shaped-board cutout coordinates */
  holes: GridCoord[];
  obstacles: { r: number; c: number; type: ObstacleType }[];
  isBoss: boolean;
  isBreather: boolean;
  ddaBracket: DdaBracket;
  seed: string;
}

export type Match3Phase =
  | 'ready'
  | 'idle'
  | 'swapping'
  | 'reverting'
  | 'flashing'
  | 'cascading'
  | 'shuffling'
  | 'bonus_drain'
  | 'paused'
  | 'won'
  | 'lost';

export interface Match3VisualFxState {
  swappingPair: { from: GridCoord; to: GridCoord } | null;
  revertingPair: { from: GridCoord; to: GridCoord } | null;
  matchedCoords: GridCoord[];
  blastedCoords: GridCoord[];
  rainbowTargets: GridCoord[];
  rainbowOrigin: GridCoord | null;
  bannerText: string | null;
  bannerKey: number;
}

export interface Match3SessionState {
  runId: string;
  level: number;
  mode: GameMode;
  phase: Match3Phase;
  config: Match3LevelConfig;
  board: Match3Board;
  score: number;
  movesUsed: number;
  movesRemaining: number;
  combo: number;
  highestCombo: number;
  cascadesTriggered: number;
  selectedCoord: GridCoord | null;
  hintMove: ValidSwapMove | null;
  activeBooster: Extract<Match3BoosterId, 'hammer' | 'bomb'> | null;
  boostersUsed: Partial<Record<Match3BoosterId, number>>;
  progress: Match3ProgressCounters;
  missionResults: [boolean, boolean, boolean];
  startedAtMs: number;
  elapsedMs: number;
  lastResult: {
    payload: GameResultPayload;
    breakdown: RewardBreakdown | null;
  } | null;
}

/**
 * Shared prop contract for @game-feel's Match3Tile component (`src/games/match3/components/Match3Tile.tsx`).
 */
export interface Match3TileProps {
  cell: Match3Cell;
  /** Resolved themed tile image URL (e.g., `/art/candy/0.webp`), or null for rainbow/gem/solid obstacles */
  tileAssetUrl: string | null;
  /** Optional equipped surface texture URL behind the tile */
  surfaceUrl?: string | null;
  /** Semantic color tint for high-contrast differentiation across 4..6 colors */
  colorIndex: number;
  isSelected: boolean;
  isHinted: boolean;
  isInvalidSwap: boolean;
  isMatched: boolean;
  isBlasted: boolean;
  swapOffset?: { dx: number; dy: number } | null;
  boosterTargetMode?: 'hammer' | 'bomb' | null;
  reducedMotion?: boolean;
  highContrast?: boolean;
  onPointerDown: (r: number, c: number, e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerEnter?: (r: number, c: number) => void;
  onClick?: (r: number, c: number) => void;
  testId?: string;
}
