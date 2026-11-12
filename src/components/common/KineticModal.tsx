/**
 * KineticModal — Accessible Safe-Area Modal Dialog
 * Owned by @ui-eng
 */

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useTheme } from '@/services/theme/ThemeContext';
import { useAudio } from '@/services/audio/AudioContext';

export interface KineticModalProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  dismissible?: boolean;
  testId?: string;
  maxWidthClass?: string;
  children: React.ReactNode;
}

export const KineticModal: React.FC<KineticModalProps> = ({
  open,
  onClose,
  title,
  subtitle,
  headerRight,
  dismissible = true,
  testId,
  maxWidthClass = 'max-w-[440px]',
  children,
}) => {
  const { isReducedMotion } = useTheme();
  const { playUiClick } = useAudio();

  useEffect(() => {
    if (!open || !dismissible || !onClose) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, dismissible, onClose]);

  const handleClose = () => {
    if (!dismissible || !onClose) return;
    playUiClick();
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid={testId ? `${testId}-backdrop` : undefined}
          className="club-modal-backdrop"
          initial={isReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={isReducedMotion ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.16 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title ?? 'Dialog'}
            data-testid={testId}
            className={`club-modal-card ${maxWidthClass}`}
            initial={
              isReducedMotion
                ? { opacity: 1 }
                : { opacity: 0, scale: 0.94, y: 12 }
            }
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={
              isReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.96, y: 8 }
            }
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
          >
            {(title || (dismissible && onClose)) && (
              <div
                className="flex items-center justify-between gap-3 px-4 py-3 border-b-2 shrink-0"
                style={{
                  borderColor: 'var(--club-line)',
                  backgroundColor: 'var(--club-paper-2)',
                }}
              >
                <div className="min-w-0">
                  {title && (
                    <h2 className="font-display text-lg font-bold leading-tight truncate">
                      {title}
                    </h2>
                  )}
                  {subtitle && (
                    <p
                      className="text-xs font-medium truncate mt-0.5"
                      style={{ color: 'var(--club-muted)' }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {headerRight}
                  {dismissible && onClose && (
                    <button
                      type="button"
                      aria-label="Tutup dialog"
                      onClick={handleClose}
                      className="touch-target w-12 h-12 rounded-2xl flex items-center justify-center border-2 cursor-pointer transition-transform active:translate-y-[2px]"
                      style={{
                        backgroundColor: 'var(--club-card)',
                        borderColor: 'var(--club-border-ink)',
                        boxShadow: '0 2px 0 var(--club-border-ink)',
                      }}
                    >
                      <X size={20} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-y-auto p-4 club-scroll-hide">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
