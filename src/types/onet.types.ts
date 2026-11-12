/**
 * Core TypeScript Contracts for Onet Connect Gameplay.
 * Owned by @onet-eng.
 */

import type {
  DdaBracket,
  DifficultyBand,
  GameMode,
  GameResultPayload,
  GridCoord,
  OnetBoosterId,
  RewardBreakdown,
  StarRating,
} from './game.types';

export type OnetDirection = 'up' | 'down' | 'left' | 'right';

export type OnetGravityMode =
  | 'none'
  | 'down'
  | 'left'
  | 'up'
  | 'right'
  | 'inward'
  | 'split_horizontal'
  | 'alternating';

export type OnetTileFootprint = '1x1' | '1x2' | '2x1' | '2x2';

export interface OnetTileMaster {
  /** Unique identifier (deterministic child IDs on split: `${id}-a`, `${id}-b`). */
  id: string;
  /** Icon index or URL matching the active theme's tile pool. */
  icon: string;
  /** Theme ID snapshot attached at spawn or post-shuffle. */
  themeKey: string;
  /** Row span (1 or 2). */
  rowSpan: 1 | 2;
  /** Column span (1 or 2). */
  colSpan: 1 | 2;
  isSlave?: false;
  /** Optional directional entry/exit constraint ("arrow tile"). */
  openSide?: OnetDirection | null;
  /** Preferred split axis when clearing a 2x2 tile cleanly into two 1x2 or 2x1 tiles. */
  splitAxis?: 'h' | 'v';
  /** Current footprint string for persistence serialization. */
  footprint?: OnetTileFootprint;
}

export interface OnetTileSlave {
  id: string;
  isSlave: true;
  /** Master tile top-left coordinate. */
  masterR: number;
  masterC: number;
}

export interface OnetBlockerCell {
  id: string;
  isBlocker: true;
  obstacleType: 'stone';
}

export type OnetCell = OnetTileMaster | OnetTileSlave | OnetBlockerCell | null;

export type OnetBoard = OnetCell[][];

export interface OnetBoardDimensions {
  rows: number;
  cols: number;
}

export interface OnetMultiTileGroupSpec {
  id: string;
  rowSpan: 1 | 2;
  colSpan: 1 | 2;
  /** Optional paired partner icon key when pre-allocating balanced pairs. */
  icon?: string;
}

export interface OnetPathResult {
  points: GridCoord[];
  turns: 0 | 1 | 2;
  length: number;
}

export interface OnetHint {
  a: GridCoord;
  b: GridCoord;
  path: GridCoord[];
  turns: 0 | 1 | 2;
}

export type OnetMatchResolutionType = 'cleared' | 'split' | 'mixed';

export interface OnetSplitSpawn {
  id: string;
  r: number;
  c: number;
  rowSpan: 1 | 2;
  colSpan: 1 | 2;
  icon: string;
}

export interface OnetClearOutcome {
  board: OnetBoard;
  action: OnetMatchResolutionType;
  clearedCount: number;
  splitCount: number;
  removedCoords: GridCoord[];
  spawnedSplits: OnetSplitSpawn[];
}

export interface OnetStarThresholds {
  oneStarMin: number;
  twoStarMinRatioRemainingTime: number;
  threeStarMinRatioRemainingTime: number;
  threeStarMaxMistakes: number;
  threeStarMaxBoosters: number;
}

export interface OnetLevelConfig {
  level: number;
  mode: GameMode;
  band: DifficultyBand;
  isBoss: boolean;
  isBreather: boolean;
  ddaBracket: DdaBracket;
  rows: number;
  cols: number;
  /** Number of distinct tile icons drawn from the active theme pool. */
  tileVariety: number;
  /** Base time limit in seconds before DDA adjustments. */
  baseTimeLimitSec: number;
  /** Effective time limit in seconds after DDA adjustments. */
  timeLimitSec: number;
  /** Multi-cell tile split specs included at board start. */
  multiGroups: {
    count2x2: number;
    count1x2: number;
    count2x1: number;
  };
  /** Number of arrow-gated tile pairs (each pair opens one compatible direction). */
  arrowPairCount: number;
  /** Gravity rule applied after each match/split clearance. */
  gravityMode: OnetGravityMode;
  /** Even count of static unmatchable stone blockers placed symmetrically (0, 2, or 4). */
  blockerCount: number;
  /** Star rating thresholds for victory calculation. */
  stars: OnetStarThresholds;
  /** Seed used for deterministic daily challenges or reproducible replays. */
  seed?: number;
}

export interface OnetMatchScoreBreakdown {
  basePoints: number;
  comboBonus: number;
  totalPoints: number;
  nextCombo: number;
}

export interface OnetFinalScoreResult {
  score: number;
  timeBonus: number;
  stars: StarRating;
  isFlawless: boolean;
}

export interface OnetBurstEvent {
  id: string;
  r: number;
  c: number;
  rowSpan: 1 | 2;
  colSpan: 1 | 2;
  icon: string;
  isSplit: boolean;
  accentHex?: string;
}

export interface OnetPathEffectState {
  id: string;
  points: GridCoord[];
  turns: 0 | 1 | 2;
  isSplit: boolean;
  accentHex?: string;
}

export interface OnetGravityShiftItem {
  id: string;
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
}

export type OnetGamePhase =
  | 'loading'
  | 'playing'
  | 'matching'
  | 'shuffling'
  | 'paused'
  | 'won'
  | 'lost';

export interface OnetGameState {
  runId: string;
  phase: OnetGamePhase;
  config: OnetLevelConfig;
  board: OnetBoard;
  selected: GridCoord | null;
  activePath: OnetPathEffectState | null;
  errorPair: [GridCoord, GridCoord] | null;
  hint: OnetHint | null;
  bursts: OnetBurstEvent[];
  score: number;
  combo: number;
  highestCombo: number;
  comboExpiresAtMs: number;
  matches: number;
  splits: number;
  mistakes: number;
  boostersUsed: Record<OnetBoosterId, number>;
  autoShuffles: number;
  remainingTimeMs: number;
  totalTimeMs: number;
  elapsedPlayTimeMs: number;
  remainingTileCount: number;
  isResumedSession: boolean;
  lastResult: GameResultPayload | null;
  lastBreakdown: RewardBreakdown | null;
}

/**
 * Props contract expected from @game-feel's OnetPathLayer component.
 */
export interface OnetPathLayerProps {
  rows: number;
  cols: number;
  path: GridCoord[] | null;
  turns?: 0 | 1 | 2;
  isSplit?: boolean;
  accentColor?: string;
}

/**
 * Props contract expected from @game-feel's TileBurst component.
 */
export interface TileBurstProps {
  bursts: OnetBurstEvent[];
  rows: number;
  cols: number;
  accentColor?: string;
}
