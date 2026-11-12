/**
 * Match3BoosterDock — Touch-First 4-Slot Booster Bar (Hint, Hammer, Bomb, Shuffle).
 * Displays live stock counts from PersistenceContext and target cancellation banner.
 * Owned by @match3-eng.
 */

import React from 'react';
import { Bomb, Hammer, Lightbulb, Shuffle, X } from 'lucide-react';
import type { Match3BoosterId } from '@/types/game.types';

export interface Match3BoosterDockProps {
  boosterStock: Record<Match3BoosterId, number>;
  activeBooster: Extract<Match3BoosterId, 'hammer' | 'bomb'> | null;
  disabled: boolean;
  isDarkMode: boolean;
  onTriggerBooster: (booster: Match3BoosterId) => void;
  onCancelBooster: () => void;
}

interface BoosterSlotMeta {
  id: Match3BoosterId;
  label: string;
  sublabel: string;
  Icon: React.ComponentType<{ className?: string }>;
  accentBg: string;
  accentBorder: string;
}

const BOOSTER_SLOTS: readonly BoosterSlotMeta[] = [
  {
    id: 'hint',
    label: 'Petunjuk',
    sublabel: 'Cari Match',
    Icon: Lightbulb,
    accentBg: 'bg-amber-100 text-amber-700',
    accentBorder: 'border-amber-400',
  },
  {
    id: 'hammer',
    label: 'Palu',
    sublabel: '1×1 Hancur',
    Icon: Hammer,
    accentBg: 'bg-sky-100 text-sky-700',
    accentBorder: 'border-sky-400',
  },
  {
    id: 'bomb',
    label: 'Bom',
    sublabel: '3×3 Ledak',
    Icon: Bomb,
    accentBg: 'bg-rose-100 text-rose-700',
    accentBorder: 'border-rose-400',
  },
  {
    id: 'shuffle',
    label: 'Acak',
    sublabel: 'Acak Papan',
    Icon: Shuffle,
    accentBg: 'bg-emerald-100 text-emerald-700',
    accentBorder: 'border-emerald-400',
  },
] as const;

export const Match3BoosterDock: React.FC<Match3BoosterDockProps> = ({
  boosterStock,
  activeBooster,
  disabled,
  isDarkMode,
  onTriggerBooster,
  onCancelBooster,
}) => {
  return (
    <div className="flex w-full max-w-[430px] flex-col gap-2">
      {activeBooster && (
        <div className="flex items-center justify-between rounded-2xl border-2 border-amber-400 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-sm">
          <span>
            {activeBooster === 'hammer'
              ? 'Ketuk tile atau rintangan untuk dihancurkan (1×1)'
              : 'Ketuk titik tengah untuk ledakan Bom (3×3)'}
          </span>
          <button
            type="button"
            onClick={onCancelBooster}
            className="ml-2 inline-flex min-h-[32px] items-center gap-1 rounded-xl bg-amber-200 px-2.5 py-1 text-xs font-extrabold text-amber-950 active:scale-95"
          >
            <X className="h-3.5 w-3.5" />
            Batal
          </button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        {BOOSTER_SLOTS.map(({ id, label, Icon, accentBg, accentBorder }) => {
          const count = boosterStock[id] ?? 0;
          const isActive = activeBooster === id;
          const isDisabled = disabled || count <= 0;

          return (
            <button
              key={id}
              type="button"
              disabled={isDisabled}
              data-testid={`match3-booster-${id}`}
              onClick={() => onTriggerBooster(id)}
              className={`relative flex min-h-[56px] flex-col items-center justify-center rounded-2xl border-2 px-2 py-1.5 transition-all active:translate-y-0.5 ${
                isActive
                  ? `${accentBorder} ring-2 ring-amber-400 bg-amber-50 shadow-md`
                  : isDarkMode
                    ? 'border-slate-700 bg-slate-800/95 text-slate-100 shadow-[0_3px_0_0_rgba(15,23,42,0.9)]'
                    : 'border-slate-200 bg-white text-slate-800 shadow-[0_3px_0_0_rgba(148,163,184,0.3)]'
              } ${isDisabled ? 'opacity-45 grayscale' : 'hover:brightness-105'}`}
            >
              <span
                className={`mb-0.5 flex h-7 w-7 items-center justify-center rounded-xl ${accentBg}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-[11px] font-bold leading-tight">{label}</span>

              <span
                className={`absolute -right-1 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white px-1 text-[10px] font-extrabold shadow ${
                  count > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-400 text-white'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
