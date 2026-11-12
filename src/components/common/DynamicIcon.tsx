/**
 * DynamicIcon — Local Asset Image with Graceful Lucide Fallback
 * Owned by @ui-eng
 */

import React, { useState } from 'react';
import {
  Award,
  Coins,
  Flame,
  Gamepad2,
  Gift,
  Palette,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Trophy,
  User,
} from 'lucide-react';

export type DynamicIconKind =
  | 'coin'
  | 'onet'
  | 'match3'
  | 'trophy'
  | 'gift'
  | 'missions'
  | 'collection'
  | 'theme'
  | 'shop'
  | 'profile'
  | 'settings'
  | 'streak'
  | 'star';

export interface DynamicIconProps {
  src?: string | null;
  fallbackSrc?: string;
  kind?: DynamicIconKind;
  alt?: string;
  size?: number;
  className?: string;
}

function renderFallbackLucide(kind: DynamicIconKind, size: number, className?: string) {
  const props = { size: Math.round(size * 0.78), strokeWidth: 2.3, className };
  switch (kind) {
    case 'coin':
      return <Coins {...props} style={{ color: 'var(--club-gold)' }} />;
    case 'onet':
    case 'match3':
      return <Gamepad2 {...props} style={{ color: 'var(--g-accent)' }} />;
    case 'trophy':
      return <Trophy {...props} style={{ color: 'var(--club-gold)' }} />;
    case 'gift':
      return <Gift {...props} style={{ color: '#ec4899' }} />;
    case 'missions':
      return <Award {...props} style={{ color: '#f59e0b' }} />;
    case 'collection':
    case 'theme':
      return <Palette {...props} style={{ color: '#8b5cf6' }} />;
    case 'shop':
      return <ShoppingBag {...props} style={{ color: '#0ea5e9' }} />;
    case 'profile':
      return <User {...props} style={{ color: 'var(--club-ink)' }} />;
    case 'settings':
      return <Settings {...props} style={{ color: 'var(--club-ink)' }} />;
    case 'streak':
      return <Flame {...props} style={{ color: '#f97316' }} />;
    case 'star':
      return <Star {...props} style={{ color: 'var(--club-gold)' }} />;
    default:
      return <Sparkles {...props} style={{ color: 'var(--g-accent)' }} />;
  }
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({
  src,
  fallbackSrc,
  kind = 'star',
  alt = '',
  size = 24,
  className = '',
}) => {
  const [failedPrimary, setFailedPrimary] = useState(false);
  const [failedFallback, setFailedFallback] = useState(false);

  const activeSrc = !failedPrimary ? src : !failedFallback ? fallbackSrc : null;

  if (!activeSrc) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${className}`}
        style={{ width: size, height: size }}
        aria-hidden={!alt}
      >
        {renderFallbackLucide(kind, size)}
      </span>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      onError={() => {
        if (!failedPrimary) {
          setFailedPrimary(true);
        } else {
          setFailedFallback(true);
        }
      }}
      className={`inline-block shrink-0 object-contain select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
};
