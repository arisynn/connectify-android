/**
 * GameResultModal — Victory / Defeat & Reward Celebration Dialog
 * Owned by @ui-eng
 */

import React from 'react';
import { ArrowRight, Award, CheckCircle2, Flame, Home, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import type { GameResultPayload, RewardBreakdown } from '@/types/game.types';
import { UI_ASSETS } from '@/config/themes.config';
import { getAccountProgress } from '@/services/progression/ProgressionEngine';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { DynamicIcon, KineticButton, KineticModal } from '@/components/common';
import { StarRatingBar } from './StarRatingBar';

export interface GameResultModalProps {
  open: boolean;
  payload: GameResultPayload | null;
  breakdown: RewardBreakdown | null;
  onNextLevel?: () => void;
  onRetry: () => void;
  onExitToMap: () => void;
  hasNextLevel?: boolean;
}

export const GameResultModal: React.FC<GameResultModalProps> = ({
  open,
  payload,
  breakdown,
  onNextLevel,
  onRetry,
  onExitToMap,
  hasNextLevel = true,
}) => {
  const { saveData } = usePersistence();

  if (!payload) {
    return null;
  }

  const isWinner = payload.isWinner;
  const stars = isWinner ? (breakdown?.starsEarned ?? payload.stars) : 0;
  const coinsEarned = breakdown?.coinsEarned ?? 0;
  const xpEarned = breakdown?.xpEarned ?? 0;
  const accountSummary = getAccountProgress(saveData.profile.xp);

  const defeatReasonText =
    payload.game === 'onet'
      ? 'Waktu habis! Coba lagi dengan alur kombo lebih cepat.'
      : 'Langkah habis! Manfaatkan spesial tile untuk menyelesaikan target.';

  return (
    <KineticModal
      open={open}
      dismissible={false}
      testId="result-dialog"
      title={isWinner ? 'Level Selesai!' : 'Belum Berhasil'}
      subtitle={`${payload.game === 'onet' ? 'Onet Connect' : 'Match 3'} · ${
        payload.isDailyChallenge ? 'Tantangan Harian' : `Level ${payload.level}`
      }`}
    >
      <div className="flex flex-col gap-4">
        {/* Hero Trophy / Defeat Banner */}
        <div
          className="rounded-2xl border-2 p-4 flex flex-col items-center text-center gap-2.5"
          style={{
            backgroundColor: isWinner ? 'var(--g-soft)' : 'var(--club-paper-2)',
            borderColor: 'var(--club-border-ink)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center"
            style={{
              backgroundColor: isWinner ? 'var(--club-gold)' : 'var(--club-card)',
              borderColor: 'var(--club-border-ink)',
              boxShadow: '0 3px 0 var(--club-border-ink)',
            }}
          >
            {isWinner ? (
              <Trophy size={28} strokeWidth={2.4} color="#172337" />
            ) : (
              <RotateCcw size={26} strokeWidth={2.4} style={{ color: 'var(--club-danger)' }} />
            )}
          </div>

          <StarRatingBar stars={stars} size="lg" animated={isWinner} />

          {isWinner ? (
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {breakdown?.isFirstClear && (
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: 'var(--club-success)',
                    color: '#fff',
                    borderColor: 'var(--club-border-ink)',
                  }}
                >
                  First Clear!
                </span>
              )}
              {breakdown?.isNewBestScore && (
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: 'var(--club-gold)',
                    color: '#172337',
                    borderColor: 'var(--club-border-ink)',
                  }}
                >
                  Rekor Baru!
                </span>
              )}
              {payload.isFlawless && (
                <span
                  className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: 'var(--club-card)',
                    color: 'var(--club-ink)',
                    borderColor: 'var(--club-border-ink)',
                  }}
                >
                  Tanpa Salah
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs font-medium max-w-[280px]" style={{ color: 'var(--club-muted)' }}>
              {defeatReasonText}
            </p>
          )}
        </div>

        {/* Score & Combo Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div
            className="rounded-2xl border-2 p-2.5 text-center"
            style={{ backgroundColor: 'var(--club-card)', borderColor: 'var(--club-line)' }}
          >
            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--club-muted)' }}>
              Skor
            </div>
            <div className="font-tabular text-base font-extrabold mt-0.5">
              {Math.max(0, Math.floor(payload.score)).toLocaleString('id-ID')}
            </div>
          </div>

          <div
            className="rounded-2xl border-2 p-2.5 text-center"
            style={{ backgroundColor: 'var(--club-card)', borderColor: 'var(--club-line)' }}
          >
            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--club-muted)' }}>
              {payload.game === 'onet' ? 'Sisa Waktu' : 'Sisa Langkah'}
            </div>
            <div className="font-tabular text-base font-extrabold mt-0.5">
              {payload.game === 'onet'
                ? `${Math.max(0, Math.floor(payload.remainingTimeSec ?? 0))}d`
                : Math.max(0, Math.floor(payload.movesRemaining ?? 0))}
            </div>
          </div>

          <div
            className="rounded-2xl border-2 p-2.5 text-center"
            style={{ backgroundColor: 'var(--club-card)', borderColor: 'var(--club-line)' }}
          >
            <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--club-muted)' }}>
              Kombo Max
            </div>
            <div className="font-tabular text-base font-extrabold mt-0.5 inline-flex items-center gap-1 justify-center">
              <Flame size={14} style={{ color: 'var(--g-accent)' }} />
              ×{Math.max(0, Math.floor(payload.highestCombo))}
            </div>
          </div>
        </div>

        {/* Rewards Earned (Coins + XP) */}
        <div
          className="rounded-2xl border-2 p-3 flex flex-col gap-2.5"
          style={{
            backgroundColor: 'var(--club-paper-2)',
            borderColor: 'var(--club-border-ink)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <DynamicIcon src={UI_ASSETS.currency} kind="coin" size={24} />
              <span className="font-display font-bold text-sm">Hadiah Ronde</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="font-tabular text-sm font-extrabold px-2.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor: 'var(--club-gold)',
                  color: '#172337',
                  borderColor: 'var(--club-border-ink)',
                }}
              >
                +{coinsEarned} Permen
              </span>
              <span
                className="font-tabular text-xs font-extrabold px-2.5 py-0.5 rounded-full border"
                style={{
                  backgroundColor: 'var(--club-card)',
                  color: 'var(--club-ink)',
                  borderColor: 'var(--club-border-ink)',
                }}
              >
                +{xpEarned} XP
              </span>
            </div>
          </div>

          {/* Account XP Progress Bar */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold mb-1">
              <span>
                Level Akun {accountSummary.level} · {accountSummary.title}
              </span>
              <span className="font-tabular" style={{ color: 'var(--club-muted)' }}>
                {accountSummary.currentXpInLevel} / {accountSummary.xpNeededForNext} XP
              </span>
            </div>
            <div className="club-progress-track">
              <div
                className="club-progress-fill"
                style={{ width: `${accountSummary.percent}%` }}
              />
            </div>
          </div>

          {breakdown?.leveledUp && (
            <div
              className="rounded-xl border px-3 py-2 flex items-center gap-2 text-xs font-bold"
              style={{
                backgroundColor: '#fef3c7',
                color: '#92400e',
                borderColor: '#f59e0b',
              }}
            >
              <Sparkles size={16} />
              <span>
                Naik ke Level Akun {breakdown.newAccountLevel}! Cek hadiah milestone di Profil.
              </span>
            </div>
          )}

          {breakdown &&
            (breakdown.completedMissionIds.length > 0 ||
              breakdown.unlockedAchievementIds.length > 0) && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {breakdown.completedMissionIds.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border"
                    style={{
                      backgroundColor: 'var(--club-card)',
                      borderColor: 'var(--club-success)',
                      color: 'var(--club-success)',
                    }}
                  >
                    <CheckCircle2 size={13} />
                    {breakdown.completedMissionIds.length} Misi Siap Diklaim
                  </span>
                )}
                {breakdown.unlockedAchievementIds.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border"
                    style={{
                      backgroundColor: 'var(--club-card)',
                      borderColor: 'var(--club-gold)',
                      color: '#b45309',
                    }}
                  >
                    <Award size={13} />
                    {breakdown.unlockedAchievementIds.length} Pencapaian Baru!
                  </span>
                )}
              </div>
            )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          {isWinner && !payload.isDailyChallenge && hasNextLevel && onNextLevel && (
            <KineticButton
              variant="primary"
              size="lg"
              fullWidth
              data-testid="result-next-btn"
              icon={<ArrowRight size={19} strokeWidth={2.6} />}
              onClick={onNextLevel}
            >
              Lanjut Level {payload.level + 1}
            </KineticButton>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <KineticButton
              variant={isWinner ? 'secondary' : 'primary'}
              size="md"
              data-testid="result-retry-btn"
              icon={<RotateCcw size={16} strokeWidth={2.4} />}
              onClick={onRetry}
            >
              {isWinner ? 'Main Ulang' : 'Coba Lagi'}
            </KineticButton>

            <KineticButton
              variant="secondary"
              size="md"
              data-testid="result-map-btn"
              icon={<Home size={16} strokeWidth={2.4} />}
              onClick={onExitToMap}
            >
              Peta Level
            </KineticButton>
          </div>
        </div>
      </div>
    </KineticModal>
  );
};
