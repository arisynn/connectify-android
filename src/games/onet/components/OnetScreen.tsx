/**
 * OnetScreen — Complete Portrait Gameplay Shell for Onet Connect.
 * Integrates HUD, OnetBoard, OnetBoosterDock, Pause/Result overlays,
 * Android hardware back button handling, and optional @game-feel FX layers.
 * Owned by @onet-eng.
 */

import React, { useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';
import { TileBurst } from '@/components/fx/TileBurst';
import { VictoryBurst } from '@/components/fx/VictoryBurst';
import { GameResultModal } from '@/components/game-hud';
import { CapacitorBridge } from '@/services/native/CapacitorBridge';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { useTheme } from '@/services/theme/ThemeContext';
import type { GameMode, GameResultPayload } from '@/types/game.types';
import type {
  OnetGravityMode,
  OnetPathLayerProps,
  TileBurstProps,
} from '@/types/onet.types';
import { formatDurationClock } from '@/utils/time';
import { useOnetGame } from '../hooks/useOnetGame';
import { OnetBoard } from './OnetBoard';
import { OnetBoosterDock } from './OnetBoosterDock';
import { OnetPathLayer } from './OnetPathLayer';

export interface OnetScreenProps {
  level: number;
  mode?: GameMode;
  dailyDateKey?: string | null;
  themeKey?: string;
  tilePool?: readonly string[];
  accentHex?: string;
  onExit: () => void;
  onPlayLevel?: (nextLevel: number, mode?: GameMode) => void;
  onNextLevel?: (nextLevel: number) => void;
  onGameComplete?: (payload: GameResultPayload) => void;
  PathLayerComponent?: React.ComponentType<OnetPathLayerProps>;
  BurstComponent?: React.ComponentType<TileBurstProps>;
}

function formatGravityLabel(mode: OnetGravityMode): string | null {
  switch (mode) {
    case 'down':
      return 'Gravitasi ↓';
    case 'up':
      return 'Gravitasi ↑';
    case 'left':
      return 'Gravitasi ←';
    case 'right':
      return 'Gravitasi →';
    case 'inward':
      return 'Pusat ⇅';
    case 'split_horizontal':
      return 'Pusat ↔';
    case 'alternating':
      return 'Dinamis ↻';
    default:
      return null;
  }
}

export const OnetScreen: React.FC<OnetScreenProps> = ({
  level,
  mode = 'normal',
  dailyDateKey = null,
  themeKey,
  tilePool,
  accentHex,
  onExit,
  onPlayLevel,
  onNextLevel,
  onGameComplete,
  PathLayerComponent = OnetPathLayer,
  BurstComponent = TileBurst,
}) => {
  const { saveData } = usePersistence();
  const { activeOnetTheme, getTilesForGame } = useTheme();
  const resolvedThemeKey = themeKey ?? activeOnetTheme.id;
  const resolvedTilePool = tilePool ?? getTilesForGame('onet', resolvedThemeKey);
  const resolvedAccentHex = accentHex ?? activeOnetTheme.palette.accentPrimary;
  const {
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
  } = useOnetGame({
    level,
    mode,
    dailyDateKey,
    themeKey: resolvedThemeKey,
    tilePool: resolvedTilePool,
    accentHex: resolvedAccentHex,
    onGameComplete,
  });

  // Intercept Android hardware back button cleanly
  useEffect(() => {
    const removeHandler = CapacitorBridge.pushBackHandler(() => {
      if (state.phase === 'playing') {
        pauseGame();
        return true;
      }
      if (state.phase === 'paused') {
        resumeGame();
        return true;
      }
      onExit();
      return true;
    });

    return removeHandler;
  }, [onExit, pauseGame, resumeGame, state.phase]);

  const remainingSec = Math.max(0, Math.ceil(state.remainingTimeMs / 1000));
  const totalSec = Math.max(1, Math.round(state.totalTimeMs / 1000));
  const timerRatio = Math.max(0, Math.min(1, state.remainingTimeMs / Math.max(1, state.totalTimeMs)));
  const gravityLabel = formatGravityLabel(state.config.gravityMode);

  const handleBackClick = () => {
    if (state.phase === 'playing') {
      pauseGame();
    } else {
      onExit();
    }
  };

  return (
    <div
      data-game="onet"
      className="relative w-full h-[100dvh] flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--color-background-main)',
        color: 'var(--club-ink)',
        paddingTop: 'var(--safe-top)',
        paddingBottom: 'var(--safe-bottom)',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
      }}
    >
      {/* Compact Top Gameplay HUD */}
      <header className="w-full max-w-lg mx-auto px-3 pt-2 pb-1 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleBackClick}
            className="min-w-[48px] min-h-[48px] rounded-[var(--radius-button)] border-2 flex items-center justify-center cursor-pointer active:translate-y-[2px]"
            style={{
              backgroundColor: 'var(--club-card)',
              borderColor: 'var(--club-border-ink)',
              boxShadow: 'var(--club-hard-shadow)',
            }}
            aria-label="Kembali atau jeda"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight">
                {mode === 'daily' ? 'Sprint Harian' : `Onet Level ${state.config.level}`}
              </span>
              {state.config.isBoss && (
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500 text-white">
                  BOSS
                </span>
              )}
              {state.config.isBreather && (
                <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500 text-white">
                  SANTAI
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold opacity-80">
              <span>Skor: {state.score.toLocaleString('id-ID')}</span>
              {gravityLabel && (
                <span className="px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10">
                  {gravityLabel}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={state.phase === 'paused' ? resumeGame : pauseGame}
            disabled={state.phase === 'won' || state.phase === 'lost'}
            className="min-w-[48px] min-h-[48px] rounded-[var(--radius-button)] border-2 flex items-center justify-center cursor-pointer active:translate-y-[2px] disabled:opacity-40"
            style={{
              backgroundColor: 'var(--club-card)',
              borderColor: 'var(--club-border-ink)',
              boxShadow: 'var(--club-hard-shadow)',
            }}
            aria-label={state.phase === 'paused' ? 'Lanjutkan permainan' : 'Jeda permainan'}
          >
            {state.phase === 'paused' ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
        </div>

        {/* Timer Bar & Clock */}
        <div className="flex items-center gap-2 px-1">
          <div
            className={`flex items-center gap-1 text-xs font-extrabold tabular-nums min-w-[60px] ${
              isLowTimeWarning ? 'text-rose-500 animate-pulse' : ''
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDurationClock(remainingSec)}</span>
          </div>

          <div className="flex-1 h-2.5 rounded-full overflow-hidden border border-[var(--club-border-ink)] bg-[var(--club-paper-2)]">
            <div
              className="h-full transition-[width] duration-150 ease-linear"
              style={{
                width: `${Math.round(timerRatio * 100)}%`,
                backgroundColor: isLowTimeWarning
                  ? '#ef4444'
                  : remainingSec <= totalSec * 0.4
                    ? '#f59e0b'
                    : '#16a34a',
              }}
            />
          </div>

          <span className="text-[11px] font-bold opacity-75 min-w-[54px] text-right">
            {state.remainingTileCount} ubin
          </span>
        </div>
      </header>

      {/* Primary Interactive Board */}
      <main className="flex-1 min-h-0 w-full max-w-lg mx-auto flex items-center justify-center">
        <OnetBoard
          board={state.board}
          phase={state.phase}
          selected={state.selected}
          hint={state.hint}
          errorPair={state.errorPair}
          activePath={state.activePath}
          bursts={state.bursts}
          combo={state.combo}
          highContrast={saveData.settings.display.highContrastTiles}
          onSelectTile={selectTile}
          PathLayerComponent={PathLayerComponent}
          BurstComponent={BurstComponent}
        />
      </main>

      {/* Bottom Thumb-Zone Booster Dock */}
      <footer className="shrink-0 w-full">
        <OnetBoosterDock
          boostersInventory={boostersInventory}
          disabled={state.phase !== 'playing'}
          hasActiveHint={state.hint !== null}
          onUseHint={useHintBooster}
          onUseShuffle={useShuffleBooster}
          onUseExtraTime={useExtraTimeBooster}
        />
      </footer>

      {/* Pause Overlay Modal */}
      {state.phase === 'paused' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-slate-950/60 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-label="Permainan dijeda"
        >
          <div
            className="w-full max-w-xs rounded-[var(--radius-modal)] border-2 p-6 flex flex-col items-center gap-4 text-center"
            style={{
              backgroundColor: 'var(--club-card)',
              borderColor: 'var(--club-border-ink)',
              boxShadow: 'var(--club-cta-shadow)',
            }}
          >
            <h2 className="text-xl font-black">
              {state.isResumedSession ? 'Lanjutkan Sesi?' : 'Permainan Dijeda'}
            </h2>
            <p className="text-sm opacity-75">
              {state.config.mode === 'daily'
                ? 'Sprint Harian'
                : `Level ${state.config.level}`}{' '}
              • Sisa waktu {formatDurationClock(remainingSec)}
            </p>

            <div className="w-full flex flex-col gap-2.5 mt-1">
              <button
                type="button"
                onClick={resumeGame}
                className="w-full min-h-[48px] rounded-[var(--radius-button)] border-2 font-extrabold text-white flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: 'var(--g-accent)',
                  borderColor: 'var(--club-border-ink)',
                  boxShadow: 'var(--club-hard-shadow)',
                }}
              >
                <Play className="w-4 h-4" />
                Lanjutkan
              </button>

              <button
                type="button"
                onClick={restartGame}
                className="w-full min-h-[48px] rounded-[var(--radius-button)] border-2 font-bold flex items-center justify-center gap-2 cursor-pointer"
                style={{
                  backgroundColor: 'var(--club-paper-2)',
                  borderColor: 'var(--club-border-ink)',
                }}
              >
                <RotateCcw className="w-4 h-4" />
                Ulangi Level
              </button>

              <button
                type="button"
                onClick={onExit}
                className="w-full min-h-[48px] rounded-[var(--radius-button)] border font-bold opacity-80 cursor-pointer"
                style={{
                  borderColor: 'var(--club-line)',
                }}
              >
                Keluar ke Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Win / Defeat Celebration & Unified Reward Modal */}
      <VictoryBurst active={state.phase === 'won'} />

      <GameResultModal
        open={(state.phase === 'won' || state.phase === 'lost') && state.lastResult !== null}
        payload={state.lastResult}
        breakdown={state.lastBreakdown}
        hasNextLevel={mode === 'normal' && Boolean(onPlayLevel || onNextLevel)}
        onNextLevel={() => {
          const next = state.config.level + 1;
          if (onPlayLevel) onPlayLevel(next, mode);
          else if (onNextLevel) onNextLevel(next);
        }}
        onRetry={restartGame}
        onExitToMap={onExit}
      />
    </div>
  );
};
