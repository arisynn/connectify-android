/**
 * StarRatingBar — Live Threshold Progress Bar & Animated Star Display
 * Owned by @ui-eng
 */

import React from 'react';
import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import type { StarRating } from '@/types/game.types';
import { useTheme } from '@/services/theme/ThemeContext';

export interface StarRatingBarProps {
  /** Earned star count (0..3) when displaying static/celebration stars */
  stars?: StarRating;
  /** Optional live score for threshold progress mode */
  score?: number;
  /** Optional [1★, 2★, 3★] score thresholds for live progress mode */
  thresholds?: readonly [number, number, number];
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const ICON_SIZES: Record<'sm' | 'md' | 'lg', number> = {
  sm: 14,
  md: 22,
  lg: 34,
};

export const StarRatingBar: React.FC<StarRatingBarProps> = ({
  stars,
  score,
  thresholds,
  size = 'md',
  animated = false,
  className = '',
}) => {
  const { isReducedMotion } = useTheme();
  const iconSize = ICON_SIZES[size];

  // Live threshold progress bar mode
  if (score !== undefined && thresholds) {
    const maxScore = Math.max(1, thresholds[2]);
    const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));
    const earnedFromScore: StarRating =
      score >= thresholds[2]
        ? 3
        : score >= thresholds[1]
          ? 2
          : score >= thresholds[0]
            ? 1
            : 0;

    return (
      <div className={`w-full ${className}`} aria-label={`Progres ${earnedFromScore} bintang`}>
        <div className="relative h-3 rounded-full border-2 overflow-hidden" style={{
          borderColor: 'var(--club-border-ink)',
          backgroundColor: 'color-mix(in srgb, var(--club-ink) 10%, transparent)',
        }}>
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, var(--club-gold), var(--g-accent))',
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1 px-0.5">
          {thresholds.map((th, idx) => {
            const active = score >= th;
            return (
              <div key={idx} className="flex items-center gap-1">
                <Star
                  size={13}
                  strokeWidth={2.4}
                  fill={active ? 'var(--club-gold)' : 'transparent'}
                  style={{ color: active ? 'var(--club-gold)' : 'var(--club-muted)' }}
                />
                <span
                  className="font-tabular text-[10px] font-bold"
                  style={{ color: active ? 'var(--club-ink)' : 'var(--club-muted)' }}
                >
                  {th.toLocaleString('id-ID')}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const earned = Math.min(3, Math.max(0, stars ?? 0));

  return (
    <div
      className={`inline-flex items-center justify-center ${
        size === 'lg' ? 'gap-3' : size === 'md' ? 'gap-1.5' : 'gap-1'
      } ${className}`}
      aria-label={`${earned} dari 3 bintang`}
    >
      {[1, 2, 3].map((idx) => {
        const filled = idx <= earned;
        const starEl = (
          <Star
            size={iconSize}
            strokeWidth={2.5}
            fill={filled ? '#FFB020' : 'transparent'}
            style={{
              color: filled ? '#172337' : 'var(--club-muted)',
              filter: filled ? 'drop-shadow(0 2px 0 rgba(23, 35, 55, 0.25))' : 'none',
            }}
          />
        );

        if (animated && filled && !isReducedMotion) {
          return (
            <motion.span
              key={idx}
              initial={{ scale: 0.2, rotate: -25, opacity: 0 }}
              animate={{ scale: [0.2, 1.25, 1], rotate: 0, opacity: 1 }}
              transition={{
                delay: 0.14 * idx,
                duration: 0.38,
                type: 'spring',
                stiffness: 340,
                damping: 18,
              }}
              className="inline-flex"
            >
              {starEl}
            </motion.span>
          );
        }

        return (
          <span key={idx} className="inline-flex">
            {starEl}
          </span>
        );
      })}
    </div>
  );
};
