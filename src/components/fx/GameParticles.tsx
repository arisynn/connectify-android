import type { CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import { useTheme } from '@/services/theme/ThemeContext';
import type { EffectCosmeticItem } from '@/types/theme.types';

export interface GameParticlesProps {
  /** Optional cosmetic override (e.g. shop preview). Defaults to equipped activeEffect. */
  effect?: Pick<EffectCosmeticItem, 'id' | 'particleUrl' | 'animationStyle' | 'accentHex'>;
  /** Number of particle sprites to emit (default 8). */
  count?: number;
  /** Keep particles looping indefinitely (used in previews/badges). */
  loop?: boolean;
  /** Radial spread radius in pixels (default 40). */
  radiusPx?: number;
  className?: string;
}

/**
 * Radial cosmetic particle burst driven by the equipped EffectCosmeticItem.
 * Matches `.game-particles.motion-{drift|orbit|pop|bloom}` rules in animations.css.
 */
export function GameParticles({
  effect,
  count = 8,
  loop = false,
  radiusPx = 40,
  className = '',
}: GameParticlesProps) {
  const prefersReduced = useReducedMotion();
  const { activeEffect, isReducedMotion } = useTheme();

  if (prefersReduced || isReducedMotion) {
    return null;
  }

  const resolved = effect ?? activeEffect;
  if (!resolved || !resolved.particleUrl || resolved.id === 'none') {
    return null;
  }

  const safeCount = Math.max(0, Math.min(24, Math.round(count)));
  if (safeCount === 0) return null;

  const motionStyle = resolved.animationStyle ?? 'drift';

  return (
    <span
      className={`game-particles motion-${motionStyle}${loop ? ' loop' : ''}${
        className ? ` ${className}` : ''
      }`}
      aria-hidden="true"
    >
      {Array.from({ length: safeCount }, (_, i) => {
        const angle = (Math.PI * 2 * i) / safeCount + (i % 2 === 0 ? 0.14 : -0.14);
        const radius = radiusPx * (0.72 + (i % 3) * 0.22);
        const dx = `${Math.round(Math.cos(angle) * radius)}px`;
        const dy = `${Math.round(Math.sin(angle) * radius)}px`;
        const spin = `${i % 2 === 0 ? 18 : -18}deg`;

        const particleStyle = {
          '--dx': dx,
          '--dy': dy,
          '--spin': spin,
          animationDelay: `${i * 12}ms`,
        } as CSSProperties;

        return (
          <img
            key={`${resolved.id}-${i}`}
            src={resolved.particleUrl}
            alt=""
            decoding="async"
            loading="eager"
            style={particleStyle}
          />
        );
      })}
    </span>
  );
}

export default GameParticles;
