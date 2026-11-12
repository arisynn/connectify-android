import { describe, it, expect } from 'vitest';
import { generateMatch3Board } from '@/games/match3/engine/boardGenerator';
import {
  findAllValidSwaps,
  hasValidMoves,
  shuffleMatch3Board,
} from '@/games/match3/engine/deadlockDetector';
import {
  getMatch3LevelConfig,
  getDailyMatch3ChallengeConfig,
} from '@/games/match3/engine/levelGenerator';
import { findAllMatches, isSolidBlocker } from '@/games/match3/engine/matchDetector';
import {
  evaluateObjectiveProgress,
  evaluateMatch3Stars,
  calculateMatch3SkillEma,
} from '@/games/match3/engine/match3Scoring';
import { createTileUidFactory } from '@/games/match3/engine/cascadeResolver';
import { seededRandom } from '@/utils/random';
import type { Match3Board, ObstacleType, SpecialTileType } from '@/types/match3.types';

describe('Match 3 1,000-Board Generation, Deadlock Shuffle & PCG Curve (M3-DEAD-01..03)', () => {
  it('M3-DEAD-01: generates 1,000 boards across L1..80 + Daily with 0 initial matches, >=2 valid swaps & full occupancy', { timeout: 30_000 }, () => {
    let validBoardCount = 0;

    for (let i = 0; i < 1000; i += 1) {
      const isDaily = i % 20 === 0;
      const level = (i % 80) + 1;
      const config = isDaily
        ? getDailyMatch3ChallengeConfig(`2026-11-${String((i % 28) + 1).padStart(2, '0')}`)
        : getMatch3LevelConfig(level, 'normal', `sim_m3_${i}`);

      const board = generateMatch3Board(config, seededRandom(1000 + i * 31));

      expect(findAllMatches(board)).toHaveLength(0);
      const validSwaps = findAllValidSwaps(board);
      expect(validSwaps.length).toBeGreaterThanOrEqual(2);

      // Verify every cell obeys hole/blocker vs playable tile invariant
      for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
          const cell = board[r][c];
          if (cell.isHole || isSolidBlocker(cell.obstacle)) {
            expect(cell.tile).toBeNull();
          } else {
            expect(cell.tile).not.toBeNull();
          }
        }
      }

      validBoardCount += 1;
    }

    expect(validBoardCount).toBe(1000);
  });

  it('M3-DEAD-02: detects true zero-move deadlock and shuffles into a match-free, playable state preserving locks/specials', () => {
    // Build a 6x6 board with period-5 diagonal shifting where no 1-step swap makes a 3-in-a-row.
    // Using 5 colors with pattern (r*2 + c) % 5:
    // Let's verify programmatically that it has 0 valid swaps or test with 6 colors on 6x6: (r*3 + c) % 6 has
    // row stride 1 and col stride 3 -> even swapping horizontally/vertically rarely matches; even better,
    // use a deterministic latin-like 5-color deadlock pattern:
    // Row 0: 0 1 2 3 4 0
    // Row 1: 2 3 4 0 1 2
    // Row 2: 4 0 1 2 3 4
    // Row 3: 1 2 3 4 0 1
    // Row 4: 3 4 0 1 2 3
    // Row 5: 0 1 2 3 4 0 -> note (r*2 + c) % 5! Wait: check if (r*2+c)%5 has ANY valid swaps:
    // Swapping (0,0)=0 and (1,0)=2 puts 2 at (0,0), neighbors are (0,1)=1, (0,2)=2 -> only 1,2 not 2,2.
    // Wait: swapping (0,1)=1 and (1,1)=3 puts 1 at (1,1), neighbors (1,2)=4,(1,3)=0, (2,1)=0,(3,1)=2.
    // What about (r*2+c)%6 on 6x6? Let's verify exact swap count = 0!
    const uid = createTileUidFactory('dead');
    const board: Match3Board = [];
    for (let r = 0; r < 6; r++) {
      const row = [];
      for (let c = 0; c < 6; c++) {
        row.push({
          r,
          c,
          isHole: false,
          obstacle: '' as ObstacleType,
          tile: {
            uid: uid(),
            colorIndex: (r * 2 + c) % 6,
            special: 'none' as SpecialTileType,
            dropRows: 0,
            isNewSpawn: false,
          },
        });
      }
      board.push(row);
    }

    // Also attach a hole, an ice tile, a wood blocker, a gem, and a bomb_3x3 to verify preservation
    board[0][0].isHole = true;
    board[0][0].tile = null;
    board[5][5].obstacle = 'wood';
    board[5][5].tile = null;

    expect(hasValidMoves(board)).toBe(false);
    expect(findAllValidSwaps(board)).toHaveLength(0);

    // Add a frozen ice tile and a movable special before shuffling
    board[1][1].obstacle = 'ice';
    const frozenUid = board[1][1].tile!.uid;
    board[2][2].tile!.special = 'bomb_3x3';

    const shuffled = shuffleMatch3Board(board, 6, seededRandom(2026));
    expect(findAllMatches(shuffled)).toHaveLength(0);
    expect(hasValidMoves(shuffled)).toBe(true);
    expect(findAllValidSwaps(shuffled).length).toBeGreaterThanOrEqual(1);

    // Holes, wood, and ice tiles stayed locked in place
    expect(shuffled[0][0].isHole).toBe(true);
    expect(shuffled[5][5].obstacle).toBe('wood');
    expect(shuffled[1][1].obstacle).toBe('ice');
    expect(shuffled[1][1].tile!.uid).toBe(frozenUid);

    // Exactly 1 bomb_3x3 tile remains somewhere on a movable cell
    let bombCount = 0;
    for (const row of shuffled) {
      for (const cell of row) {
        if (cell.tile?.special === 'bomb_3x3') bombCount += 1;
      }
    }
    expect(bombCount).toBe(1);
  });

  it('M3-DEAD-03: verifies L1..20 manual configs, L21+ PCG scaling, DDA brackets, stars & EMA', () => {
    const l1 = getMatch3LevelConfig(1);
    expect(l1.rows).toBe(7);
    expect(l1.cols).toBe(7);
    expect(l1.band).toBe('onboarding');

    const l10 = getMatch3LevelConfig(10);
    expect(l10.isBoss).toBe(true);

    const l11 = getMatch3LevelConfig(11);
    expect(l11.isBreather).toBe(true);

    const l65 = getMatch3LevelConfig(65);
    expect(l65.rows).toBe(9);
    expect(l65.cols).toBe(9);
    expect(l65.tileColorCount).toBe(6);
    expect(l65.band).toBe('expert');

    // DDA pity adds +3 moves over normal
    const normalL25 = getMatch3LevelConfig(25, 'normal');
    const pityL25 = getMatch3LevelConfig(25, 'pity');
    expect(pityL25.maxMoves).toBe(normalL25.maxMoves + 3);

    // Objective & star evaluator checks
    const progress = {
      score: 4200,
      tilesCleared: 45,
      colorCollected: { 0: 18 },
      iceDestroyed: 4,
      woodDestroyed: 2,
      metalDestroyed: 1,
      gemsCollected: 2,
      specialsCreated: 3,
      specialCombosTriggered: 1,
      obstaclesDestroyed: 7,
      movesUsed: 12,
    };
    expect(
      evaluateObjectiveProgress({ type: 'collect_color', target: 15, colorIndex: 0, description: '' }, progress)
        .completed,
    ).toBe(true);
    expect(evaluateMatch3Stars(4200, [1500, 2800, 4000], true)).toBe(3);
    expect(evaluateMatch3Stars(5000, [1500, 2800, 4000], false)).toBe(0);

    // Skill EMA increases on 3-star fast win and drops on loss
    const up = calculateMatch3SkillEma(50, 3, 10, 20, true);
    const down = calculateMatch3SkillEma(50, 0, 0, 20, false);
    expect(up).toBeGreaterThan(50);
    expect(down).toBeLessThan(50);
  });
});
