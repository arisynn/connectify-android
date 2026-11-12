/**
 * OnetBoosterDock — Bottom Thumb-Zone Booster Bar (Hint, Shuffle, +15s).
 * Minimum 48dp touch targets for comfortable portrait play.
 * Owned by @onet-eng.
 */

import React from 'react';
import { Clock, Lightbulb, Shuffle } from 'lucide-react';
import type { OnetBoosterId } from '@/types/game.types';

export interface OnetBoosterDockProps {
  boostersInventory: Record<OnetBoosterId, number>;
  disabled?: boolean;
  hasActiveHint?: boolean;
  onUseHint: () => void;
  onUseShuffle: () => void;
  onUseExtraTime: () => void;
}

interface BoosterButtonConfig {
  id: OnetBoosterId;
  label: string;
  count: number;
  icon: React.ReactNode;
  disabled: boolean;
  activeBadge?: string;
  onClick: () => void;
}

export const OnetBoosterDock: React.FC<OnetBoosterDockProps> = ({
  boostersInventory,
  disabled = false,
  hasActiveHint = false,
  onUseHint,
  onUseShuffle,
  onUseExtraTime,
}) => {
  const buttons: BoosterButtonConfig[] = [
    {
      id: 'hint',
      label: hasActiveHint ? 'Aktif' : 'Petunjuk',
      count: boostersInventory.hint ?? 0,
      icon: <Lightbulb className="w-5 h-5" />,
      disabled: disabled || hasActiveHint || (boostersInventory.hint ?? 0) <= 0,
      onClick: onUseHint,
    },
    {
      id: 'shuffle',
      label: 'Acak',
      count: boostersInventory.shuffle ?? 0,
      icon: <Shuffle className="w-5 h-5" />,
      disabled: disabled || (boostersInventory.shuffle ?? 0) <= 0,
      onClick: onUseShuffle,
    },
    {
      id: 'extra_time',
      label: '+15s',
      count: boostersInventory.extra_time ?? 0,
      icon: <Clock className="w-5 h-5" />,
      disabled: disabled || (boostersInventory.extra_time ?? 0) <= 0,
      onClick: onUseExtraTime,
    },
  ];

  return (
    <div
      className="w-full max-w-md mx-auto px-3 pt-2 pb-3 flex items-center justify-center gap-3"
      role="toolbar"
      aria-label="Booster Onet"
    >
      {buttons.map((btn) => (
        <button
          key={btn.id}
          type="button"
          disabled={btn.disabled}
          onClick={btn.onClick}
          style={{
            backgroundColor: 'var(--club-card)',
            borderColor: 'var(--club-border-ink)',
            color: 'var(--club-ink)',
            boxShadow: btn.disabled ? 'none' : 'var(--club-hard-shadow)',
          }}
          className={[
            'relative flex-1 min-h-[54px] px-3 py-2 rounded-[var(--radius-button)] border-2',
            'flex items-center justify-center gap-2 font-bold text-sm transition-transform',
            btn.disabled
              ? 'opacity-45 cursor-not-allowed translate-y-[2px]'
              : 'cursor-pointer active:translate-y-[2px]',
          ].join(' ')}
          aria-label={`${btn.label} (${btn.count} tersedia)`}
        >
          {btn.icon}
          <span>{btn.label}</span>
          <span
            className="min-w-[22px] h-[22px] px-1.5 rounded-full text-xs font-extrabold flex items-center justify-center"
            style={{
              backgroundColor: 'var(--g-accent)',
              color: '#ffffff',
            }}
          >
            {btn.count}
          </span>
        </button>
      ))}
    </div>
  );
};
