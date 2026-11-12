/**
 * KineticButton — Play Club Tactile Button with Haptic & Audio Feedback
 * Owned by @ui-eng
 */

import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '@/services/theme/ThemeContext';
import { useAudio } from '@/services/audio/AudioContext';

export type KineticButtonVariant = 'primary' | 'secondary' | 'gold' | 'success' | 'danger' | 'ghost';
export type KineticButtonSize = 'sm' | 'md' | 'lg';

export interface KineticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: KineticButtonVariant;
  size?: KineticButtonSize;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

const VARIANT_STYLES: Record<KineticButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--g-accent)',
    color: '#ffffff',
    borderColor: 'var(--club-border-ink)',
  },
  secondary: {
    backgroundColor: 'var(--club-card)',
    color: 'var(--club-ink)',
    borderColor: 'var(--club-border-ink)',
  },
  gold: {
    backgroundColor: 'var(--club-gold)',
    color: '#172337',
    borderColor: 'var(--club-border-ink)',
  },
  success: {
    backgroundColor: 'var(--club-success)',
    color: '#ffffff',
    borderColor: 'var(--club-border-ink)',
  },
  danger: {
    backgroundColor: 'var(--club-danger)',
    color: '#ffffff',
    borderColor: 'var(--club-border-ink)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--club-ink)',
    borderColor: 'var(--club-line)',
  },
};

const SIZE_CLASSES: Record<KineticButtonSize, string> = {
  sm: 'min-h-[48px] px-3.5 py-2 text-xs rounded-xl',
  md: 'min-h-[48px] px-4 py-2.5 text-sm rounded-2xl',
  lg: 'min-h-[54px] px-5 py-3 text-base rounded-2xl',
};

export const KineticButton: React.FC<KineticButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  icon,
  children,
  disabled,
  onClick,
  className = '',
  style,
  type = 'button',
  ...rest
}) => {
  const { isReducedMotion } = useTheme();
  const { playUiClick, triggerHaptic } = useAudio();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    playUiClick();
    triggerHaptic('uiTap');
    onClick?.(e);
  };

  const baseStyle: React.CSSProperties = {
    ...VARIANT_STYLES[variant],
    boxShadow:
      variant === 'ghost'
        ? 'none'
        : disabled
          ? 'none'
          : '0 3px 0 var(--club-border-ink)',
    ...style,
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={handleClick}
      whileTap={disabled || isReducedMotion ? undefined : { y: 2, scale: 0.98 }}
      transition={{ duration: 0.08 }}
      style={baseStyle}
      className={`inline-flex items-center justify-center gap-2 font-display font-bold border-2 select-none transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        SIZE_CLASSES[size]
      } ${fullWidth ? 'w-full' : ''} ${className}`}
      {...(rest as React.ComponentProps<typeof motion.button>)}
    >
      {icon && <span className="inline-flex items-center shrink-0">{icon}</span>}
      {children && <span>{children}</span>}
    </motion.button>
  );
};
