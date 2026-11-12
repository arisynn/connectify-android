/**
 * KineticCard — Play Club Tactile Card Container
 * Owned by @ui-eng
 */

import React from 'react';
import { motion } from 'motion/react';
import { useTheme } from '@/services/theme/ThemeContext';

export interface KineticCardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  elevated?: boolean;
  accentColor?: string;
  children: React.ReactNode;
}

export const KineticCard: React.FC<KineticCardProps> = ({
  interactive = false,
  elevated = true,
  accentColor,
  children,
  className = '',
  style,
  onClick,
  ...rest
}) => {
  const { isReducedMotion } = useTheme();

  const mergedStyle: React.CSSProperties = {
    backgroundColor: elevated ? 'var(--club-card)' : 'var(--club-card-elevated)',
    borderColor: accentColor ?? (elevated ? 'var(--club-border-ink)' : 'var(--club-line)'),
    boxShadow: elevated ? 'var(--club-hard-shadow)' : 'var(--club-soft-shadow)',
    ...style,
  };

  if (interactive) {
    return (
      <motion.div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        }}
        whileTap={isReducedMotion ? undefined : { y: 2, scale: 0.99 }}
        transition={{ duration: 0.08 }}
        style={mergedStyle}
        className={`rounded-[20px] border-2 p-4 cursor-pointer select-none ${className}`}
        {...(rest as React.ComponentProps<typeof motion.div>)}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div
      style={mergedStyle}
      className={`rounded-[20px] border-2 p-4 ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};
