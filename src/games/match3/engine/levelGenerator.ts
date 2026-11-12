/**
 * Deterministic Match 3 Level Configuration & Procedural Campaign Generator.
 * Supports Handcrafted Levels 1-20, L21+ 4-Band Sawtooth PCG, DDA Brackets, and Daily Challenges.
 * Zero React/DOM/Storage dependencies.
 * Owned by @match3-eng.
 */

import {
  MATCH3_COLOR_TOKENS,
  MATCH3_MANUAL_LEVELS,
  resolveMatch3DifficultyBand,
} from '@/config/match3.config';
import type { DdaBracket, GridCoord } from '@/types/game.types';
import type {
  Match3LevelConfig,
  Match3Objective,
  ObstacleType,
} from '@/types/match3.types';
import { hashSeed, seededRandom } from '@/utils/random';

function buildShapedHoles(
  rows: number,
  cols: number,
  pattern: number,
  isBreather: boolean,
): GridCoord[] {
  if (isBreather || pattern === 0) return [];

  const holes: GridCoord[] = [];
  if (pattern === 1) {
    // Chamfered 4 outer corners
    holes.push(
      { r: 0, c: 0 },
      { r: 0, c: cols - 1 },
      { r: rows - 1, c: 0 },
      { r: rows - 1, c: cols - 1 },
    );
  } else if (pattern === 2) {
    // 2x2 center cutout on even boards
    const mr = Math.floor(rows / 2) - 1;
    const mc = Math.floor(cols / 2) - 1;
    holes.push(
      { r: mr, c: mc },
      { r: mr, c: mc + 1 },
      { r: mr + 1, c: mc },
      { r: mr + 1, c: mc + 1 },
    );
  } else if (pattern === 3) {
    // Side notches
    const midR = Math.floor(rows / 2);
    holes.push(
      { r: midR - 1, c: 0 },
      { r: midR, c: 0 },
      { r: midR - 1, c: cols - 1 },
      { r: midR, c: cols - 1 },
    );
  }
  return holes;
}

function applyDdaAdjustments(
  base: Match3LevelConfig,
  ddaBracket: DdaBracket,
): Match3LevelConfig {
  let maxMoves = base.maxMoves;
  let scoreFactor = 1;
  let colorOrTileFactor = 1;

  if (ddaBracket === 'pity') {
    maxMoves += 3;
    scoreFactor = 0.9;
    colorOrTileFactor = 0.9;
  } else if (ddaBracket === 'easy') {
    maxMoves += 2;
    scoreFactor = 0.95;
    colorOrTileFactor = 0.95;
  } else if (ddaBracket === 'hard') {
    maxMoves = Math.max(12, maxMoves - 1);
    scoreFactor = 1.05;
  }

  const adjustMission = (m: Match3Objective): Match3Objective => {
    if (m.type === 'score') {
      const target = Math.max(500, Math.round((m.target * scoreFactor) / 50) * 50);
      return { ...m, target, description: `Raih ${target.toLocaleString('id-ID')} skor` };
    }
    if (m.type === 'clear_tiles') {
      const target = Math.max(15, Math.round(m.target * colorOrTileFactor));
      return { ...m, target, description: `Hapus ${target} tile` };
    }
    if (m.type === 'collect_color') {
      const target = Math.max(12, Math.round(m.target * colorOrTileFactor));
      const colorName = MATCH3_COLOR_TOKENS[m.colorIndex ?? 0]?.label ?? 'Warna';
      return { ...m, target, description: `Kumpulkan ${target} tile ${colorName}` };
    }
    return m;
  };

  const starScoreThresholds: [number, number, number] = [
    Math.max(500, Math.round((base.starScoreThresholds[0] * scoreFactor) / 50) * 50),
    Math.max(900, Math.round((base.starScoreThresholds[1] * scoreFactor) / 50) * 50),
    Math.max(1400, Math.round((base.starScoreThresholds[2] * scoreFactor) / 50) * 50),
  ];

  return {
    ...base,
    maxMoves,
    ddaBracket,
    missions: [
      adjustMission(base.missions[0]),
      adjustMission(base.missions[1]),
      adjustMission(base.missions[2]),
    ],
    starScoreThresholds,
  };
}

function generateProceduralLevel(
  level: number,
  ddaBracket: DdaBracket,
  seed: string,
): Match3LevelConfig {
  const rng = seededRandom(seed);
  const band = resolveMatch3DifficultyBand(level);
  const isBoss = level % 10 === 0;
  const isBreather = level > 5 && level % 5 === 1;

  const rows = level >= 61 ? 9 : 8;
  const cols = level >= 61 ? 9 : 8;
  const rawColorCount: 4 | 5 | 6 = level >= 61 ? 6 : level >= 41 ? 6 : 5;
  const tileColorCount: 4 | 5 | 6 = isBreather
    ? (Math.max(4, rawColorCount - 1) as 4 | 5 | 6)
    : rawColorCount;

  // Sawtooth move limit scaling down toward 15 floor in expert bands
  const tierPenalty = Math.floor((level - 20) / 10);
  const baseMoves = Math.max(
    15,
    Math.min(30, 26 - tierPenalty + (isBoss ? 2 : 0) + (isBreather ? 3 : 0)),
  );

  const holePattern = isBoss ? ((level / 10) % 3) + 1 : level % 4 === 0 ? (level % 3) + 1 : 0;
  const holes = buildShapedHoles(rows, cols, holePattern, isBreather);
  const holeSet = new Set(holes.map((h) => `${h.r}:${h.c}`));

  // Target obstacle count respects LEVEL_DIFFICULTY_PLAN caps
  const maxObstacleRatio = isBoss ? 0.25 : isBreather ? 0.08 : 0.18;
  const playableCellsCount = rows * cols - holes.length;
  const targetObstacleCount = Math.min(
    Math.floor(playableCellsCount * maxObstacleRatio),
    isBreather ? 5 : isBoss ? 16 : 8 + Math.min(8, Math.floor((level - 20) / 8)),
  );

  const obstacles: { r: number; c: number; type: ObstacleType }[] = [];
  const occupied = new Set<string>(holeSet);

  const primaryKinds = ['ice', 'wood', 'metal', 'gems', 'color', 'score'] as const;
  const primaryTheme = isBoss
    ? level % 20 === 0
      ? 'metal'
      : 'ice'
    : primaryKinds[(level + 1) % primaryKinds.length];

  const placeSymmetric = (r: number, c: number, type: ObstacleType): number => {
    const coords =
      c === cols - 1 - c
        ? [{ r, c }]
        : [
            { r, c },
            { r, c: cols - 1 - c },
          ];
    let added = 0;
    for (const pt of coords) {
      const k = `${pt.r}:${pt.c}`;
      if (pt.r >= 0 && pt.r < rows && pt.c >= 0 && pt.c < cols && !occupied.has(k)) {
        occupied.add(k);
        obstacles.push({ r: pt.r, c: pt.c, type });
        added++;
      }
    }
    return added;
  };

  if (primaryTheme === 'gems') {
    const gemCount = isBoss ? 4 : 3;
    const candidateCols = Array.from({ length: cols }, (_, i) => i).filter(
      (c) => !holeSet.has(`0:${c}`) && !holeSet.has(`1:${c}`),
    );
    for (let i = 0; i < gemCount && i < candidateCols.length; i++) {
      const colIdx = candidateCols[Math.floor((i * candidateCols.length) / gemCount)];
      const k = `0:${colIdx}`;
      if (!occupied.has(k)) {
        occupied.add(k);
        obstacles.push({ r: 0, c: colIdx, type: 'gem' });
      }
    }
  }

  // Place stones sparingly away from gem columns
  const gemCols = new Set(obstacles.filter((o) => o.type === 'gem').map((o) => o.c));
  if (!isBreather && level >= 24) {
    const stonePairs = isBoss ? 2 : 1;
    for (let s = 0; s < stonePairs; s++) {
      const sr = 2 + Math.floor(rng() * Math.max(1, rows - 4));
      const sc = Math.floor(rng() * Math.floor(cols / 2));
      if (!gemCols.has(sc) && !gemCols.has(cols - 1 - sc)) {
        placeSymmetric(sr, sc, 'stone');
      }
    }
  }

  // Fill remaining obstacle quota centered toward lower/mid board
  let safety = 0;
  while (obstacles.length < targetObstacleCount && safety < 120) {
    safety++;
    const r = Math.floor(rows * 0.25) + Math.floor(rng() * Math.max(1, Math.floor(rows * 0.7)));
    const c = Math.floor(rng() * Math.ceil(cols / 2));
    if (r >= rows) continue;

    let type: ObstacleType = 'ice';
    if (primaryTheme === 'wood') {
      type = rng() < 0.75 ? 'wood' : 'ice';
    } else if (primaryTheme === 'metal') {
      type = rng() < 0.65 ? 'metal-2' : 'wood';
    } else if (primaryTheme === 'ice') {
      type = rng() < 0.75 ? 'ice' : 'wood';
    } else {
      const roll = rng();
      type = roll < 0.45 ? 'ice' : roll < 0.8 ? 'wood' : 'metal-2';
    }

    // Avoid blocking bottom rows under a gem with metal-2
    if (gemCols.has(c) && type === 'metal-2') type = 'ice';

    placeSymmetric(r, c, type);
  }

  const iceCount = obstacles.filter((o) => o.type === 'ice').length;
  const woodCount = obstacles.filter((o) => o.type === 'wood').length;
  const metalCount = obstacles.filter((o) => o.type === 'metal-2' || o.type === 'metal-1').length;
  const gemCount = obstacles.filter((o) => o.type === 'gem').length;

  const baseScoreTarget = Math.round((4500 + level * 220 + (isBoss ? 1500 : 0)) / 100) * 100;
  const focusColor = (level + Math.floor(rng() * tileColorCount)) % tileColorCount;
  const focusColorName = MATCH3_COLOR_TOKENS[focusColor]?.label ?? 'Merah';

  let primaryMission: Match3Objective;
  if (primaryTheme === 'gems' && gemCount > 0) {
    primaryMission = {
      type: 'collect_gems',
      target: gemCount,
      description: `Turunkan ${gemCount} Permata`,
    };
  } else if (primaryTheme === 'ice' && iceCount >= 3) {
    primaryMission = {
      type: 'destroy_ice',
      target: iceCount,
      description: `Pecahkan ${iceCount} Es`,
    };
  } else if (primaryTheme === 'wood' && woodCount >= 3) {
    primaryMission = {
      type: 'destroy_wood',
      target: woodCount,
      description: `Hancurkan ${woodCount} Peti Kayu`,
    };
  } else if (primaryTheme === 'metal' && metalCount >= 2) {
    primaryMission = {
      type: 'destroy_metal',
      target: metalCount,
      description: `Hancurkan ${metalCount} Blok Besi`,
    };
  } else if (primaryTheme === 'color') {
    const colorTarget = Math.min(60, 26 + Math.floor(level / 3));
    primaryMission = {
      type: 'collect_color',
      colorIndex: focusColor,
      target: colorTarget,
      description: `Kumpulkan ${colorTarget} tile ${focusColorName}`,
    };
  } else {
    primaryMission = {
      type: 'score',
      target: baseScoreTarget,
      description: `Raih ${baseScoreTarget.toLocaleString('id-ID')} skor`,
    };
  }

  const secondarySpecialTarget = isBoss ? 4 : Math.min(4, 2 + Math.floor(level / 25));
  const secondaryMission: Match3Objective =
    primaryMission.type === 'score'
      ? {
          type: 'create_specials',
          target: secondarySpecialTarget,
          description: `Buat ${secondarySpecialTarget} tile spesial`,
        }
      : {
          type: 'score',
          target: baseScoreTarget,
          description: `Raih ${baseScoreTarget.toLocaleString('id-ID')} skor`,
        };

  const tertiaryScoreTarget = Math.round((baseScoreTarget * 1.35) / 100) * 100;
  const tertiaryMission: Match3Objective = {
    type: 'score',
    target: tertiaryScoreTarget,
    description: `Raih ${tertiaryScoreTarget.toLocaleString('id-ID')} skor`,
  };

  const star1 = baseScoreTarget;
  const star2 = Math.round((baseScoreTarget * 1.28) / 100) * 100;
  const star3 = Math.round((baseScoreTarget * 1.6) / 100) * 100;

  const rawConfig: Match3LevelConfig = {
    level,
    band,
    rows,
    cols,
    tileColorCount,
    maxMoves: baseMoves,
    missions: [primaryMission, secondaryMission, tertiaryMission],
    starScoreThresholds: [star1, star2, star3],
    holes,
    obstacles,
    isBoss,
    isBreather,
    ddaBracket,
    seed,
  };

  return applyDdaAdjustments(rawConfig, ddaBracket);
}

/**
 * Resolves the Match 3 level configuration for any campaign level (1..infinity).
 * Levels 1-20 use handcrafted configs from `MATCH3_MANUAL_LEVELS`,
 * Levels 21+ use deterministic 4-band sawtooth PCG, and DDA adjusts parameters smoothly.
 */
export function getMatch3LevelConfig(
  level: number,
  ddaBracket: DdaBracket = 'normal',
  seedOverride?: string,
): Match3LevelConfig {
  const safeLevel = Math.max(1, Math.floor(level));
  const seed = seedOverride ?? `match3_lvl_${safeLevel}`;
  const manual = MATCH3_MANUAL_LEVELS[safeLevel];

  if (manual) {
    const raw: Match3LevelConfig = {
      level: manual.level,
      band: resolveMatch3DifficultyBand(manual.level),
      rows: manual.rows,
      cols: manual.cols,
      tileColorCount: manual.tileColorCount,
      maxMoves: manual.maxMoves,
      missions: manual.missions,
      starScoreThresholds: manual.starScoreThresholds,
      holes: manual.holes.map((h) => ({ ...h })),
      obstacles: manual.obstacles.map((o) => ({ ...o })),
      isBoss: safeLevel % 10 === 0,
      isBreather: safeLevel > 5 && safeLevel % 5 === 1,
      ddaBracket,
      seed,
    };
    return applyDdaAdjustments(raw, ddaBracket);
  }

  return generateProceduralLevel(safeLevel, ddaBracket, seed);
}

/**
 * Generates a deterministic daily challenge Match 3 board configuration for a WIB date key.
 */
export function getDailyMatch3ChallengeConfig(
  dateKey: string,
  ddaBracket: DdaBracket = 'normal',
): Match3LevelConfig {
  const hash = hashSeed(`match3_daily_${dateKey}`);
  const levelEquivalent = 14 + (hash % 18); // Range L14..L31
  const config = getMatch3LevelConfig(levelEquivalent, ddaBracket, `match3_daily_${dateKey}`);
  return {
    ...config,
    seed: `match3_daily_${dateKey}`,
  };
}
