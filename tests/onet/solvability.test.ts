import { describe, it, expect } from 'vitest';
import { getOnetLevelConfig } from '@/config/onet.config';
import {
  generateOnetBoard,
  isBoardSolvable,
  clearMatchedGroups,
  applyGravity,
} from '@/games/onet/engine/boardGenerator';
import { findHint, groupSize, isBlockerCell, isMasterCell } from '@/games/onet/engine/pathfinding';
import { guaranteedShuffle } from '@/games/onet/engine/shuffler';
import type { OnetBoard } from '@/types/onet.types';

function assertBoardStructuralIntegrity(board: OnetBoard): void {
  const rows = board.length;
  const cols = rows > 0 ? board[0].length : 0;
  const bucketCounts = new Map<string, number>();
  const expectedSlaves = new Set<string>();

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const cell = board[r][c];
      // Initial generated boards have 100% occupancy (no null holes)
      expect(cell).not.toBeNull();
      if (!cell) continue;

      if (isBlockerCell(cell)) continue;

      if (isMasterCell(cell)) {
        const { rowSpan, colSpan } = groupSize(cell);
        const bucketKey = `${cell.icon}|${rowSpan}x${colSpan}`;
        bucketCounts.set(bucketKey, (bucketCounts.get(bucketKey) ?? 0) + 1);
        for (let dr = 0; dr < rowSpan; dr += 1) {
          for (let dc = 0; dc < colSpan; dc += 1) {
            if (dr === 0 && dc === 0) continue;
            const sr = r + dr;
            const sc = c + dc;
            expectedSlaves.add(`${sr}:${sc}:${r}:${c}`);
            const slave = board[sr]?.[sc];
            expect(slave && 'isSlave' in slave && slave.isSlave).toBe(true);
            if (slave && 'isSlave' in slave && slave.isSlave) {
              expect(slave.masterR).toBe(r);
              expect(slave.masterC).toBe(c);
            }
          }
        }
      } else if ('isSlave' in cell && cell.isSlave) {
        expect(expectedSlaves.has(`${r}:${c}:${cell.masterR}:${cell.masterC}`)).toBe(true);
      }
    }
  }

  for (const count of bucketCounts.values()) {
    expect(count % 2).toBe(0);
  }
}

describe('Onet 1,000-Board Solvability, PCG Curve & Shuffle Guarantee (ONET-GEN-01..04)', () => {
  it('ONET-GEN-01: generates 1,000 solvable boards (L1..100 + Daily Sprint) with zero orphans and valid hints', { timeout: 180_000 }, () => {
    let hintSuccess = 0;
    let solvableSuccess = 0;

    for (let i = 0; i < 1000; i += 1) {
      const isDaily = i % 25 === 0;
      const level = (i % 100) + 1;
      const seed = 10_000 + i * 7919;
      const config = isDaily
        ? getOnetLevelConfig(1, { mode: 'daily', dailyDateKey: `2026-11-${String((i % 28) + 1).padStart(2, '0')}`, seed })
        : getOnetLevelConfig(level, { seed });

      const board = generateOnetBoard(config, { seed });

      if (i % 5 === 0) {
        assertBoardStructuralIntegrity(board);
      }

      if (findHint(board) !== null) {
        hintSuccess += 1;
      }
      if (isBoardSolvable(board, config.gravityMode, 160)) {
        solvableSuccess += 1;
      }
    }

    expect(hintSuccess).toBe(1000);
    expect(solvableSuccess).toBe(1000);
  });

  it('ONET-GEN-02: guaranteedShuffle preserves multi-cell footprints, themeKey, splitAxis, blockers & always yields a hint', () => {
    for (let round = 0; round < 50; round += 1) {
      const level = 10 + (round % 30);
      const config = getOnetLevelConfig(level, { seed: 500 + round });
      let board = generateOnetBoard(config, { themeKey: 'ocean', seed: 500 + round });

      // Clear a couple of valid pairs and apply gravity to create a partial mid-game board
      for (let step = 0; step < 3; step += 1) {
        const hint = findHint(board);
        if (!hint) break;
        const cleared = clearMatchedGroups(board, hint.a, hint.b);
        board = applyGravity(cleared.board, config.gravityMode, step).board;
      }

      const preMasters = new Map<string, number>();
      let preBlockers = 0;
      for (const row of board) {
        for (const cell of row) {
          if (!cell) continue;
          if (isBlockerCell(cell)) preBlockers += 1;
          else if (isMasterCell(cell)) {
            const { rowSpan, colSpan } = groupSize(cell);
            const k = `${cell.icon}|${rowSpan}x${colSpan}`;
            preMasters.set(k, (preMasters.get(k) ?? 0) + 1);
          }
        }
      }

      const shuffled = guaranteedShuffle(board, {
        gravityMode: config.gravityMode,
        activeThemeKey: 'sakura',
        seed: 9000 + round,
      });

      const postMasters = new Map<string, number>();
      let postBlockers = 0;
      for (let r = 0; r < shuffled.length; r += 1) {
        for (let c = 0; c < shuffled[r].length; c += 1) {
          const cell = shuffled[r][c];
          if (!cell) continue;
          if (isBlockerCell(cell)) {
            postBlockers += 1;
          } else if (isMasterCell(cell)) {
            expect(cell.themeKey).toBe('sakura');
            const { rowSpan, colSpan } = groupSize(cell);
            const k = `${cell.icon}|${rowSpan}x${colSpan}`;
            postMasters.set(k, (postMasters.get(k) ?? 0) + 1);
            for (let dr = 0; dr < rowSpan; dr += 1) {
              for (let dc = 0; dc < colSpan; dc += 1) {
                if (dr === 0 && dc === 0) continue;
                const slave = shuffled[r + dr]?.[c + dc];
                expect(slave && 'isSlave' in slave && slave.isSlave).toBe(true);
              }
            }
          } else if ('isSlave' in cell && cell.isSlave) {
            const master = shuffled[cell.masterR]?.[cell.masterC];
            expect(master && isMasterCell(master)).toBe(true);
          }
        }
      }

      expect(postBlockers).toBe(preBlockers);
      expect(postMasters).toEqual(preMasters);
      expect(findHint(shuffled)).not.toBeNull();
    }
  });

  it('ONET-GEN-03: seeded board generation is deterministic and distinct across seeds', () => {
    const cfg = getOnetLevelConfig(14, { seed: 424242 });
    const b1 = generateOnetBoard(cfg, { seed: 424242 });
    const b2 = generateOnetBoard(cfg, { seed: 424242 });
    const b3 = generateOnetBoard(cfg, { seed: 999999 });

    expect(b1).toEqual(b2);
    expect(b1).not.toEqual(b3);
  });

  it('ONET-GEN-04: verifies 4-band sawtooth curve, Boss/Breather cadence & DDA adjustments', () => {
    const l1 = getOnetLevelConfig(1);
    expect(l1.band).toBe('onboarding');
    expect(l1.rows).toBe(6);
    expect(l1.cols).toBe(4);

    const l10 = getOnetLevelConfig(10);
    expect(l10.isBoss).toBe(true);
    expect(l10.isBreather).toBe(false);

    const l11 = getOnetLevelConfig(11);
    expect(l11.isBreather).toBe(true);
    expect(l11.blockerCount).toBe(0);

    const normalL20 = getOnetLevelConfig(20, { skillRating: 55, consecutiveFailures: 0 });
    const pityL20 = getOnetLevelConfig(20, { skillRating: 55, consecutiveFailures: 3 });
    expect(pityL20.ddaBracket).toBe('pity');
    expect(pityL20.timeLimitSec).toBe(normalL20.timeLimitSec + 20);
    expect(pityL20.blockerCount).toBe(0);
  });
});
