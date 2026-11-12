/**
 * CurrencyPill — Connect Coins (Permen) Balance Display Pill
 * Owned by @ui-eng
 */

import React from 'react';
import { Plus } from 'lucide-react';
import { UI_ASSETS } from '@/config/themes.config';
import { DynamicIcon } from './DynamicIcon';

export interface CurrencyPillProps {
  coins: number;
  onClick?: () => void;
  showAddHint?: boolean;
  compact?: boolean;
  testId?: string;
  className?: string;
}

export const CurrencyPill: React.FC<CurrencyPillProps> = ({
  coins,
  onClick,
  showAddHint = false,
  compact = false,
  testId = 'currency-pill',
  className = '',
}) => {
  const formatted = Math.max(0, Math.floor(coins)).toLocaleString('id-ID');

  const content = (
    <>
      <DynamicIcon src={UI_ASSETS.currency} kind="coin" alt="Permen" size={compact ? 18 : 22} />
      <span
        className={`font-tabular font-extrabold tracking-tight ${
          compact ? 'text-xs' : 'text-sm'
        }`}
        style={{ color: 'var(--club-ink)' }}
      >
        {formatted}
      </span>
      {showAddHint && (
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white"
          style={{ backgroundColor: 'var(--club-gold)', border: '1.5px solid var(--club-border-ink)' }}
        >
          <Plus size={12} strokeWidth={3} />
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        data-testid={testId}
        onClick={onClick}
        aria-label={`Saldo ${formatted} Permen`}
        className={`club-pill touch-target !min-h-[42px] px-3 transition-transform active:translate-y-[2px] cursor-pointer ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      data-testid={testId}
      aria-label={`Saldo ${formatted} Permen`}
      className={`club-pill ${compact ? '!min-h-[34px] px-2.5' : '!min-h-[40px] px-3'} ${className}`}
    >
      {content}
    </div>
  );
};
