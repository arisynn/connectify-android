import type { CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import { useTheme } from '@/services/theme/ThemeContext';

export interface VictoryBurstProps {
  /** Toggle visibility of the celebration confetti rain. */
  active?: boolean;
  /** Number of falling celebration elements (default 24). */
  count?: number;
}

const FALLBACK_CONFETTI_COLORS = ['#f59e0b', '#38bdf8', '#f43f5e', '#10b981', '#a855f7'] as const;

/**
 * Full-screen celebration particle/confetti shower matching the player's
 * equipped EffectCosmeticItem (or themed confetti shapes when none is equipped).
 */
export function VictoryBurst({ active = true, count = 24 }: VictoryBurstProps) {
  const prefersReduced = useReducedMotion();
  const { activeEffect, isReducedMotion } = useTheme();

  if (!active || prefersReduced || isReducedMotion) {
    return null;
  }

  const safeCount = Math.max(0, Math.min(48, Math.round(count)));
  if (safeCount === 0) return null;

  const hasBitmap = Boolean(activeEffect.particleUrl && activeEffect.id !== 'none');
  const variantClass = hasBitmap
    ? 'bitmap-burst'
    : activeEffect.animationStyle === 'bloom'
      ? 'effect-stars'
      : 'effect-default';

  return (
    <div className={`victory-burst ${variantClass}`} aria-hidden="true">
      {Array.from({ length: safeCount }, (_, i) => {
        const left = `${3 + ((i * 23) % 91)}%`;
        const delay = `${(i % 6) * 90}ms`;
        const style: CSSProperties = hasBitmap
          ? {
              left,
              animationDelay: delay,
              backgroundImage: `url(${activeEffect.particleUrl})`,
            }
          : {
              left,
              animationDelay: delay,
              backgroundColor:
                i % 3 === 0 && activeEffect.accentHex
                  ? activeEffect.accentHex
                  : FALLBACK_CONFETTI_COLORS[i % FALLBACK_CONFETTI_COLORS.length],
            };

        return <i key={`victory-${i}`} style={style} />;
      })}
    </div>
  );
}

export default VictoryBurst;
