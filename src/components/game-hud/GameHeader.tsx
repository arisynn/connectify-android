/**
 * GameHeader — Unified Compact Portrait HUD for Onet Connect & Match 3
 * Owned by @ui-eng
 */

import React from 'react';
import { ArrowLeft, Clock, Flame, Footprints, Palette, Pause } from 'lucide-react';
import type { GameId, GameMode } from '@/types/game.types';
import { formatDurationClock } from '@/utils/time';
import { useAudio } from '@/services/audio/AudioContext';

export interface GameHeaderProps {
  game: GameId;
  level: number;
  mode?: GameMode;
  score: number;
  combo?: number;
  /** Onet timer remaining in seconds */
  remainingTimeSec?: number;
  totalTimeSec?: number;
  /** Match 3 remaining moves */
  movesRemaining?: number;
  maxMoves?: number;
  /** Optional status badge (e.g. Boss, Harian, Gravity direction) */
  badgeText?: string;
  onPause: () => void;
  onBack?: () => void;
  onQuickTheme?: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  game,
  level,
  mode = 'normal',
  score,
  combo = 0,
  remainingTimeSec,
  totalTimeSec,
  movesRemaining,
  badgeText,
  onPause,
  onBack,
  onQuickTheme,
}) => {
  const { playUiClick, triggerHaptic } = useAudio();

  const isLowTime =
    game === 'onet' && remainingTimeSec !== undefined && remainingTimeSec <= 15;
  const isLowMoves =
    game === 'match3' && movesRemaining !== undefined && movesRemaining <= 5;
  const timeRatio =
    remainingTimeSec !== undefined && totalTimeSec && totalTimeSec > 0
      ? Math.min(100, Math.max(0, (remainingTimeSec / totalTimeSec) * 100))
      : null;

  return (
    <header
      data-testid="game-hud-header"
      className="w-full shrink-0 flex flex-col gap-1.5 select-none"
    >
      <div className="flex items-center justify-between gap-2">
        {/* Left: Back / Level Pill */}
        <div className="flex items-center gap-1.5 min-w-0">
          {onBack && (
            <button
              type="button"
              data-testid="hud-back"
              aria-label="Kembali"
              onClick={() => {
                playUiClick();
                triggerHaptic('uiTap');
                onBack();
              }}
              className="touch-target w-12 h-12 rounded-2xl flex items-center justify-center border-2 shrink-0 cursor-pointer transition-transform active:translate-y-[2px]"
              style={{
                backgroundColor: 'var(--club-card)',
                borderColor: 'var(--club-border-ink)',
                boxShadow: '0 2px 0 var(--club-border-ink)',
              }}
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
          )}

          <div
            className="h-12 px-3 rounded-2xl border-2 flex flex-col justify-center min-w-[78px]"
            style={{
              backgroundColor: 'var(--club-card)',
              borderColor: 'var(--club-border-ink)',
              boxShadow: '0 2px 0 var(--club-border-ink)',
            }}
          >
            <div className="flex items-center gap-1">
              <span
                className="font-display text-xs font-extrabold uppercase tracking-wide"
                style={{ color: 'var(--g-accent)' }}
              >
                {mode === 'daily' ? 'Harian' : `Lv. ${level}`}
              </span>
              {badgeText && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                  style={{
                    backgroundColor: 'var(--g-soft)',
                    color: 'var(--club-ink)',
                  }}
                >
                  {badgeText}
                </span>
              )}
            </div>
            <span
              className="font-tabular text-sm font-extrabold leading-tight"
              data-testid="hud-score"
            >
              {Math.max(0, Math.floor(score)).toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        {/* Center: Timer (Onet) or Moves (Match 3) */}
        <div className="flex items-center gap-1.5">
          {game === 'onet' && remainingTimeSec !== undefined && (
            <div
              data-testid="hud-timer"
              className={`h-12 px-3.5 rounded-2xl border-2 flex items-center gap-1.5 ${
                isLowTime ? 'animate-pulse' : ''
              }`}
              style={{
                backgroundColor: isLowTime ? '#fee2e2' : 'var(--club-card)',
                borderColor: isLowTime ? '#ef4444' : 'var(--club-border-ink)',
                color: isLowTime ? '#991b1b' : 'var(--club-ink)',
                boxShadow: '0 2px 0 var(--club-border-ink)',
              }}
            >
              <Clock size={17} strokeWidth={2.6} />
              <span className="font-tabular text-base font-extrabold">
                {formatDurationClock(remainingTimeSec)}
              </span>
            </div>
          )}

          {game === 'match3' && movesRemaining !== undefined && (
            <div
              data-testid="hud-moves"
              className={`h-12 px-3.5 rounded-2xl border-2 flex items-center gap-1.5 ${
                isLowMoves ? 'animate-pulse' : ''
              }`}
              style={{
                backgroundColor: isLowMoves ? '#fee2e2' : 'var(--club-card)',
                borderColor: isLowMoves ? '#ef4444' : 'var(--club-border-ink)',
                color: isLowMoves ? '#991b1b' : 'var(--club-ink)',
                boxShadow: '0 2px 0 var(--club-border-ink)',
              }}
            >
              <Footprints size={16} strokeWidth={2.6} />
              <div className="flex flex-col leading-none">
                <span className="text-[9px] font-bold uppercase opacity-75">Langkah</span>
                <span className="font-tabular text-base font-extrabold">
                  {Math.max(0, Math.floor(movesRemaining))}
                </span>
              </div>
            </div>
          )}

          {combo > 1 && (
            <div
              data-testid="hud-combo"
              className="h-9 px-2.5 rounded-full border-2 flex items-center gap-1"
              style={{
                backgroundColor: 'var(--club-gold)',
                borderColor: 'var(--club-border-ink)',
                color: '#172337',
                boxShadow: '0 2px 0 var(--club-border-ink)',
              }}
            >
              <Flame size={14} strokeWidth={2.6} />
              <span className="font-tabular text-xs font-extrabold">×{combo}</span>
            </div>
          )}
        </div>

        {/* Right: Quick Theme + Pause */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onQuickTheme && (
            <button
              type="button"
              data-testid="hud-theme"
              aria-label="Ganti tema cepat"
              onClick={() => {
                playUiClick();
                triggerHaptic('uiTap');
                onQuickTheme();
              }}
              className="touch-target w-12 h-12 rounded-2xl flex items-center justify-center border-2 cursor-pointer transition-transform active:translate-y-[2px]"
              style={{
                backgroundColor: 'var(--club-card)',
                borderColor: 'var(--club-border-ink)',
                boxShadow: '0 2px 0 var(--club-border-ink)',
              }}
            >
              <Palette size={19} strokeWidth={2.4} />
            </button>
          )}

          <button
            type="button"
            data-testid="hud-pause"
            aria-label="Jeda permainan"
            onClick={() => {
              playUiClick();
              triggerHaptic('uiTap');
              onPause();
            }}
            className="touch-target w-12 h-12 rounded-2xl flex items-center justify-center border-2 cursor-pointer transition-transform active:translate-y-[2px]"
            style={{
              backgroundColor: 'var(--club-card)',
              borderColor: 'var(--club-border-ink)',
              boxShadow: '0 2px 0 var(--club-border-ink)',
            }}
          >
            <Pause size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Optional Onet linear time bar */}
      {timeRatio !== null && (
        <div
          className="w-full h-2 rounded-full border overflow-hidden"
          style={{
            borderColor: 'var(--club-border-ink)',
            backgroundColor: 'color-mix(in srgb, var(--club-ink) 10%, transparent)',
          }}
        >
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${timeRatio}%`,
              backgroundColor: isLowTime ? 'var(--club-danger)' : 'var(--g-accent)',
            }}
          />
        </div>
      )}
    </header>
  );
};
