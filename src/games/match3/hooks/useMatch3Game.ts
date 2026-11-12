/**
 * useMatch3Game — Stateful React Gameplay Orchestrator for Match 3.
 * Bridges pure Match 3 engine modules with PersistenceContext, ThemeContext,
 * AudioContext, HapticsEngine, and RewardEngine using monotonic epoch locking.
 * Owned by @match3-eng.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  computeMatch3DropDurationMs,
  MATCH3_TIMINGS,
} from '@/config/audioFeel.config';
import {
  MATCH3_FALLBACK_TILE_POOL,
  MATCH3_SCORING_CONFIG,
  resolveMatch3DdaBracket,
} from '@/config/match3.config';
import { useAudio } from '@/services/audio/AudioContext';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { RewardEngine } from '@/services/progression/RewardEngine';
import { useTheme } from '@/services/theme/ThemeContext';
import type {
  BoosterId,
  GameMode,
  GridCoord,
  Match3BoosterId,
} from '@/types/game.types';
import type {
  Match3Board,
  Match3Cell,
  Match3LevelConfig,
  Match3Phase,
  Match3ProgressCounters,
  Match3SessionState,
  Match3VisualFxState,
  ObstacleType,
  SpecialTileType,
  SwapResolutionResult,
} from '@/types/match3.types';
import type {
  ActiveMatch3SessionState,
  Match3BlockerType,
  Match3CellSnapshot,
  Match3ObjectiveProgress,
  Match3SpecialType,
} from '@/types/persistence.types';
import { getTodayKey } from '@/utils/time';
import {
  createTileUidFactory,
  resolveBoosterImpact,
  resolveSwap,
} from '../engine/cascadeResolver';
import { findAllValidSwaps, hasValidMoves, shuffleMatch3Board } from '../engine/deadlockDetector';
import { generateMatch3Board } from '../engine/boardGenerator';
import { getDailyMatch3ChallengeConfig, getMatch3LevelConfig } from '../engine/levelGenerator';
import { isSolidBlocker, validateSwap } from '../engine/matchDetector';
import {
  buildMatch3ResultPayload,
  evaluateMissions,
} from '../engine/match3Scoring';

export interface UseMatch3GameOptions {
  level: number;
  mode: GameMode;
  isDailyChallenge?: boolean;
  dailyDateKey?: string;
}

export interface UseMatch3GameReturn {
  session: Match3SessionState;
  visualFx: Match3VisualFxState;
  boosterStock: Record<Match3BoosterId, number>;
  tileAssets: string[];
  surfaceUrl: string | null;
  isDarkMode: boolean;
  isReducedMotion: boolean;
  highContrastTiles: boolean;
  selectOrSwap: (r: number, c: number) => void;
  swipeSwap: (from: GridCoord, dr: number, dc: number) => void;
  triggerBooster: (booster: Match3BoosterId) => void;
  cancelBooster: () => void;
  togglePause: (forcePause?: boolean) => void;
  restartLevel: () => void;
}

const EMPTY_VISUAL_FX: Match3VisualFxState = {
  swappingPair: null,
  revertingPair: null,
  matchedCoords: [],
  blastedCoords: [],
  rainbowTargets: [],
  rainbowOrigin: null,
  bannerText: null,
  bannerKey: 0,
};

function createEmptyProgress(): Match3ProgressCounters {
  return {
    score: 0,
    tilesCleared: 0,
    colorCollected: {},
    iceDestroyed: 0,
    woodDestroyed: 0,
    metalDestroyed: 0,
    gemsCollected: 0,
    specialsCreated: 0,
    specialCombosTriggered: 0,
    obstaclesDestroyed: 0,
    movesUsed: 0,
  };
}

function toSpecialSnapshot(special: SpecialTileType): Match3SpecialType {
  switch (special) {
    case 'striped_h':
      return 'striped_h';
    case 'striped_v':
      return 'striped_v';
    case 'bomb_3x3':
      return 'wrapped';
    case 'rainbow':
      return 'color_bomb';
    default:
      return 'none';
  }
}

function fromSpecialSnapshot(special: Match3SpecialType): SpecialTileType {
  switch (special) {
    case 'striped_h':
      return 'striped_h';
    case 'striped_v':
      return 'striped_v';
    case 'wrapped':
      return 'bomb_3x3';
    case 'color_bomb':
      return 'rainbow';
    default:
      return 'none';
  }
}

function serializeCell(cell: Match3Cell): Match3CellSnapshot {
  let blocker: Match3BlockerType = 'none';
  let tileId: string | null = cell.tile ? String(cell.tile.colorIndex) : null;

  if (cell.obstacle === 'ice') blocker = 'ice_1';
  else if (cell.obstacle === 'wood') blocker = 'wood';
  else if (cell.obstacle === 'stone') blocker = 'stone';
  else if (cell.obstacle === 'metal-2') {
    blocker = 'ice_2';
    tileId = 'obs:metal-2';
  } else if (cell.obstacle === 'metal-1') {
    blocker = 'honey';
    tileId = 'obs:metal-1';
  } else if (cell.obstacle === 'gem') {
    tileId = 'gem';
  }

  return {
    tileId,
    special: cell.tile ? toSpecialSnapshot(cell.tile.special) : 'none',
    blocker,
    isHole: cell.isHole,
  };
}

function deserializeBoard(
  snapshot: Match3CellSnapshot[][],
  uidGen: () => string,
): Match3Board {
  return snapshot.map((row, r) =>
    row.map((cell, c) => {
      let obstacle: ObstacleType = '';
      if (cell.blocker === 'ice_1') obstacle = 'ice';
      else if (cell.blocker === 'wood') obstacle = 'wood';
      else if (cell.blocker === 'stone') obstacle = 'stone';
      else if (cell.blocker === 'ice_2' || cell.tileId === 'obs:metal-2') obstacle = 'metal-2';
      else if (cell.blocker === 'honey' || cell.tileId === 'obs:metal-1') obstacle = 'metal-1';
      else if (cell.tileId === 'gem') obstacle = 'gem';

      const hasTile =
        !cell.isHole &&
        !isSolidBlocker(obstacle) &&
        cell.tileId !== null;

      const parsedColor =
        cell.tileId === 'gem' || cell.special === 'color_bomb'
          ? -1
          : Number(cell.tileId);

      return {
        r,
        c,
        isHole: Boolean(cell.isHole),
        obstacle,
        tile: hasTile
          ? {
              uid: uidGen(),
              colorIndex: Number.isFinite(parsedColor) ? parsedColor : 0,
              special: fromSpecialSnapshot(cell.special),
              dropRows: 0,
              isNewSpawn: false,
            }
          : null,
      };
    }),
  );
}

function serializeProgressMeta(
  progress: Match3ProgressCounters,
  matchesCount: number,
): Match3ObjectiveProgress[] {
  const entries: Match3ObjectiveProgress[] = [
    { type: 'score', targetId: 'meta:score', current: progress.score, target: 0 },
    { type: 'collect_tile', targetId: 'meta:tilesCleared', current: progress.tilesCleared, target: 0 },
    { type: 'clear_blocker', targetId: 'meta:ice', current: progress.iceDestroyed, target: 0 },
    { type: 'clear_blocker', targetId: 'meta:wood', current: progress.woodDestroyed, target: 0 },
    { type: 'clear_blocker', targetId: 'meta:metal', current: progress.metalDestroyed, target: 0 },
    { type: 'collect_tile', targetId: 'meta:gems', current: progress.gemsCollected, target: 0 },
    { type: 'use_special', targetId: 'meta:specials', current: progress.specialsCreated, target: 0 },
    { type: 'use_special', targetId: 'meta:combos', current: progress.specialCombosTriggered, target: 0 },
    { type: 'clear_blocker', targetId: 'meta:obstacles', current: progress.obstaclesDestroyed, target: 0 },
    { type: 'use_special', targetId: 'meta:matches', current: matchesCount, target: 0 },
  ];

  for (const [colorIdx, count] of Object.entries(progress.colorCollected)) {
    entries.push({
      type: 'collect_tile',
      targetId: `meta:color:${colorIdx}`,
      current: count,
      target: 0,
    });
  }

  return entries;
}

function deserializeProgressMeta(
  entries: Match3ObjectiveProgress[],
  scoreFallback: number,
  movesUsed: number,
): { progress: Match3ProgressCounters; matchesCount: number } {
  const progress = createEmptyProgress();
  progress.score = scoreFallback;
  progress.movesUsed = movesUsed;
  let matchesCount = 0;

  for (const item of entries) {
    if (!item.targetId) continue;
    if (item.targetId === 'meta:score') progress.score = item.current;
    else if (item.targetId === 'meta:tilesCleared') progress.tilesCleared = item.current;
    else if (item.targetId === 'meta:ice') progress.iceDestroyed = item.current;
    else if (item.targetId === 'meta:wood') progress.woodDestroyed = item.current;
    else if (item.targetId === 'meta:metal') progress.metalDestroyed = item.current;
    else if (item.targetId === 'meta:gems') progress.gemsCollected = item.current;
    else if (item.targetId === 'meta:specials') progress.specialsCreated = item.current;
    else if (item.targetId === 'meta:combos') progress.specialCombosTriggered = item.current;
    else if (item.targetId === 'meta:obstacles') progress.obstaclesDestroyed = item.current;
    else if (item.targetId === 'meta:matches') matchesCount = item.current;
    else if (item.targetId.startsWith('meta:color:')) {
      const colorIdx = Number(item.targetId.slice('meta:color:'.length));
      if (Number.isFinite(colorIdx)) {
        progress.colorCollected[colorIdx] = item.current;
      }
    }
  }

  return { progress, matchesCount };
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function resolveCascadeBanner(comboCount: number, isComboFusion: boolean): string | null {
  if (isComboFusion) return 'KOMBO SPESIAL!';
  if (comboCount >= 5) return 'LUAR BIASA!';
  if (comboCount === 4) return 'HEBAT SEKALI!';
  if (comboCount === 3) return 'MANTAP!';
  if (comboCount === 2) return 'BAGUS!';
  return null;
}

export function useMatch3Game(options: UseMatch3GameOptions): UseMatch3GameReturn {
  const {
    engine,
    saveData,
    executeTransaction,
    saveActiveSession,
    getActiveSession,
  } = usePersistence();
  const {
    activeMatch3Theme,
    activeSurface,
    getTilesForGame,
    isDarkMode,
    isReducedMotion,
  } = useTheme();
  const {
    playGameBgm,
    playSfx,
    playComboMatch,
    playWrong,
    triggerHaptic,
  } = useAudio();

  const isDaily = options.isDailyChallenge || options.mode === 'daily';
  const effectiveDailyDateKey = isDaily ? (options.dailyDateKey ?? getTodayKey()) : null;

  const tileAssets = useMemo(() => {
    const resolved = getTilesForGame('match3');
    return resolved.length >= 6 ? resolved : [...MATCH3_FALLBACK_TILE_POOL];
  }, [getTilesForGame]);

  const ddaBracket = useMemo(() => {
    const skill = saveData.progression.match3.skillRating;
    const lvlRecord = saveData.progression.match3.levels[options.level];
    const consecutiveFails = lvlRecord?.consecutiveFailures ?? 0;
    return resolveMatch3DdaBracket(skill, consecutiveFails);
  }, [saveData.progression.match3, options.level]);

  const createInitialSession = useCallback(
    (forceFresh = false): { session: Match3SessionState; matchesCount: number; mistakes: number } => {
      const config: Match3LevelConfig = isDaily && effectiveDailyDateKey
        ? getDailyMatch3ChallengeConfig(effectiveDailyDateKey, ddaBracket)
        : getMatch3LevelConfig(options.level, ddaBracket);

      const saved = !forceFresh ? getActiveSession('match3') : null;
      const canResume =
        saved !== null &&
        saved.gameId === 'match3' &&
        saved.level === config.level &&
        saved.isDailyChallenge === isDaily &&
        (!isDaily || saved.dailyChallengeDateKey === effectiveDailyDateKey) &&
        saved.movesRemaining > 0 &&
        saved.board.length === config.rows;

      if (canResume && saved) {
        const uidGen = createTileUidFactory('resume');
        const restoredBoard = deserializeBoard(saved.board, uidGen);
        const movesUsed = Math.max(0, saved.totalMoves - saved.movesRemaining);
        const { progress, matchesCount } = deserializeProgressMeta(
          saved.objectives,
          saved.score,
          movesUsed,
        );
        const missionResults = evaluateMissions(config.missions, progress);

        return {
          matchesCount,
          mistakes: saved.mistakes,
          session: {
            runId: saved.runId,
            level: config.level,
            mode: options.mode,
            phase: 'idle',
            config: { ...config, maxMoves: saved.totalMoves },
            board: restoredBoard,
            score: saved.score,
            movesUsed,
            movesRemaining: saved.movesRemaining,
            combo: saved.combo,
            highestCombo: saved.highestCombo,
            cascadesTriggered: saved.cascadesTriggered,
            selectedCoord: null,
            hintMove: null,
            activeBooster: null,
            boostersUsed: { ...(saved.boostersUsed as Partial<Record<Match3BoosterId, number>>) },
            progress,
            missionResults,
            startedAtMs: Date.now() - saved.elapsedMs,
            elapsedMs: saved.elapsedMs,
            lastResult: null,
          },
        };
      }

      const board = generateMatch3Board(config);
      const progress = createEmptyProgress();
      return {
        matchesCount: 0,
        mistakes: 0,
        session: {
          runId: `m3_${config.level}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          level: config.level,
          mode: options.mode,
          phase: 'idle',
          config,
          board,
          score: 0,
          movesUsed: 0,
          movesRemaining: config.maxMoves,
          combo: 0,
          highestCombo: 0,
          cascadesTriggered: 0,
          selectedCoord: null,
          hintMove: null,
          activeBooster: null,
          boostersUsed: {},
          progress,
          missionResults: evaluateMissions(config.missions, progress),
          startedAtMs: Date.now(),
          elapsedMs: 0,
          lastResult: null,
        },
      };
    },
    [ddaBracket, effectiveDailyDateKey, getActiveSession, isDaily, options.level, options.mode],
  );

  const initialBundle = useMemo(() => createInitialSession(false), [createInitialSession]);
  const [session, setSession] = useState<Match3SessionState>(initialBundle.session);
  const [visualFx, setVisualFx] = useState<Match3VisualFxState>(EMPTY_VISUAL_FX);

  const sessionRef = useRef<Match3SessionState>(initialBundle.session);
  const matchesCountRef = useRef<number>(initialBundle.matchesCount);
  const mistakesRef = useRef<number>(initialBundle.mistakes);
  const epochRef = useRef<number>(1);
  const bannerSeqRef = useRef<number>(1);
  const uidFactoryRef = useRef<() => string>(createTileUidFactory('play'));
  const phaseBeforePauseRef = useRef<Match3Phase>('idle');
  const lastInteractionMsRef = useRef<number>(Date.now());
  const terminalCommittedRef = useRef<boolean>(false);

  const commitSession = useCallback((next: Match3SessionState) => {
    sessionRef.current = next;
    setSession(next);
  }, []);

  // Reinitialize when level or mode prop changes
  useEffect(() => {
    epochRef.current += 1;
    terminalCommittedRef.current = false;
    const fresh = createInitialSession(false);
    matchesCountRef.current = fresh.matchesCount;
    mistakesRef.current = fresh.mistakes;
    setVisualFx(EMPTY_VISUAL_FX);
    commitSession(fresh.session);
    lastInteractionMsRef.current = Date.now();
  }, [commitSession, createInitialSession]);

  // Start Match 3 BGM on mount
  useEffect(() => {
    playGameBgm();
    return () => {
      epochRef.current += 1;
    };
  }, [playGameBgm]);

  const persistSnapshot = useCallback(
    (state: Match3SessionState) => {
      if (state.phase === 'won' || state.phase === 'lost') {
        saveActiveSession('match3', null);
        return;
      }

      const elapsedMs = Math.max(0, Date.now() - state.startedAtMs);
      const snapshot: ActiveMatch3SessionState = {
        runId: state.runId,
        gameId: 'match3',
        level: state.config.level,
        isDailyChallenge: isDaily,
        dailyChallengeDateKey: effectiveDailyDateKey,
        themeId: activeMatch3Theme.id,
        score: state.score,
        combo: state.combo,
        highestCombo: state.highestCombo,
        elapsedMs,
        mistakes: mistakesRef.current,
        boostersUsed: { ...state.boostersUsed },
        rngState: 1,
        startedAt: state.startedAtMs,
        savedAt: Date.now(),
        movesRemaining: state.movesRemaining,
        totalMoves: state.config.maxMoves,
        board: state.board.map((row) => row.map(serializeCell)),
        objectives: serializeProgressMeta(state.progress, matchesCountRef.current),
        starThresholds: state.config.starScoreThresholds,
        cascadesTriggered: state.cascadesTriggered,
      };
      saveActiveSession('match3', snapshot);
    },
    [activeMatch3Theme.id, effectiveDailyDateKey, isDaily, saveActiveSession],
  );

  // Auto-save snapshot when app backgrounds
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        persistSnapshot(sessionRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [persistSnapshot]);

  // Idle Hint timer
  useEffect(() => {
    if (session.phase !== 'idle') return;
    const configuredSec = saveData.settings.display.showHintPromptAfterIdleSec;
    const delayMs =
      configuredSec > 0 ? configuredSec * 1000 : MATCH3_SCORING_CONFIG.idleHintDelayMs;

    const timer = window.setTimeout(() => {
      const current = sessionRef.current;
      if (current.phase !== 'idle' || current.hintMove) return;
      const validMoves = findAllValidSwaps(current.board);
      if (validMoves.length > 0) {
        commitSession({
          ...current,
          hintMove: validMoves[0],
        });
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    session.phase,
    session.movesUsed,
    session.hintMove,
    saveData.settings.display.showHintPromptAfterIdleSec,
    commitSession,
  ]);

  const timeScale = isReducedMotion ? 0.35 : 1;
  const scaledMs = useCallback(
    (ms: number) => Math.max(16, Math.round(ms * timeScale)),
    [timeScale],
  );

  const finalizeRound = useCallback(
    async (finalState: Match3SessionState, isWinner: boolean, epoch: number) => {
      if (epochRef.current !== epoch || terminalCommittedRef.current) return;
      terminalCommittedRef.current = true;

      const finalElapsedMs = Math.max(1000, Date.now() - finalState.startedAtMs);
      const missionResults = evaluateMissions(
        finalState.config.missions,
        finalState.progress,
      );
      const payload = buildMatch3ResultPayload({
        runId: finalState.runId,
        config: finalState.config,
        isWinner,
        score: finalState.score,
        timeElapsedMs: finalElapsedMs,
        movesUsed: finalState.movesUsed,
        movesRemaining: finalState.movesRemaining,
        matches: matchesCountRef.current,
        highestCombo: finalState.highestCombo,
        mistakes: mistakesRef.current,
        progress: finalState.progress,
        missionResults,
        boostersUsed: finalState.boostersUsed,
        isDailyChallenge: isDaily,
        dailyDateKey: effectiveDailyDateKey,
      });

      playSfx(isWinner ? 'win' : 'lose');
      if (isWinner) triggerHaptic('levelVictory');

      saveActiveSession('match3', null);
      const commitRes = await RewardEngine.commitRoundResult(engine, payload);

      if (epochRef.current !== epoch) return;
      const terminalState: Match3SessionState = {
        ...finalState,
        phase: isWinner ? 'won' : 'lost',
        elapsedMs: finalElapsedMs,
        missionResults,
        lastResult: {
          payload,
          breakdown: commitRes.breakdown,
        },
      };
      commitSession(terminalState);
    },
    [
      commitSession,
      effectiveDailyDateKey,
      engine,
      isDaily,
      playSfx,
      saveActiveSession,
      triggerHaptic,
    ],
  );

  const animateResolution = useCallback(
    async (
      result: SwapResolutionResult,
      startingState: Match3SessionState,
      swappedPair: { from: GridCoord; to: GridCoord } | null,
      epoch: number,
    ) => {
      let currentState = startingState;

      if (swappedPair) {
        currentState = {
          ...currentState,
          phase: 'swapping',
          selectedCoord: null,
          hintMove: null,
          activeBooster: null,
        };
        commitSession(currentState);
        setVisualFx({
          ...EMPTY_VISUAL_FX,
          swappingPair: swappedPair,
        });
        await sleepMs(scaledMs(MATCH3_TIMINGS.swapSpringMs));
        if (epochRef.current !== epoch) return;
      }

      let runningScore = currentState.score;
      let runningCombo = 0;
      let highestCombo = currentState.highestCombo;
      let totalCascades = currentState.cascadesTriggered;
      const progress: Match3ProgressCounters = {
        ...currentState.progress,
        colorCollected: { ...currentState.progress.colorCollected },
      };

      if (result.isSpecialCombo) {
        progress.specialCombosTriggered += 1;
      }

      for (let i = 0; i < result.waves.length; i++) {
        if (epochRef.current !== epoch) return;
        const wave = result.waves[i];
        runningCombo = i + 1;
        highestCombo = Math.max(highestCombo, runningCombo);
        if (i > 0) totalCascades += 1;

        matchesCountRef.current += Math.max(1, wave.clearedCoords.length > 0 ? 1 : 0);
        runningScore += wave.scoreDelta;

        progress.score = runningScore;
        progress.tilesCleared += wave.tilesClearedCount;
        progress.specialsCreated += wave.spawnedSpecials.length;
        progress.gemsCollected += wave.gemsCollectedCoords.length;

        for (const [colorKey, count] of Object.entries(wave.colorClearedCounts)) {
          const idx = Number(colorKey);
          progress.colorCollected[idx] = (progress.colorCollected[idx] ?? 0) + count;
        }
        for (const ev of wave.obstaclesDamaged) {
          if (ev.from === 'ice' && ev.to === '') {
            progress.iceDestroyed += 1;
            progress.obstaclesDestroyed += 1;
          } else if (ev.from === 'wood' && ev.to === '') {
            progress.woodDestroyed += 1;
            progress.obstaclesDestroyed += 1;
          } else if (ev.from === 'metal-1' && ev.to === '') {
            progress.metalDestroyed += 1;
            progress.obstaclesDestroyed += 1;
          } else if (ev.from === 'stone' && ev.to === '') {
            progress.obstaclesDestroyed += 1;
          }
        }

        const banner = resolveCascadeBanner(
          runningCombo,
          i === 0 && result.isSpecialCombo,
        );

        // Phase 1: Flash matched/blasted cells
        const hasRainbow = wave.triggeredSpecials.some((s) => s.type === 'rainbow');
        const hasBomb = wave.triggeredSpecials.some((s) => s.type === 'bomb_3x3');
        const hasLine = wave.triggeredSpecials.some(
          (s) => s.type === 'striped_h' || s.type === 'striped_v',
        );

        if (hasRainbow) {
          playSfx('rainbow_zap');
          triggerHaptic('comboOrSpecial');
        } else if (hasBomb) {
          playSfx('bomb_blast');
          triggerHaptic('comboOrSpecial');
        } else if (hasLine) {
          playSfx('line_blast');
          triggerHaptic('comboOrSpecial');
        } else if (wave.spawnedSpecials.length > 0) {
          playSfx('special_spawn');
          triggerHaptic('comboOrSpecial');
        } else {
          playComboMatch(runningCombo);
          triggerHaptic(runningCombo >= 2 ? 'comboOrSpecial' : 'matchClear');
        }

        const nextBannerKey = banner ? bannerSeqRef.current++ : bannerSeqRef.current;
        const missionResults = evaluateMissions(currentState.config.missions, progress);

        currentState = {
          ...currentState,
          phase: 'flashing',
          score: runningScore,
          combo: runningCombo,
          highestCombo,
          cascadesTriggered: totalCascades,
          progress: { ...progress, colorCollected: { ...progress.colorCollected } },
          missionResults,
        };
        commitSession(currentState);
        setVisualFx({
          ...EMPTY_VISUAL_FX,
          matchedCoords: wave.clearedCoords,
          blastedCoords: wave.blastedCoords,
          bannerText: banner,
          bannerKey: nextBannerKey,
        });

        const flashDuration = hasRainbow
          ? MATCH3_TIMINGS.rainbowZapMs
          : hasBomb
            ? MATCH3_TIMINGS.bombBlastMs
            : hasLine
              ? MATCH3_TIMINGS.lineBlastMs
              : MATCH3_TIMINGS.matchPopMs;
        await sleepMs(scaledMs(flashDuration));
        if (epochRef.current !== epoch) return;

        // Phase 2: Gravity & Refill drop
        let maxDrop = 1;
        for (const row of wave.boardAfterGravity) {
          for (const c of row) {
            if (c.tile && c.tile.dropRows > maxDrop) {
              maxDrop = c.tile.dropRows;
            }
          }
        }

        currentState = {
          ...currentState,
          phase: 'cascading',
          board: wave.boardAfterGravity,
        };
        commitSession(currentState);
        setVisualFx((prev) => ({
          ...prev,
          matchedCoords: [],
          blastedCoords: [],
          swappingPair: null,
          revertingPair: null,
        }));

        const dropDuration =
          computeMatch3DropDurationMs(maxDrop) + MATCH3_TIMINGS.reEvalPauseMs;
        await sleepMs(scaledMs(dropDuration));
        if (epochRef.current !== epoch) return;
      }

      // Ensure final settled board matches pure engine finalBoard
      let settledBoard = result.finalBoard;

      // Deadlock detection + auto-shuffle
      if (!hasValidMoves(settledBoard)) {
        currentState = {
          ...currentState,
          phase: 'shuffling',
          board: settledBoard,
        };
        commitSession(currentState);
        playSfx('shuffle');
        setVisualFx({
          ...EMPTY_VISUAL_FX,
          bannerText: 'Papan Diacak!',
          bannerKey: bannerSeqRef.current++,
        });
        await sleepMs(scaledMs(420));
        if (epochRef.current !== epoch) return;
        settledBoard = shuffleMatch3Board(settledBoard, currentState.config.tileColorCount);
      }

      const settledMissions = evaluateMissions(currentState.config.missions, progress);
      const primaryGoalMet = settledMissions[0];

      if (primaryGoalMet) {
        // Bonus drain for unused moves
        let bonusScore = runningScore;
        let movesLeft = currentState.movesRemaining;

        if (movesLeft > 0) {
          currentState = {
            ...currentState,
            phase: 'bonus_drain',
            board: settledBoard,
          };
          commitSession(currentState);
          setVisualFx({
            ...EMPTY_VISUAL_FX,
            bannerText: `Bonus +${movesLeft} Langkah!`,
            bannerKey: bannerSeqRef.current++,
          });

          const stepDelay = isReducedMotion ? 20 : 85;
          while (movesLeft > 0) {
            if (epochRef.current !== epoch) return;
            movesLeft -= 1;
            bonusScore += MATCH3_SCORING_CONFIG.unusedMoveBonus;
            progress.score = bonusScore;
            playSfx('uiReward');

            currentState = {
              ...currentState,
              phase: 'bonus_drain',
              score: bonusScore,
              movesRemaining: movesLeft,
              progress: { ...progress, colorCollected: { ...progress.colorCollected } },
              missionResults: evaluateMissions(currentState.config.missions, progress),
            };
            commitSession(currentState);
            await sleepMs(stepDelay);
          }
        }

        if (epochRef.current !== epoch) return;
        setVisualFx(EMPTY_VISUAL_FX);
        await finalizeRound(currentState, true, epoch);
        return;
      }

      if (currentState.movesRemaining <= 0) {
        setVisualFx(EMPTY_VISUAL_FX);
        const lostState: Match3SessionState = {
          ...currentState,
          board: settledBoard,
          combo: 0,
        };
        await finalizeRound(lostState, false, epoch);
        return;
      }

      const nextIdle: Match3SessionState = {
        ...currentState,
        phase: 'idle',
        board: settledBoard,
        combo: 0,
        selectedCoord: null,
        hintMove: null,
        activeBooster: null,
        missionResults: settledMissions,
        elapsedMs: Date.now() - currentState.startedAtMs,
      };
      setVisualFx(EMPTY_VISUAL_FX);
      commitSession(nextIdle);
      persistSnapshot(nextIdle);
    },
    [
      commitSession,
      finalizeRound,
      isReducedMotion,
      persistSnapshot,
      playComboMatch,
      playSfx,
      scaledMs,
      triggerHaptic,
    ],
  );

  const attemptSwap = useCallback(
    async (from: GridCoord, to: GridCoord) => {
      const current = sessionRef.current;
      if (current.phase !== 'idle' && current.phase !== 'ready') return;
      if (current.movesRemaining <= 0) return;

      lastInteractionMsRef.current = Date.now();
      const epoch = epochRef.current;

      const validation = validateSwap(current.board, from, to, current.phase);
      if (!validation.valid) {
        mistakesRef.current += 1;
        playWrong();
        triggerHaptic('invalidMove');

        commitSession({
          ...current,
          phase: 'reverting',
          selectedCoord: null,
          hintMove: null,
        });
        setVisualFx({
          ...EMPTY_VISUAL_FX,
          revertingPair: { from, to },
        });
        await sleepMs(scaledMs(MATCH3_TIMINGS.invalidSwapMs));
        if (epochRef.current !== epoch) return;

        setVisualFx(EMPTY_VISUAL_FX);
        commitSession({
          ...sessionRef.current,
          phase: 'idle',
          selectedCoord: null,
        });
        return;
      }

      playSfx('swap');
      const result = resolveSwap(
        current.board,
        from,
        to,
        current.config.tileColorCount,
        Math.random,
        uidFactoryRef.current,
      );

      if (!result.valid) {
        commitSession({ ...current, phase: 'idle', selectedCoord: null });
        return;
      }

      const nextMovesUsed = current.movesUsed + 1;
      const nextMovesRemaining = Math.max(0, current.movesRemaining - 1);
      const updatedState: Match3SessionState = {
        ...current,
        movesUsed: nextMovesUsed,
        movesRemaining: nextMovesRemaining,
        progress: {
          ...current.progress,
          colorCollected: { ...current.progress.colorCollected },
          movesUsed: nextMovesUsed,
        },
      };

      await animateResolution(result, updatedState, { from, to }, epoch);
    },
    [animateResolution, commitSession, playSfx, playWrong, scaledMs, triggerHaptic],
  );

  const consumeBoosterStock = useCallback(
    async (boosterId: Match3BoosterId): Promise<boolean> => {
      const currentStock = saveData.inventory.boosters[boosterId] ?? 0;
      if (currentStock <= 0) return false;

      const res = await executeTransaction({
        idempotencyKey: `m3_use_booster:${sessionRef.current.runId}:${boosterId}:${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'STATE_UPDATE',
        label: `Gunakan booster ${boosterId}`,
        mutate: (draft) => {
          const available = draft.inventory.boosters[boosterId as BoosterId] ?? 0;
          if (available <= 0) {
            throw new Error(`Booster ${boosterId} habis`);
          }
          draft.inventory.boosters[boosterId as BoosterId] = available - 1;
          draft.statistics.match3.boostersUsed += 1;
          draft.statistics.totalBoostersUsed += 1;
        },
      });
      return res.success;
    },
    [executeTransaction, saveData.inventory.boosters],
  );

  const executeTargetedBooster = useCallback(
    async (target: GridCoord, boosterType: 'hammer' | 'bomb') => {
      const current = sessionRef.current;
      if (current.phase !== 'idle') return;
      const targetCell = current.board[target.r]?.[target.c];
      if (!targetCell || targetCell.isHole) return;

      const consumed = await consumeBoosterStock(boosterType);
      if (!consumed) {
        playWrong();
        commitSession({ ...current, activeBooster: null });
        return;
      }

      const epoch = epochRef.current;
      const nextBoostersUsed = {
        ...current.boostersUsed,
        [boosterType]: (current.boostersUsed[boosterType] ?? 0) + 1,
      };
      const updatedState: Match3SessionState = {
        ...current,
        activeBooster: null,
        selectedCoord: null,
        hintMove: null,
        boostersUsed: nextBoostersUsed,
      };

      const impact = resolveBoosterImpact(
        current.board,
        target,
        boosterType,
        current.config.tileColorCount,
        Math.random,
        uidFactoryRef.current,
      );
      await animateResolution(impact, updatedState, null, epoch);
    },
    [animateResolution, commitSession, consumeBoosterStock, playWrong],
  );

  const selectOrSwap = useCallback(
    (r: number, c: number) => {
      const current = sessionRef.current;
      if (current.phase !== 'idle' && current.phase !== 'ready') return;

      const cell = current.board[r]?.[c];
      if (!cell || cell.isHole) return;

      lastInteractionMsRef.current = Date.now();

      if (current.activeBooster) {
        void executeTargetedBooster({ r, c }, current.activeBooster);
        return;
      }

      if (isSolidBlocker(cell.obstacle) || cell.obstacle === 'ice' || !cell.tile) {
        playWrong();
        triggerHaptic('invalidMove');
        return;
      }

      const prev = current.selectedCoord;
      if (!prev) {
        playSfx('select');
        triggerHaptic('tileSelect');
        commitSession({
          ...current,
          selectedCoord: { r, c },
          hintMove: null,
        });
        return;
      }

      if (prev.r === r && prev.c === c) {
        commitSession({ ...current, selectedCoord: null });
        return;
      }

      const isAdjacent = Math.abs(prev.r - r) + Math.abs(prev.c - c) === 1;
      if (!isAdjacent) {
        playSfx('select');
        triggerHaptic('tileSelect');
        commitSession({
          ...current,
          selectedCoord: { r, c },
          hintMove: null,
        });
        return;
      }

      void attemptSwap(prev, { r, c });
    },
    [attemptSwap, commitSession, executeTargetedBooster, playSfx, playWrong, triggerHaptic],
  );

  const swipeSwap = useCallback(
    (from: GridCoord, dr: number, dc: number) => {
      const current = sessionRef.current;
      if (current.phase !== 'idle' && current.phase !== 'ready') return;
      if (current.activeBooster) return;

      const to: GridCoord = { r: from.r + dr, c: from.c + dc };
      if (
        to.r < 0 ||
        to.r >= current.config.rows ||
        to.c < 0 ||
        to.c >= current.config.cols
      ) {
        return;
      }
      void attemptSwap(from, to);
    },
    [attemptSwap],
  );

  const triggerBooster = useCallback(
    (booster: Match3BoosterId) => {
      const current = sessionRef.current;
      if (current.phase !== 'idle') return;
      const stock = saveData.inventory.boosters[booster] ?? 0;
      if (stock <= 0) {
        playWrong();
        triggerHaptic('invalidMove');
        return;
      }

      if (booster === 'hammer' || booster === 'bomb') {
        playSfx('select');
        commitSession({
          ...current,
          selectedCoord: null,
          activeBooster: current.activeBooster === booster ? null : booster,
        });
        return;
      }

      if (booster === 'hint') {
        const moves = findAllValidSwaps(current.board);
        if (moves.length === 0) return;
        void (async () => {
          const ok = await consumeBoosterStock('hint');
          if (!ok) return;
          playSfx('hint');
          triggerHaptic('tileSelect');
          const latest = sessionRef.current;
          commitSession({
            ...latest,
            selectedCoord: null,
            activeBooster: null,
            hintMove: moves[0],
            boostersUsed: {
              ...latest.boostersUsed,
              hint: (latest.boostersUsed.hint ?? 0) + 1,
            },
          });
        })();
        return;
      }

      if (booster === 'shuffle') {
        void (async () => {
          const ok = await consumeBoosterStock('shuffle');
          if (!ok) return;
          const epoch = epochRef.current;
          playSfx('shuffle');
          triggerHaptic('comboOrSpecial');
          const shuffledBoard = shuffleMatch3Board(
            sessionRef.current.board,
            sessionRef.current.config.tileColorCount,
          );
          if (epochRef.current !== epoch) return;
          const nextState: Match3SessionState = {
            ...sessionRef.current,
            board: shuffledBoard,
            selectedCoord: null,
            hintMove: null,
            activeBooster: null,
            boostersUsed: {
              ...sessionRef.current.boostersUsed,
              shuffle: (sessionRef.current.boostersUsed.shuffle ?? 0) + 1,
            },
          };
          setVisualFx({
            ...EMPTY_VISUAL_FX,
            bannerText: 'Papan Diacak!',
            bannerKey: bannerSeqRef.current++,
          });
          commitSession(nextState);
          persistSnapshot(nextState);
          await sleepMs(500);
          if (epochRef.current === epoch) {
            setVisualFx(EMPTY_VISUAL_FX);
          }
        })();
      }
    },
    [
      commitSession,
      consumeBoosterStock,
      persistSnapshot,
      playSfx,
      playWrong,
      saveData.inventory.boosters,
      triggerHaptic,
    ],
  );

  const cancelBooster = useCallback(() => {
    const current = sessionRef.current;
    if (!current.activeBooster) return;
    commitSession({ ...current, activeBooster: null });
  }, [commitSession]);

  const togglePause = useCallback(
    (forcePause?: boolean) => {
      const current = sessionRef.current;
      if (current.phase === 'won' || current.phase === 'lost') return;

      const shouldPause =
        forcePause !== undefined ? forcePause : current.phase !== 'paused';

      if (shouldPause && current.phase !== 'paused') {
        phaseBeforePauseRef.current = current.phase === 'idle' ? 'idle' : 'idle';
        persistSnapshot(current);
        commitSession({
          ...current,
          phase: 'paused',
          elapsedMs: Date.now() - current.startedAtMs,
        });
      } else if (!shouldPause && current.phase === 'paused') {
        commitSession({
          ...current,
          phase: phaseBeforePauseRef.current,
          startedAtMs: Date.now() - current.elapsedMs,
        });
      }
    },
    [commitSession, persistSnapshot],
  );

  const restartLevel = useCallback(() => {
    epochRef.current += 1;
    terminalCommittedRef.current = false;
    saveActiveSession('match3', null);
    const fresh = createInitialSession(true);
    matchesCountRef.current = fresh.matchesCount;
    mistakesRef.current = fresh.mistakes;
    setVisualFx(EMPTY_VISUAL_FX);
    commitSession(fresh.session);
    lastInteractionMsRef.current = Date.now();
  }, [commitSession, createInitialSession, saveActiveSession]);

  const boosterStock: Record<Match3BoosterId, number> = useMemo(
    () => ({
      hint: saveData.inventory.boosters.hint ?? 0,
      shuffle: saveData.inventory.boosters.shuffle ?? 0,
      hammer: saveData.inventory.boosters.hammer ?? 0,
      bomb: saveData.inventory.boosters.bomb ?? 0,
    }),
    [saveData.inventory.boosters],
  );

  return {
    session,
    visualFx,
    boosterStock,
    tileAssets,
    surfaceUrl: activeSurface?.assetUrl ?? null,
    isDarkMode,
    isReducedMotion,
    highContrastTiles: saveData.settings.display.highContrastTiles,
    selectOrSwap,
    swipeSwap,
    triggerBooster,
    cancelBooster,
    togglePause,
    restartLevel,
  };
}
