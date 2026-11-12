/**
 * Match3Screen — Complete Portrait Gameplay Screen for Match 3.
 * Integrates HUD, 3-Mission Progress Strip, Star Gauge, Match3Board,
 * Match3BoosterDock, Pause Modal, and Victory/Defeat Result Modal.
 * Owned by @match3-eng.
 */

import React, { useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react';
import { CapacitorBridge } from '@/services/native/CapacitorBridge';
import type { GameMode } from '@/types/game.types';
import type { Match3Objective } from '@/types/match3.types';
import { evaluateObjectiveProgress } from '../engine/match3Scoring';
import { useMatch3Game } from '../hooks/useMatch3Game';
import { Match3Board } from './Match3Board';
import { Match3BoosterDock } from './Match3BoosterDock';

export interface Match3ScreenProps {
  level: number;
  mode: GameMode;
  onExit: () => void;
  onPlayLevel?: (nextLevel: number, mode?: GameMode) => void;
  isDailyChallenge?: boolean;
  dailyDateKey?: string;
}

function getMissionLabel(mission: Match3Objective): string {
  return mission.description;
}

export const Match3Screen: React.FC<Match3ScreenProps> = ({
  level,
  mode,
  onExit,
  onPlayLevel,
  isDailyChallenge,
  dailyDateKey,
}) => {
  const {
    session,
    visualFx,
    boosterStock,
    tileAssets,
    surfaceUrl,
    isDarkMode,
    isReducedMotion,
    highContrastTiles,
    selectOrSwap,
    swipeSwap,
    triggerBooster,
    cancelBooster,
    togglePause,
    restartLevel,
  } = useMatch3Game({
    level,
    mode,
    isDailyChallenge,
    dailyDateKey,
  });

  const { config, progress, missionResults } = session;
  const maxThreshold = config.starScoreThresholds[2];
  const scorePct = Math.min(100, Math.round((session.score / Math.max(1, maxThreshold)) * 100));

  useEffect(() => {
    return CapacitorBridge.pushBackHandler(() => {
      if (session.phase === 'won' || session.phase === 'lost') {
        onExit();
        return true;
      }
      if (session.phase === 'paused') {
        togglePause(false);
        return true;
      }
      if (session.activeBooster) {
        cancelBooster();
        return true;
      }
      togglePause(true);
      return true;
    });
  }, [cancelBooster, onExit, session.activeBooster, session.phase, togglePause]);

  const earnedStarThresholds = useMemo(() => {
    const [s1, s2, s3] = config.starScoreThresholds;
    return [
      session.score >= s1,
      session.score >= s2,
      session.score >= s3,
    ];
  }, [config.starScoreThresholds, session.score]);

  const lowMovesWarning = session.movesRemaining <= 5 && session.phase !== 'won';
  const boardLocked = session.phase !== 'idle' && session.phase !== 'ready';

  return (
    <div
      data-testid="match3-screen"
      className={`flex h-[100dvh] w-full flex-col items-center justify-between overflow-hidden px-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] ${
        isDarkMode
          ? 'bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-slate-100'
          : 'bg-gradient-to-b from-amber-50 via-orange-50/70 to-rose-50 text-slate-900'
      }`}
    >
      {/* Top HUD Bar */}
      <header className="flex w-full max-w-[430px] flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Kembali"
              onClick={() => {
                if (session.phase === 'won' || session.phase === 'lost') {
                  onExit();
                } else {
                  togglePause(true);
                }
              }}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-transform active:scale-95 ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 text-slate-100'
                  : 'border-amber-200 bg-white text-slate-800 shadow-[0_3px_0_0_rgba(217,119,6,0.16)]'
              }`}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-lg font-extrabold leading-tight">
                  {isDailyChallenge || mode === 'daily'
                    ? 'Tantangan Harian'
                    : `Level ${config.level}`}
                </span>
                {config.isBoss && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                    BOSS
                  </span>
                )}
                {config.isBreather && (
                  <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-extrabold text-white">
                    SANTAI
                  </span>
                )}
              </div>
              <span
                className={`text-xs font-semibold ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Skor: {session.score.toLocaleString('id-ID')}
                {session.combo > 1 ? ` • Kombo ${session.combo}×` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Moves Counter Pill */}
            <div
              data-testid="match3-moves-pill"
              className={`flex min-h-[48px] min-w-[78px] flex-col items-center justify-center rounded-2xl border-2 px-3 py-1 transition-colors ${
                lowMovesWarning
                  ? 'border-rose-500 bg-rose-500 text-white animate-pulse'
                  : isDarkMode
                    ? 'border-indigo-500/60 bg-indigo-950/90 text-indigo-100'
                    : 'border-amber-300 bg-white text-slate-900 shadow-[0_3px_0_0_rgba(217,119,6,0.16)]'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                Langkah
              </span>
              <span className="font-mono text-lg font-extrabold leading-none">
                {session.movesRemaining}
              </span>
            </div>

            <button
              type="button"
              aria-label="Jeda"
              onClick={() => togglePause(true)}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border-2 transition-transform active:scale-95 ${
                isDarkMode
                  ? 'border-slate-700 bg-slate-800 text-slate-100'
                  : 'border-amber-200 bg-white text-slate-800 shadow-[0_3px_0_0_rgba(217,119,6,0.16)]'
              }`}
            >
              <Pause className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* 3-Star Score Progress Bar */}
        <div className="flex items-center gap-2 px-0.5">
          <div
            className={`relative h-2.5 flex-1 overflow-hidden rounded-full ${
              isDarkMode ? 'bg-slate-800' : 'bg-amber-100'
            }`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 transition-all duration-300"
              style={{ width: `${scorePct}%` }}
            />
          </div>
          <div className="flex items-center gap-1">
            {earnedStarThresholds.map((lit, idx) => (
              <Star
                key={idx}
                className={`h-4 w-4 transition-transform ${
                  lit
                    ? 'fill-amber-400 text-amber-500 scale-110'
                    : isDarkMode
                      ? 'text-slate-700'
                      : 'text-amber-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 3-Mission Progress Strip */}
        <div className="grid grid-cols-3 gap-1.5">
          {config.missions.map((mission, idx) => {
            const evalRes = evaluateObjectiveProgress(mission, progress);
            const done = missionResults[idx];
            const isPrimary = idx === 0;

            return (
              <div
                key={`${mission.type}-${idx}`}
                className={`flex flex-col justify-between rounded-xl border px-2 py-1.5 text-[11px] leading-tight ${
                  done
                    ? isDarkMode
                      ? 'border-emerald-500/70 bg-emerald-950/60 text-emerald-200'
                      : 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : isPrimary
                      ? isDarkMode
                        ? 'border-amber-400/70 bg-slate-800/90 text-amber-100'
                        : 'border-amber-400 bg-white text-slate-900'
                      : isDarkMode
                        ? 'border-slate-700 bg-slate-800/70 text-slate-300'
                        : 'border-slate-200 bg-white/85 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-1 font-bold">
                  <span className="truncate">
                    {isPrimary ? 'Utama' : `Bintang ${idx + 1}`}
                  </span>
                  {done && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                </div>
                <span className="mt-0.5 line-clamp-1 font-medium opacity-90">
                  {getMissionLabel(mission)}
                </span>
                <span className="mt-0.5 font-mono text-[10px] font-bold opacity-80">
                  {Math.min(evalRes.current, evalRes.target).toLocaleString('id-ID')}/
                  {evalRes.target.toLocaleString('id-ID')}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      {/* Main Board Stage */}
      <main className="flex w-full flex-1 items-center justify-center py-2">
        <Match3Board
          board={session.board}
          tileAssets={tileAssets}
          surfaceUrl={surfaceUrl}
          selectedCoord={session.selectedCoord}
          hintMove={session.hintMove}
          activeBooster={session.activeBooster}
          visualFx={visualFx}
          isDarkMode={isDarkMode}
          isReducedMotion={isReducedMotion}
          highContrastTiles={highContrastTiles}
          isShuffling={session.phase === 'shuffling'}
          onSelectOrSwap={selectOrSwap}
          onSwipeSwap={swipeSwap}
        />
      </main>

      {/* Bottom Booster Dock */}
      <footer className="flex w-full justify-center">
        <Match3BoosterDock
          boosterStock={boosterStock}
          activeBooster={session.activeBooster}
          disabled={boardLocked}
          isDarkMode={isDarkMode}
          onTriggerBooster={triggerBooster}
          onCancelBooster={cancelBooster}
        />
      </footer>

      {/* Pause Modal */}
      {session.phase === 'paused' && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-5 backdrop-blur-sm"
        >
          <div
            className={`w-full max-w-sm rounded-3xl border-[3px] p-6 shadow-2xl ${
              isDarkMode
                ? 'border-slate-700 bg-slate-900 text-slate-100'
                : 'border-amber-200 bg-white text-slate-900'
            }`}
          >
            <h2 className="text-center font-display text-2xl font-extrabold">
              Permainan Dijeda
            </h2>
            <p className="mt-1 text-center text-sm opacity-75">
              {isDailyChallenge || mode === 'daily'
                ? 'Tantangan Harian Match 3'
                : `Match 3 • Level ${config.level}`}
            </p>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => togglePause(false)}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 font-display text-base font-extrabold text-white shadow-[0_4px_0_0_#047857] active:translate-y-0.5"
              >
                <Play className="h-5 w-5 fill-current" />
                Lanjutkan
              </button>

              <button
                type="button"
                onClick={restartLevel}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 font-display text-base font-extrabold text-amber-950 shadow-[0_4px_0_0_#d97706] active:translate-y-0.5"
              >
                <RotateCcw className="h-5 w-5" />
                Ulangi Level
              </button>

              <button
                type="button"
                onClick={onExit}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border-2 px-4 py-3 font-display text-base font-bold active:translate-y-0.5 ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-200'
                    : 'border-slate-200 bg-slate-100 text-slate-700'
                }`}
              >
                Keluar ke Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Win / Loss Result Modal */}
      {(session.phase === 'won' || session.phase === 'lost') && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="match3-result-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-5 backdrop-blur-sm"
        >
          <div
            className={`w-full max-w-sm rounded-3xl border-[3px] p-6 shadow-2xl ${
              isDarkMode
                ? 'border-slate-700 bg-slate-900 text-slate-100'
                : 'border-amber-200 bg-white text-slate-900'
            }`}
          >
            <div className="flex flex-col items-center text-center">
              <div
                className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl ${
                  session.phase === 'won'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-rose-100 text-rose-600'
                }`}
              >
                <Trophy className="h-8 w-8" />
              </div>

              <h2 className="font-display text-2xl font-extrabold">
                {session.phase === 'won' ? 'Level Selesai!' : 'Langkah Habis'}
              </h2>

              {/* Star Bar */}
              <div className="my-3 flex items-center gap-2">
                {[1, 2, 3].map((starIdx) => {
                  const earned = (session.lastResult?.payload.stars ?? 0) >= starIdx;
                  return (
                    <Star
                      key={starIdx}
                      className={`h-9 w-9 ${
                        earned
                          ? 'fill-amber-400 text-amber-500 drop-shadow'
                          : isDarkMode
                            ? 'text-slate-700'
                            : 'text-slate-200'
                      }`}
                    />
                  );
                })}
              </div>

              <div className="mb-4 grid w-full grid-cols-3 gap-2 rounded-2xl bg-slate-500/10 p-3 text-center">
                <div>
                  <div className="text-[11px] font-semibold opacity-70">Skor</div>
                  <div className="font-mono text-sm font-extrabold">
                    {session.score.toLocaleString('id-ID')}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold opacity-70">Koin</div>
                  <div className="flex items-center justify-center gap-1 font-mono text-sm font-extrabold text-amber-500">
                    <Coins className="h-3.5 w-3.5" />+
                    {session.lastResult?.breakdown?.coinsEarned ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold opacity-70">XP</div>
                  <div className="flex items-center justify-center gap-1 font-mono text-sm font-extrabold text-indigo-400">
                    <Sparkles className="h-3.5 w-3.5" />+
                    {session.lastResult?.breakdown?.xpEarned ?? 0}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {session.phase === 'won' && onPlayLevel && !isDailyChallenge && mode !== 'daily' && (
                <button
                  type="button"
                  onClick={() => onPlayLevel(config.level + 1, mode)}
                  className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 font-display text-base font-extrabold text-white shadow-[0_4px_0_0_#047857] active:translate-y-0.5"
                >
                  Level Berikutnya ({config.level + 1})
                </button>
              )}

              <button
                type="button"
                onClick={restartLevel}
                className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 font-display text-base font-extrabold text-amber-950 shadow-[0_4px_0_0_#d97706] active:translate-y-0.5"
              >
                <RotateCcw className="h-5 w-5" />
                Main Lagi
              </button>

              <button
                type="button"
                onClick={onExit}
                className={`flex min-h-[48px] items-center justify-center rounded-2xl border-2 px-4 py-3 font-display text-base font-bold active:translate-y-0.5 ${
                  isDarkMode
                    ? 'border-slate-700 bg-slate-800 text-slate-200'
                    : 'border-slate-200 bg-slate-100 text-slate-700'
                }`}
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
