/**
 * DailyChallengesModal — Daily Sprint Puzzles, 7-Day Streak & Daily/Weekly Missions
 * Owned by @ui-eng
 */

import React, { useState } from 'react';
import { Calendar, CheckCircle2, Flame, Gift, Play, Sparkles } from 'lucide-react';
import type { MissionProgressRecord } from '@/types/persistence.types';
import { GAME_METADATA } from '@/config/app.config';
import { UI_ASSETS } from '@/config/themes.config';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { useAudio } from '@/services/audio/AudioContext';
import { RewardEngine } from '@/services/progression/RewardEngine';
import { getLoginStreakState } from '@/services/progression/LoginStreakEngine';
import { useNavigation } from '@/app/NavigationContext';
import { DynamicIcon, KineticButton, KineticModal } from '@/components/common';
import { getTodayKey } from '@/utils/time';

export interface DailyChallengesModalProps {
  open: boolean;
  onClose: () => void;
}

export const DailyChallengesModal: React.FC<DailyChallengesModalProps> = ({
  open,
  onClose,
}) => {
  const { saveData, engine } = usePersistence();
  const { playSfx, triggerHaptic } = useAudio();
  const { startGame } = useNavigation();

  const [tab, setTab] = useState<'daily' | 'weekly'>('daily');
  const [claimMessage, setClaimMessage] = useState<string | null>(null);

  const todayKey = getTodayKey();
  const loginStatus = getLoginStreakState(saveData);
  const dc = saveData.dailyChallenges;
  const isPuzzleToday = dc.dailyPuzzle.dateKey === todayKey;

  const notify = (msg: string) => {
    setClaimMessage(msg);
    window.setTimeout(() => setClaimMessage(null), 3000);
  };

  const handleClaimLogin = () => {
    const res = RewardEngine.commitLoginRewardClaim(engine);
    if (res.success && !res.idempotent) {
      playSfx('win');
      triggerHaptic('levelVictory');
      notify(`Check-in berhasil! +${res.coinsEarned} Permen & +${res.xpEarned} XP.`);
    }
  };

  const handleClaimMission = (missionId: string) => {
    const res = RewardEngine.commitMissionClaim(engine, missionId);
    if (res.success && !res.idempotent) {
      playSfx('coin');
      triggerHaptic('levelVictory');
      notify(`Misi diklaim! +${res.coinsEarned} Permen & +${res.xpEarned} XP.`);
    }
  };

  const renderMissionCard = (m: MissionProgressRecord) => {
    const pct = Math.min(100, Math.round((m.progress / Math.max(1, m.target)) * 100));
    const complete = m.progress >= m.target;
    const scopeLabel = m.game === 'hub' ? 'Semua Mode' : m.game === 'onet' ? 'Onet' : 'Match 3';

    return (
      <div
        key={m.id}
        className="rounded-2xl border-2 p-3 flex flex-col gap-2"
        style={{
          backgroundColor: 'var(--club-paper)',
          borderColor: complete && !m.claimed ? 'var(--club-success)' : 'var(--club-line)',
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border"
                style={{ backgroundColor: 'var(--g-soft)', borderColor: 'var(--club-border-ink)' }}
              >
                {scopeLabel}
              </span>
              <span className="text-[10px] font-bold" style={{ color: 'var(--club-muted)' }}>
                {m.difficulty}
              </span>
            </div>
            <h4 className="font-display font-bold text-sm mt-1 leading-tight">{m.title}</h4>
            <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--club-muted)' }}>
              {m.desc}
            </p>
          </div>

          <div className="shrink-0">
            {m.claimed ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--club-success)' }}>
                <CheckCircle2 size={15} />
                Diklaim
              </span>
            ) : complete ? (
              <KineticButton
                variant="success"
                size="sm"
                data-testid={`claim-mission-${m.id}`}
                onClick={() => handleClaimMission(m.id)}
              >
                +{m.rewardCoins}
              </KineticButton>
            ) : (
              <span className="font-tabular text-xs font-extrabold px-2 py-1 rounded-xl border" style={{ borderColor: 'var(--club-line)' }}>
                +{m.rewardCoins} Permen
              </span>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-[11px] font-tabular font-bold mb-1">
            <span>Progres</span>
            <span>
              {Math.min(m.progress, m.target)} / {m.target}
            </span>
          </div>
          <div className="club-progress-track !h-2">
            <div className="club-progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <KineticModal
      open={open}
      onClose={onClose}
      title="Tantangan & Misi"
      subtitle="Reset harian pukul 00:00 WIB"
      testId="daily-challenges-modal"
    >
      <div className="flex flex-col gap-4">
        {claimMessage && (
          <div
            className="rounded-xl border-2 px-3 py-2 text-xs font-bold flex items-center gap-2"
            style={{ backgroundColor: '#dcfce7', borderColor: '#16a34a', color: '#14532d' }}
          >
            <Sparkles size={15} />
            <span>{claimMessage}</span>
          </div>
        )}

        {/* 7-Day Login Streak Card */}
        <div
          className="rounded-2xl border-2 p-3 flex flex-col gap-2.5"
          style={{ backgroundColor: 'var(--club-paper-2)', borderColor: 'var(--club-border-ink)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Flame size={18} style={{ color: '#f97316' }} />
              <span className="font-display font-bold text-sm">
                Streak Login · Hari ke-{loginStatus.currentStreak}
              </span>
            </div>
            {!loginStatus.claimedToday ? (
              <KineticButton
                variant="gold"
                size="sm"
                data-testid="daily-claim-login-btn"
                icon={<Gift size={14} />}
                onClick={handleClaimLogin}
              >
                Klaim +{loginStatus.rewardCoins}
              </KineticButton>
            ) : (
              <span className="text-xs font-bold" style={{ color: 'var(--club-success)' }}>
                Sudah Check-In
              </span>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {loginStatus.scheduleCoins.map((coins, idx) => {
              const isToday = idx === loginStatus.dayIndex;
              const isPast = idx < loginStatus.dayIndex || (isToday && loginStatus.claimedToday);
              return (
                <div
                  key={idx}
                  className="rounded-xl border py-1.5 flex flex-col items-center justify-center text-center"
                  style={{
                    backgroundColor: isToday
                      ? 'var(--club-gold)'
                      : isPast
                        ? '#dcfce7'
                        : 'var(--club-card)',
                    borderColor: isToday ? '#172337' : 'var(--club-line)',
                    color: isToday || isPast ? '#172337' : 'var(--club-muted)',
                  }}
                >
                  <span className="text-[9px] font-bold">H{idx + 1}</span>
                  <span className="font-tabular text-xs font-extrabold">+{coins}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Puzzles (Onet Sprint & Match 3 Daily) */}
        <div className="grid grid-cols-2 gap-2.5">
          {(['onet', 'match3'] as const).map((gameId) => {
            const done =
              isPuzzleToday &&
              (gameId === 'onet' ? dc.dailyPuzzle.onetCompleted : dc.dailyPuzzle.match3Completed);

            return (
              <div
                key={gameId}
                className="rounded-2xl border-2 p-3 flex flex-col justify-between gap-2"
                style={{
                  backgroundColor: 'var(--club-card)',
                  borderColor: 'var(--club-border-ink)',
                }}
              >
                <div className="flex items-center gap-2">
                  <DynamicIcon src={GAME_METADATA[gameId].iconAsset} kind={gameId} size={24} />
                  <div className="min-w-0">
                    <div className="font-display font-bold text-xs truncate">
                      {gameId === 'onet' ? 'Onet Sprint' : 'Match 3 Harian'}
                    </div>
                    <div className="text-[10px] font-bold" style={{ color: done ? 'var(--club-success)' : 'var(--g-accent)' }}>
                      {done ? 'Tuntas Hari Ini' : '+8 Permen · +80 XP'}
                    </div>
                  </div>
                </div>

                <KineticButton
                  variant={done ? 'secondary' : 'primary'}
                  size="sm"
                  fullWidth
                  data-testid={`daily-play-${gameId}`}
                  icon={<Play size={14} />}
                  onClick={() => {
                    onClose();
                    startGame({
                      game: gameId,
                      level: 1,
                      mode: 'daily',
                      dailyDateKey: todayKey,
                    });
                  }}
                >
                  {done ? 'Main Lagi' : 'Mulai'}
                </KineticButton>
              </div>
            );
          })}
        </div>

        {/* Unclaimed Archive Alert */}
        {dc.unclaimedArchive.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase" style={{ color: 'var(--club-gold)' }}>
              <Calendar size={14} />
              Hadiah Misi Sebelumnya Belum Diklaim
            </div>
            {dc.unclaimedArchive.map(renderMissionCard)}
          </div>
        )}

        {/* Daily vs Weekly Missions Tabs */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab('daily')}
            className="min-h-[42px] rounded-xl border-2 text-xs font-display font-bold cursor-pointer"
            style={{
              backgroundColor: tab === 'daily' ? 'var(--g-accent)' : 'var(--club-card)',
              color: tab === 'daily' ? '#fff' : 'var(--club-ink)',
              borderColor: 'var(--club-border-ink)',
            }}
          >
            Misi Harian ({dc.dailyMissions.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('weekly')}
            className="min-h-[42px] rounded-xl border-2 text-xs font-display font-bold cursor-pointer"
            style={{
              backgroundColor: tab === 'weekly' ? 'var(--g-accent)' : 'var(--club-card)',
              color: tab === 'weekly' ? '#fff' : 'var(--club-ink)',
              borderColor: 'var(--club-border-ink)',
            }}
          >
            Misi Mingguan ({dc.weeklyMissions.length})
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {(tab === 'daily' ? dc.dailyMissions : dc.weeklyMissions).map(renderMissionCard)}
        </div>

        {tab === 'daily' && (
          <div
            className="rounded-xl border px-3 py-2 flex items-center justify-between text-xs font-bold"
            style={{ backgroundColor: 'var(--club-paper-2)', borderColor: 'var(--club-line)' }}
          >
            <div className="flex items-center gap-2">
              <DynamicIcon src={UI_ASSETS.currency} kind="coin" size={16} />
              <span>Bonus Selesaikan 3 Misi Harian</span>
            </div>
            <span style={{ color: dc.dailyAllCompletedBonusClaimed ? 'var(--club-success)' : 'var(--club-muted)' }}>
              {dc.dailyAllCompletedBonusClaimed ? 'Didapat!' : '+5 Permen'}
            </span>
          </div>
        )}
      </div>
    </KineticModal>
  );
};
