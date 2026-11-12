/**
 * useOnetGame — Core Gameplay State Machine, Paused-Safe Timer & Persistence Hook.
 * Owned by @onet-eng.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ONET_TIMINGS } from '@/config/audioFeel.config';
import {
  getOnetLevelConfig,
  ONET_FALLBACK_TILE_POOL,
  ONET_SCORING_CONFIG,
} from '@/config/onet.config';
import { useAudio } from '@/services/audio/AudioContext';
import { CapacitorBridge } from '@/services/native/CapacitorBridge';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { RewardEngine } from '@/services/progression/RewardEngine';
import type {
  GameMode,
  GameResultPayload,
  GridCoord,
  OnetBoosterId,
  RewardBreakdown,
} from '@/types/game.types';
import type {
  OnetBoard,
  OnetBurstEvent,
  OnetGameState,
  OnetHint,
  OnetLevelConfig,
  OnetPathEffectState,
} from '@/types/onet.types';
import type { ActiveOnetSessionState } from '@/types/persistence.types';
import { getTodayKey } from '@/utils/time';
import {
  applyGravity,
  clearMatchedGroups,
  generateOnetBoard,
} from '../engine/boardGenerator';
import {
  boardToSnapshot,
  computeMatchScore,
  computeOnetFinalScore,
  snapshotToBoard,
} from '../engine/onetScoring';
import {
  countRemainingMasters,
  findHint,
  getPath,
  groupSize,
  isBlockerCell,
  isMasterCell,
  resolveMasterCoord,
} from '../engine/pathfinding';
import { guaranteedShuffle } from '../engine/shuffler';

export interface UseOnetGameOptions {
  level: number;
  mode?: GameMode;
  dailyDateKey?: string | null;
  themeKey?: string;
  tilePool?: readonly string[];
  accentHex?: string;
  /** Optional external handler when round completes; if omitted, hook commits via RewardEngine. */
  onGameComplete?: (payload: GameResultPayload) => void;
}

export interface UseOnetGameReturn {
  state: OnetGameState;
  boostersInventory: Record<OnetBoosterId, number>;
  isLowTimeWarning: boolean;
  selectTile: (coord: GridCoord) => void;
  useHintBooster: () => boolean;
  useShuffleBooster: () => boolean;
  useExtraTimeBooster: () => boolean;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
}

function createRunId(level: number, mode: GameMode): string {
  return `onet-${mode}-${level}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function buildInitialGameState(
  level: number,
  mode: GameMode,
  dailyDateKey: string | null,
  themeKey: string,
  tilePool: readonly string[],
  skillRating: number,
  consecutiveFailures: number,
  resumableSession: ActiveOnetSessionState | null,
): OnetGameState {
  const config: OnetLevelConfig = getOnetLevelConfig(level, {
    mode,
    skillRating,
    consecutiveFailures,
    dailyDateKey: dailyDateKey ?? undefined,
  });

  const isDaily = mode === 'daily';
  const canResume =
    resumableSession &&
    resumableSession.gameId === 'onet' &&
    resumableSession.level === config.level &&
    resumableSession.isDailyChallenge === isDaily &&
    resumableSession.remainingTimeSec > 0 &&
    (!isDaily || resumableSession.dailyChallengeDateKey === dailyDateKey) &&
    resumableSession.board.length === config.rows &&
    (resumableSession.board[0]?.length ?? 0) === config.cols;

  if (canResume && resumableSession) {
    let restoredBoard = snapshotToBoard(resumableSession.board, themeKey);
    const remaining = countRemainingMasters(restoredBoard);
    if (remaining >= 2) {
      if (!findHint(restoredBoard)) {
        restoredBoard = guaranteedShuffle(restoredBoard, {
          gravityMode: config.gravityMode,
          activeThemeKey: themeKey,
        });
      }
      const totalTimeMs = Math.max(1000, resumableSession.totalTimeSec * 1000);
      const remainingTimeMs = Math.max(1000, resumableSession.remainingTimeSec * 1000);
      return {
        runId: resumableSession.runId || createRunId(config.level, mode),
        phase: 'paused',
        config,
        board: restoredBoard,
        selected: resumableSession.selectedCoord ?? null,
        activePath: null,
        errorPair: null,
        hint: null,
        bursts: [],
        score: resumableSession.score,
        combo: resumableSession.combo,
        highestCombo: resumableSession.highestCombo,
        comboExpiresAtMs: 0,
        matches: resumableSession.matchesCompleted,
        splits: resumableSession.splitsCompleted,
        mistakes: resumableSession.mistakes,
        boostersUsed: {
          hint: resumableSession.boostersUsed?.hint ?? 0,
          shuffle: resumableSession.boostersUsed?.shuffle ?? 0,
          extra_time: resumableSession.boostersUsed?.extra_time ?? 0,
        },
        autoShuffles: 0,
        remainingTimeMs,
        totalTimeMs,
        elapsedPlayTimeMs: resumableSession.elapsedMs ?? Math.max(0, totalTimeMs - remainingTimeMs),
        remainingTileCount: remaining,
        isResumedSession: true,
        lastResult: null,
        lastBreakdown: null,
      };
    }
  }

  const board = generateOnetBoard(config, {
    themeKey,
    tilePool,
    seed: isDaily ? config.seed : undefined,
  });
  const totalTimeMs = config.timeLimitSec * 1000;

  return {
    runId: createRunId(config.level, mode),
    phase: 'playing',
    config,
    board,
    selected: null,
    activePath: null,
    errorPair: null,
    hint: null,
    bursts: [],
    score: 0,
    combo: 0,
    highestCombo: 0,
    comboExpiresAtMs: 0,
    matches: 0,
    splits: 0,
    mistakes: 0,
    boostersUsed: { hint: 0, shuffle: 0, extra_time: 0 },
    autoShuffles: 0,
    remainingTimeMs: totalTimeMs,
    totalTimeMs,
    elapsedPlayTimeMs: 0,
    remainingTileCount: countRemainingMasters(board),
    isResumedSession: false,
    lastResult: null,
    lastBreakdown: null,
  };
}

export function useOnetGame(options: UseOnetGameOptions): UseOnetGameReturn {
  const mode: GameMode = options.mode ?? 'normal';
  const dailyDateKey = mode === 'daily' ? (options.dailyDateKey ?? getTodayKey()) : null;
  const themeKey = options.themeKey ?? 'candy';
  const tilePool =
    options.tilePool && options.tilePool.length > 0 ? options.tilePool : ONET_FALLBACK_TILE_POOL;

  const { engine, saveData, executeTransaction, saveActiveSession, getActiveSession } =
    usePersistence();
  const {
    playGameBgm,
    playSfx,
    playComboMatch,
    playWrong,
    triggerHaptic,
    pauseAudio,
    resumeAudio,
  } = useAudio();

  const skillRating = saveData.progression.onet.skillRating ?? 50;
  const consecutiveFailures =
    saveData.progression.onet.levels[options.level]?.consecutiveFailures ?? 0;

  const [state, setState] = useState<OnetGameState>(() =>
    buildInitialGameState(
      options.level,
      mode,
      dailyDateKey,
      themeKey,
      tilePool,
      skillRating,
      consecutiveFailures,
      getActiveSession('onet'),
    ),
  );

  const stateRef = useRef<OnetGameState>(state);
  stateRef.current = state;

  const epochRef = useRef<number>(1);
  const boosterOpCounterRef = useRef<number>(0);
  const submittedRunIdRef = useRef<string | null>(null);
  const lastTickPerfRef = useRef<number | null>(null);
  const isAppBackgroundedRef = useRef<boolean>(false);
  const pendingTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

  const clearPendingTimers = useCallback(() => {
    for (const timerId of pendingTimersRef.current) {
      clearTimeout(timerId);
    }
    pendingTimersRef.current.clear();
  }, []);

  const scheduleSafeTimeout = useCallback(
    (delayMs: number, expectedEpoch: number, fn: () => void) => {
      const timerId = setTimeout(() => {
        pendingTimersRef.current.delete(timerId);
        if (epochRef.current !== expectedEpoch) return;
        fn();
      }, delayMs);
      pendingTimersRef.current.add(timerId);
    },
    [],
  );

  const persistSnapshot = useCallback(
    (snapshotState: OnetGameState) => {
      if (snapshotState.phase === 'won' || snapshotState.phase === 'lost') {
        saveActiveSession('onet', null);
        return;
      }
      if (snapshotState.remainingTileCount <= 0) return;

      const now = Date.now();
      const session: ActiveOnetSessionState = {
        gameId: 'onet',
        runId: snapshotState.runId,
        level: snapshotState.config.level,
        isDailyChallenge: snapshotState.config.mode === 'daily',
        dailyChallengeDateKey: dailyDateKey,
        themeId: themeKey,
        score: snapshotState.score,
        combo: snapshotState.combo,
        highestCombo: snapshotState.highestCombo,
        elapsedMs: Math.round(snapshotState.elapsedPlayTimeMs),
        mistakes: snapshotState.mistakes,
        boostersUsed: { ...snapshotState.boostersUsed },
        rngState: snapshotState.config.seed ?? 0,
        startedAt: now - Math.round(snapshotState.elapsedPlayTimeMs),
        savedAt: now,
        remainingTimeSec: Math.max(1, Math.ceil(snapshotState.remainingTimeMs / 1000)),
        totalTimeSec: Math.max(1, Math.round(snapshotState.totalTimeMs / 1000)),
        board: boardToSnapshot(snapshotState.board),
        matchesCompleted: snapshotState.matches,
        splitsCompleted: snapshotState.splits,
        selectedCoord: snapshotState.selected,
      };
      saveActiveSession('onet', session);
    },
    [dailyDateKey, saveActiveSession, themeKey],
  );

  const commitRoundResult = useCallback(
    (
      finalState: OnetGameState,
      isWinner: boolean,
    ): { payload: GameResultPayload; breakdown: RewardBreakdown } => {
      const totalBoostersUsed =
        (finalState.boostersUsed.hint ?? 0) +
        (finalState.boostersUsed.shuffle ?? 0) +
        (finalState.boostersUsed.extra_time ?? 0);

      const finalEval = computeOnetFinalScore({
        isWinner,
        accumulatedScore: finalState.score,
        remainingTimeMs: finalState.remainingTimeMs,
        totalTimeMs: finalState.totalTimeMs,
        mistakes: finalState.mistakes,
        totalBoostersUsed,
        thresholds: finalState.config.stars,
      });

      const payload: GameResultPayload = {
        game: 'onet',
        runId: finalState.runId,
        level: finalState.config.level,
        isWinner,
        isFlawless: finalEval.isFlawless,
        stars: finalEval.stars,
        score: finalEval.score,
        timeElapsedMs: Math.max(0, Math.round(finalState.elapsedPlayTimeMs)),
        remainingTimeSec: Math.max(0, Math.floor(finalState.remainingTimeMs / 1000)),
        totalTimeSec: Math.max(1, Math.round(finalState.totalTimeMs / 1000)),
        matches: finalState.matches,
        splits: finalState.splits,
        highestCombo: finalState.highestCombo,
        mistakes: finalState.mistakes,
        boostersUsed: { ...finalState.boostersUsed },
        isDailyChallenge: finalState.config.mode === 'daily',
        dailyDateKey,
      };

      saveActiveSession('onet', null);

      let breakdown = RewardEngine.previewRoundResult(saveData, payload).breakdown;
      if (submittedRunIdRef.current !== finalState.runId) {
        submittedRunIdRef.current = finalState.runId;
        if (options.onGameComplete) {
          options.onGameComplete(payload);
        } else {
          const committed = RewardEngine.commitRoundResult(engine, payload);
          breakdown = committed.breakdown;
        }
      }

      return { payload, breakdown };
    },
    [dailyDateKey, engine, options, saveActiveSession, saveData],
  );

  // Trigger Onet gameplay BGM cleanly on mount
  useEffect(() => {
    playGameBgm();
  }, [playGameBgm]);

  // Re-initialize cleanly when requested level/mode changes
  const prevLevelKeyRef = useRef<string>(`${options.level}:${mode}:${dailyDateKey ?? ''}`);
  useEffect(() => {
    const nextKey = `${options.level}:${mode}:${dailyDateKey ?? ''}`;
    if (prevLevelKeyRef.current === nextKey) return;
    prevLevelKeyRef.current = nextKey;

    epochRef.current += 1;
    clearPendingTimers();
    lastTickPerfRef.current = null;
    submittedRunIdRef.current = null;

    setState(
      buildInitialGameState(
        options.level,
        mode,
        dailyDateKey,
        themeKey,
        tilePool,
        skillRating,
        consecutiveFailures,
        getActiveSession('onet'),
      ),
    );
  }, [
    clearPendingTimers,
    consecutiveFailures,
    dailyDateKey,
    getActiveSession,
    mode,
    options.level,
    skillRating,
    themeKey,
    tilePool,
  ]);

  // Paused-safe high-precision timer loop
  useEffect(() => {
    const intervalId = setInterval(() => {
      const current = stateRef.current;
      if (current.phase !== 'playing' || isAppBackgroundedRef.current) {
        lastTickPerfRef.current = null;
        return;
      }

      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      if (lastTickPerfRef.current === null) {
        lastTickPerfRef.current = now;
        return;
      }

      const deltaMs = Math.max(0, Math.min(500, now - lastTickPerfRef.current));
      lastTickPerfRef.current = now;
      if (deltaMs === 0) return;

      const nextRemaining = Math.max(0, current.remainingTimeMs - deltaMs);
      const nextElapsed = current.elapsedPlayTimeMs + deltaMs;

      if (nextRemaining <= 0) {
        epochRef.current += 1;
        clearPendingTimers();
        playSfx('lose');
        triggerHaptic('invalidMove');

        const lostDraft: OnetGameState = {
          ...current,
          phase: 'lost',
          remainingTimeMs: 0,
          elapsedPlayTimeMs: nextElapsed,
          selected: null,
          hint: null,
        };
        const { payload, breakdown } = commitRoundResult(lostDraft, false);
        setState({
          ...lostDraft,
          score: payload.score,
          lastResult: payload,
          lastBreakdown: breakdown,
        });
        return;
      }

      setState((prev) => {
        if (prev.phase !== 'playing') return prev;
        return {
          ...prev,
          remainingTimeMs: Math.max(0, prev.remainingTimeMs - deltaMs),
          elapsedPlayTimeMs: prev.elapsedPlayTimeMs + deltaMs,
        };
      });
    }, 100);

    return () => clearInterval(intervalId);
  }, [clearPendingTimers, commitRoundResult, playSfx, triggerHaptic]);

  // Android Capacitor lifecycle & browser visibility pause safety
  useEffect(() => {
    const handleAppPause = () => {
      isAppBackgroundedRef.current = true;
      lastTickPerfRef.current = null;
      pauseAudio();
      const curr = stateRef.current;
      if (curr.phase === 'playing') {
        const pausedState: OnetGameState = { ...curr, phase: 'paused' };
        persistSnapshot(pausedState);
        setState((prev) => (prev.phase === 'playing' ? { ...prev, phase: 'paused' } : prev));
      } else if (curr.phase === 'paused') {
        persistSnapshot(curr);
      }
    };

    const handleAppResume = () => {
      isAppBackgroundedRef.current = false;
      lastTickPerfRef.current = null;
      resumeAudio();
    };

    const offPause = CapacitorBridge.onPause(handleAppPause);
    const offResume = CapacitorBridge.onResume(handleAppResume);

    return () => {
      offPause();
      offResume();
      clearPendingTimers();
      const curr = stateRef.current;
      if (curr.phase === 'playing' || curr.phase === 'paused') {
        persistSnapshot(curr);
      }
    };
  }, [clearPendingTimers, pauseAudio, persistSnapshot, resumeAudio]);

  const triggerAutoDeadlockShuffle = useCallback(
    (boardToShuffle: OnetBoard, expectedEpoch: number) => {
      setState((prev) => ({
        ...prev,
        phase: 'shuffling',
        selected: null,
        hint: null,
      }));
      playSfx('shuffle');

      scheduleSafeTimeout(ONET_TIMINGS.shufflePreDelayMs, expectedEpoch, () => {
        const current = stateRef.current;
        const shuffled = guaranteedShuffle(boardToShuffle, {
          gravityMode: current.config.gravityMode,
          activeThemeKey: themeKey,
        });

        setState((prev) => ({
          ...prev,
          board: shuffled,
          autoShuffles: prev.autoShuffles + 1,
          // Preserve active combo window during forced deadlock shuffle
          comboExpiresAtMs:
            prev.combo > 0
              ? Date.now() + ONET_SCORING_CONFIG.comboWindowMs
              : prev.comboExpiresAtMs,
        }));

        scheduleSafeTimeout(ONET_TIMINGS.shuffleMs, expectedEpoch, () => {
          setState((prev) =>
            prev.phase === 'shuffling' ? { ...prev, phase: 'playing' } : prev,
          );
        });
      });
    },
    [playSfx, scheduleSafeTimeout, themeKey],
  );

  const selectTile = useCallback(
    (coord: GridCoord) => {
      const current = stateRef.current;
      if (current.phase !== 'playing') return;

      const clickedCell = current.board[coord.r]?.[coord.c];
      if (!clickedCell || isBlockerCell(clickedCell)) return;

      const masterCoord = resolveMasterCoord(current.board, coord.r, coord.c);
      if (!masterCoord) return;

      // Deselect when tapping the same tile
      if (
        current.selected &&
        current.selected.r === masterCoord.r &&
        current.selected.c === masterCoord.c
      ) {
        playSfx('click');
        triggerHaptic('tileSelect');
        setState((prev) => ({ ...prev, selected: null }));
        return;
      }

      // First selection
      if (!current.selected) {
        playSfx('select');
        triggerHaptic('tileSelect');
        setState((prev) => ({ ...prev, selected: masterCoord, errorPair: null }));
        return;
      }

      // Second selection — validate path
      const firstCoord = current.selected;
      const pathResult = getPath(current.board, firstCoord, masterCoord);

      if (!pathResult) {
        playWrong();
        triggerHaptic('invalidMove');
        const expectedEpoch = epochRef.current;
        const errorPair: [GridCoord, GridCoord] = [firstCoord, masterCoord];

        setState((prev) => ({
          ...prev,
          selected: null,
          combo: 0,
          comboExpiresAtMs: 0,
          mistakes: prev.mistakes + 1,
          errorPair,
        }));

        scheduleSafeTimeout(ONET_TIMINGS.errorShakeMs, expectedEpoch, () => {
          setState((prev) => ({ ...prev, errorPair: null }));
        });
        return;
      }

      // Valid match!
      const nowMs = Date.now();
      const isComboActive = current.combo > 0 && nowMs <= current.comboExpiresAtMs;
      const firstMaster = current.board[firstCoord.r]?.[firstCoord.c];
      const secondMaster = current.board[masterCoord.r]?.[masterCoord.c];
      const span = isMasterCell(firstMaster)
        ? groupSize(firstMaster)
        : { rowSpan: 1 as const, colSpan: 1 as const };
      const footprint =
        span.rowSpan === 2 && span.colSpan === 2
          ? '2x2'
          : span.rowSpan === 1 && span.colSpan === 2
            ? '1x2'
            : span.rowSpan === 2 && span.colSpan === 1
              ? '2x1'
              : '1x1';

      const scoreGain = computeMatchScore({
        footprint,
        currentCombo: current.combo,
        isComboActive,
      });

      const clearedOutcome = clearMatchedGroups(current.board, firstCoord, masterCoord);
      const isSplit = clearedOutcome.splitCount > 0;

      const bursts: OnetBurstEvent[] = [];
      if (isMasterCell(firstMaster)) {
        const sA = groupSize(firstMaster);
        bursts.push({
          id: `burst-${nowMs}-a-${firstMaster.id}`,
          r: firstCoord.r,
          c: firstCoord.c,
          rowSpan: sA.rowSpan,
          colSpan: sA.colSpan,
          icon: firstMaster.icon,
          isSplit,
          accentHex: options.accentHex,
        });
      }
      if (isMasterCell(secondMaster)) {
        const sB = groupSize(secondMaster);
        bursts.push({
          id: `burst-${nowMs}-b-${secondMaster.id}`,
          r: masterCoord.r,
          c: masterCoord.c,
          rowSpan: sB.rowSpan,
          colSpan: sB.colSpan,
          icon: secondMaster.icon,
          isSplit,
          accentHex: options.accentHex,
        });
      }

      const activePath: OnetPathEffectState = {
        id: `path-${nowMs}`,
        points: pathResult.points,
        turns: pathResult.turns,
        isSplit,
        accentHex: options.accentHex,
      };

      if (isSplit) {
        playSfx('split');
      } else {
        playComboMatch(scoreGain.nextCombo);
      }
      triggerHaptic(scoreGain.nextCombo >= 3 ? 'comboOrSpecial' : 'matchClear');

      const expectedEpoch = epochRef.current;
      const nextMatches = current.matches + 1;
      const nextSplits = current.splits + clearedOutcome.splitCount;
      const nextHighestCombo = Math.max(current.highestCombo, scoreGain.nextCombo);

      setState((prev) => ({
        ...prev,
        phase: 'matching',
        selected: null,
        hint: null,
        errorPair: null,
        activePath,
        bursts,
        score: prev.score + scoreGain.totalPoints,
        combo: scoreGain.nextCombo,
        highestCombo: nextHighestCombo,
        comboExpiresAtMs: nowMs + ONET_SCORING_CONFIG.comboWindowMs,
        matches: nextMatches,
        splits: nextSplits,
      }));

      scheduleSafeTimeout(ONET_TIMINGS.totalMatchLockMs, expectedEpoch, () => {
        const gravityApplied = applyGravity(
          clearedOutcome.board,
          current.config.gravityMode,
          nextMatches - 1,
        );
        const remainingMasters = countRemainingMasters(gravityApplied.board);

        if (remainingMasters === 0) {
          playSfx('win');
          triggerHaptic('levelVictory');
          const latest = stateRef.current;
          const wonDraft: OnetGameState = {
            ...latest,
            phase: 'won',
            board: gravityApplied.board,
            activePath: null,
            bursts: [],
            remainingTileCount: 0,
          };
          const { payload, breakdown } = commitRoundResult(wonDraft, true);
          setState({
            ...wonDraft,
            score: payload.score,
            lastResult: payload,
            lastBreakdown: breakdown,
          });
          return;
        }

        const hasMove = findHint(gravityApplied.board) !== null;
        setState((prev) => {
          const updated: OnetGameState = {
            ...prev,
            phase: hasMove ? 'playing' : 'shuffling',
            board: gravityApplied.board,
            activePath: null,
            bursts: [],
            remainingTileCount: remainingMasters,
          };
          if (hasMove) persistSnapshot(updated);
          return updated;
        });

        if (!hasMove) {
          triggerAutoDeadlockShuffle(gravityApplied.board, expectedEpoch);
        }
      });
    },
    [
      commitRoundResult,
      options.accentHex,
      persistSnapshot,
      playComboMatch,
      playSfx,
      playWrong,
      scheduleSafeTimeout,
      triggerAutoDeadlockShuffle,
      triggerHaptic,
    ],
  );

  const consumeInventoryBooster = useCallback(
    (boosterId: OnetBoosterId): boolean => {
      const available = saveData.inventory.boosters[boosterId] ?? 0;
      if (available <= 0) return false;

      boosterOpCounterRef.current += 1;
      const res = executeTransaction({
        idempotencyKey: `booster:${stateRef.current.runId}:${boosterId}:${boosterOpCounterRef.current}`,
        type: 'STATE_UPDATE',
        label: `Onet ${boosterId}`,
        mutate: (draft) => {
          const curr = draft.inventory.boosters[boosterId] ?? 0;
          if (curr <= 0) return;
          draft.inventory.boosters[boosterId] = curr - 1;
        },
      });
      return res.success;
    },
    [executeTransaction, saveData.inventory.boosters],
  );

  const useHintBooster = useCallback((): boolean => {
    const current = stateRef.current;
    if (current.phase !== 'playing') return false;
    // Double-tap guard: do not consume a second hint if one is already shown
    if (current.hint !== null) return false;

    const hintResult: OnetHint | null = findHint(current.board);
    if (!hintResult) return false;
    if (!consumeInventoryBooster('hint')) return false;

    playSfx('hint');
    triggerHaptic('uiTap');

    setState((prev) => {
      const next: OnetGameState = {
        ...prev,
        hint: hintResult,
        selected: null,
        boostersUsed: {
          ...prev.boostersUsed,
          hint: (prev.boostersUsed.hint ?? 0) + 1,
        },
      };
      persistSnapshot(next);
      return next;
    });
    return true;
  }, [consumeInventoryBooster, persistSnapshot, playSfx, triggerHaptic]);

  const useShuffleBooster = useCallback((): boolean => {
    const current = stateRef.current;
    if (current.phase !== 'playing') return false;
    if (!consumeInventoryBooster('shuffle')) return false;

    const expectedEpoch = epochRef.current;
    playSfx('shuffle');
    triggerHaptic('uiTap');

    setState((prev) => ({
      ...prev,
      phase: 'shuffling',
      selected: null,
      hint: null,
      boostersUsed: {
        ...prev.boostersUsed,
        shuffle: (prev.boostersUsed.shuffle ?? 0) + 1,
      },
    }));

    scheduleSafeTimeout(ONET_TIMINGS.shufflePreDelayMs, expectedEpoch, () => {
      const latest = stateRef.current;
      const shuffled = guaranteedShuffle(latest.board, {
        gravityMode: latest.config.gravityMode,
        activeThemeKey: themeKey,
      });

      setState((prev) => ({
        ...prev,
        board: shuffled,
      }));

      scheduleSafeTimeout(ONET_TIMINGS.shuffleMs, expectedEpoch, () => {
        setState((prev) => {
          if (prev.phase !== 'shuffling') return prev;
          const resumed: OnetGameState = { ...prev, phase: 'playing' };
          persistSnapshot(resumed);
          return resumed;
        });
      });
    });

    return true;
  }, [
    consumeInventoryBooster,
    persistSnapshot,
    playSfx,
    scheduleSafeTimeout,
    themeKey,
    triggerHaptic,
  ]);

  const useExtraTimeBooster = useCallback((): boolean => {
    const current = stateRef.current;
    if (current.phase !== 'playing') return false;
    if (!consumeInventoryBooster('extra_time')) return false;

    playSfx('uiReward');
    triggerHaptic('uiTap');

    const bonusMs = ONET_SCORING_CONFIG.extraTimeBoosterSec * 1000;
    setState((prev) => {
      const next: OnetGameState = {
        ...prev,
        remainingTimeMs: prev.remainingTimeMs + bonusMs,
        boostersUsed: {
          ...prev.boostersUsed,
          extra_time: (prev.boostersUsed.extra_time ?? 0) + 1,
        },
      };
      persistSnapshot(next);
      return next;
    });
    return true;
  }, [consumeInventoryBooster, persistSnapshot, playSfx, triggerHaptic]);

  const pauseGame = useCallback(() => {
    lastTickPerfRef.current = null;
    setState((prev) => {
      if (prev.phase !== 'playing') return prev;
      const paused: OnetGameState = { ...prev, phase: 'paused' };
      persistSnapshot(paused);
      return paused;
    });
  }, [persistSnapshot]);

  const resumeGame = useCallback(() => {
    lastTickPerfRef.current = null;
    setState((prev) => {
      if (prev.phase !== 'paused') return prev;
      return { ...prev, phase: 'playing' };
    });
  }, []);

  const restartGame = useCallback(() => {
    epochRef.current += 1;
    clearPendingTimers();
    lastTickPerfRef.current = null;
    submittedRunIdRef.current = null;
    saveActiveSession('onet', null);

    setState(
      buildInitialGameState(
        options.level,
        mode,
        dailyDateKey,
        themeKey,
        tilePool,
        skillRating,
        consecutiveFailures,
        null,
      ),
    );
  }, [
    clearPendingTimers,
    consecutiveFailures,
    dailyDateKey,
    mode,
    options.level,
    saveActiveSession,
    skillRating,
    themeKey,
    tilePool,
  ]);

  const boostersInventory = useMemo<Record<OnetBoosterId, number>>(
    () => ({
      hint: saveData.inventory.boosters.hint ?? 0,
      shuffle: saveData.inventory.boosters.shuffle ?? 0,
      extra_time: saveData.inventory.boosters.extra_time ?? 0,
    }),
    [saveData.inventory.boosters],
  );

  const isLowTimeWarning =
    saveData.settings.display.showTimerWarning &&
    state.phase === 'playing' &&
    state.remainingTimeMs > 0 &&
    state.remainingTimeMs <= ONET_SCORING_CONFIG.lowTimeWarningThresholdSec * 1000;

  return {
    state,
    boostersInventory,
    isLowTimeWarning,
    selectTile,
    useHintBooster,
    useShuffleBooster,
    useExtraTimeBooster,
    pauseGame,
    resumeGame,
    restartGame,
  };
}
