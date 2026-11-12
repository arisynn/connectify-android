/**
 * ProfileScreen — Player Passport, Avatar Editor, Achievements, Stats & Rank Journey
 * Owned by @ui-eng
 */

import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Check,
  Crown,
  Edit3,
  Lock,
  ReceiptText,
  Settings,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  ACCOUNT_MILESTONES,
  ACHIEVEMENTS_CATALOG,
} from '@/config/progression.config';
import { AVATAR_CATALOG, FRAME_CATALOG, UI_ASSETS } from '@/config/themes.config';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { useAudio } from '@/services/audio/AudioContext';
import { getAccountProgress } from '@/services/progression/ProgressionEngine';
import {
  getClaimableAchievements,
  getClaimedTierCount,
  isAchievementReady,
} from '@/services/progression/AchievementEngine';
import { RewardEngine } from '@/services/progression/RewardEngine';
import { useNavigation } from '@/app/NavigationContext';
import { DynamicIcon, KineticButton, KineticCard, KineticModal } from '@/components/common';

type ProfileTab = 'achievements' | 'stats' | 'milestones';
type AchievementScope = 'all' | 'hub' | 'onet' | 'match3';

function formatPlayDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hrs > 0) return `${hrs}j ${mins}m`;
  return `${mins}m`;
}

export const ProfileScreen: React.FC = () => {
  const { saveData, engine, executeTransaction } = usePersistence();
  const { playSfx, triggerHaptic } = useAudio();
  const { navigate, openModal } = useNavigation();

  const [activeTab, setActiveTab] = useState<ProfileTab>('achievements');
  const [achScope, setAchScope] = useState<AchievementScope>('all');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [draftName, setDraftName] = useState(saveData.profile.playerName);
  const [draftAvatarId, setDraftAvatarId] = useState(saveData.profile.avatarId);
  const [toast, setToast] = useState<string | null>(null);

  const account = getAccountProgress(saveData.profile.xp);
  const claimableList = useMemo(() => getClaimableAchievements(saveData), [saveData]);

  const activeAvatar =
    AVATAR_CATALOG.find((a) => a.id === saveData.profile.avatarId) ?? AVATAR_CATALOG[0];
  const activeFrame = saveData.inventory.equippedCosmetics.frame
    ? FRAME_CATALOG.find((f) => f.id === saveData.inventory.equippedCosmetics.frame) ?? null
    : null;

  const filteredAchievements = useMemo(() => {
    const list =
      achScope === 'all'
        ? ACHIEVEMENTS_CATALOG
        : ACHIEVEMENTS_CATALOG.filter((a) => a.game === achScope);
    // Sort ready-to-claim achievements first
    return [...list].sort((a, b) => {
      const ra = isAchievementReady(saveData, a) ? 1 : 0;
      const rb = isAchievementReady(saveData, b) ? 1 : 0;
      return rb - ra;
    });
  }, [achScope, saveData]);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  };

  const handleClaimAchievement = (id: string) => {
    const res = RewardEngine.commitAchievementClaim(engine, id);
    if (res.success && !res.idempotent) {
      playSfx('win');
      triggerHaptic('levelVictory');
      notify(`Pencapaian diklaim! +${res.coinsEarned} Permen & +${res.xpEarned} XP.`);
    }
  };

  const handleSaveIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = draftName.trim().slice(0, 20) || 'Pemain Klub';
    executeTransaction({
      idempotencyKey: `edit_profile:${Date.now()}`,
      type: 'STATE_UPDATE',
      mutate: (draft) => {
        draft.profile.playerName = cleaned;
        draft.profile.avatarId = draftAvatarId;
      },
    });
    setEditModalOpen(false);
    playSfx('match');
    notify('Profil diperbarui.');
  };

  const stats = saveData.statistics;

  return (
    <div data-testid="profile-passport" className="app-screen-scroll flex flex-col gap-3.5 club-enter">
      {/* Header Actions */}
      <header className="flex items-center justify-between gap-2">
        <h1 className="font-display font-extrabold text-xl">Paspor Klub</h1>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="profile-ledger-btn"
            aria-label="Buku kas transaksi"
            onClick={() => navigate('ledger')}
            className="touch-target w-11 h-11 rounded-2xl border-2 flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'var(--club-card)', borderColor: 'var(--club-border-ink)' }}
          >
            <ReceiptText size={18} />
          </button>
          <button
            type="button"
            data-testid="profile-settings-btn"
            aria-label="Pengaturan"
            onClick={() => openModal('settings')}
            className="touch-target w-11 h-11 rounded-2xl border-2 flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'var(--club-card)', borderColor: 'var(--club-border-ink)' }}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {toast && (
        <div
          className="rounded-2xl border-2 px-3.5 py-2 text-xs font-bold flex items-center gap-2"
          style={{ backgroundColor: '#dcfce7', borderColor: '#16a34a', color: '#14532d' }}
        >
          <Sparkles size={15} />
          <span>{toast}</span>
        </div>
      )}

      {/* Passport Card */}
      <KineticCard className="flex flex-col gap-3 !p-4">
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            aria-label="Ubah avatar & nama"
            onClick={() => {
              setDraftName(saveData.profile.playerName);
              setDraftAvatarId(saveData.profile.avatarId);
              setEditModalOpen(true);
            }}
            className="relative w-16 h-16 rounded-2xl border-2 shrink-0 flex items-center justify-center overflow-hidden cursor-pointer"
            style={{
              backgroundColor: activeAvatar.defaultBgColor,
              borderColor: 'var(--club-border-ink)',
              boxShadow: '0 3px 0 var(--club-border-ink)',
            }}
          >
            <img src={activeAvatar.assetUrl} alt={activeAvatar.name} className="w-13 h-13 object-contain" />
            {activeFrame && (
              <img
                src={activeFrame.assetUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            )}
            <span
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border flex items-center justify-center bg-white"
              style={{ borderColor: '#172337', color: '#172337' }}
            >
              <Edit3 size={12} />
            </span>
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display font-extrabold text-lg truncate">
                {saveData.profile.playerName}
              </h2>
              <span
                className="text-[11px] font-extrabold px-2 py-0.5 rounded-full border shrink-0"
                style={{
                  backgroundColor: 'var(--club-gold)',
                  color: '#172337',
                  borderColor: 'var(--club-border-ink)',
                }}
              >
                Lv. {account.level}
              </span>
            </div>
            <div className="text-xs font-bold mt-0.5 flex items-center gap-1" style={{ color: 'var(--g-accent)' }}>
              <Crown size={13} />
              <span>{account.title}</span>
            </div>

            <div className="mt-2">
              <div className="flex justify-between text-[10px] font-tabular font-bold mb-1" style={{ color: 'var(--club-muted)' }}>
                <span>XP {account.xp.toLocaleString('id-ID')}</span>
                <span>
                  {account.currentXpInLevel}/{account.xpNeededForNext}
                </span>
              </div>
              <div className="club-progress-track !h-2.5">
                <div className="club-progress-fill" style={{ width: `${account.percent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Summary Badges */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t" style={{ borderColor: 'var(--club-line)' }}>
          <div className="text-center">
            <div className="font-tabular text-base font-extrabold">
              {saveData.progression.onet.totalStars + saveData.progression.match3.totalStars}
            </div>
            <div className="text-[10px] font-bold" style={{ color: 'var(--club-muted)' }}>
              Total Bintang
            </div>
          </div>
          <div className="text-center">
            <div className="font-tabular text-base font-extrabold">{stats.totalWins}</div>
            <div className="text-[10px] font-bold" style={{ color: 'var(--club-muted)' }}>
              Total Menang
            </div>
          </div>
          <div className="text-center">
            <div className="font-tabular text-base font-extrabold">
              {saveData.profile.loginStreak.bestStreak}h
            </div>
            <div className="text-[10px] font-bold" style={{ color: 'var(--club-muted)' }}>
              Rekor Streak
            </div>
          </div>
        </div>
      </KineticCard>

      {/* Section Tabs */}
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          data-testid="profile-tab-achievements"
          onClick={() => setActiveTab('achievements')}
          className="min-h-[44px] rounded-2xl border-2 px-2 flex items-center justify-center gap-1.5 text-xs font-display font-bold cursor-pointer"
          style={{
            backgroundColor: activeTab === 'achievements' ? 'var(--g-accent)' : 'var(--club-card)',
            color: activeTab === 'achievements' ? '#fff' : 'var(--club-ink)',
            borderColor: 'var(--club-border-ink)',
          }}
        >
          <Trophy size={14} />
          <span>Pencapaian</span>
          {claimableList.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-500 text-white">
              {claimableList.length}
            </span>
          )}
        </button>

        <button
          type="button"
          data-testid="profile-tab-stats"
          onClick={() => setActiveTab('stats')}
          className="min-h-[44px] rounded-2xl border-2 px-2 flex items-center justify-center gap-1.5 text-xs font-display font-bold cursor-pointer"
          style={{
            backgroundColor: activeTab === 'stats' ? 'var(--g-accent)' : 'var(--club-card)',
            color: activeTab === 'stats' ? '#fff' : 'var(--club-ink)',
            borderColor: 'var(--club-border-ink)',
          }}
        >
          <BarChart3 size={14} />
          <span>Statistik</span>
        </button>

        <button
          type="button"
          data-testid="profile-tab-milestones"
          onClick={() => setActiveTab('milestones')}
          className="min-h-[44px] rounded-2xl border-2 px-2 flex items-center justify-center gap-1.5 text-xs font-display font-bold cursor-pointer"
          style={{
            backgroundColor: activeTab === 'milestones' ? 'var(--g-accent)' : 'var(--club-card)',
            color: activeTab === 'milestones' ? '#fff' : 'var(--club-ink)',
            borderColor: 'var(--club-border-ink)',
          }}
        >
          <Award size={14} />
          <span>Rank</span>
        </button>
      </div>

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto club-scroll-hide">
            {(
              [
                { id: 'all', label: 'Semua' },
                { id: 'hub', label: 'Klub' },
                { id: 'onet', label: 'Onet' },
                { id: 'match3', label: 'Match 3' },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setAchScope(s.id)}
                className="min-h-[34px] px-3 rounded-xl border text-xs font-bold cursor-pointer shrink-0"
                style={{
                  backgroundColor: achScope === s.id ? 'var(--g-soft)' : 'var(--club-card)',
                  borderColor: achScope === s.id ? 'var(--g-accent)' : 'var(--club-line)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {filteredAchievements.map((ach) => {
            const claimedTier = getClaimedTierCount(saveData, ach.id);
            const maxed = claimedTier >= ach.tiers.length;
            const currentTier = ach.tiers[Math.min(claimedTier, ach.tiers.length - 1)];
            const progress = ach.getProgress(saveData);
            const ready = !maxed && progress >= currentTier.target;
            const pct = Math.min(100, Math.round((progress / Math.max(1, currentTier.target)) * 100));

            return (
              <KineticCard key={ach.id} className="flex flex-col gap-2 !p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border"
                        style={{ backgroundColor: 'var(--club-paper-2)', borderColor: 'var(--club-border-ink)' }}
                      >
                        Tier {Math.min(claimedTier + 1, ach.tiers.length)}/{ach.tiers.length}
                      </span>
                      <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--club-muted)' }}>
                        {ach.game === 'hub' ? 'Umum' : ach.game === 'onet' ? 'Onet' : 'Match 3'}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-sm mt-1">{ach.title}</h3>
                    <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--club-muted)' }}>
                      {ach.desc(currentTier.target)}
                    </p>
                  </div>

                  {maxed ? (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-bold shrink-0"
                      style={{ color: 'var(--club-success)' }}
                    >
                      <Check size={15} />
                      Tuntas
                    </span>
                  ) : ready ? (
                    <KineticButton
                      variant="success"
                      size="sm"
                      data-testid={`claim-ach-${ach.id}`}
                      onClick={() => handleClaimAchievement(ach.id)}
                    >
                      +{currentTier.rewardCoins}
                    </KineticButton>
                  ) : (
                    <div className="flex items-center gap-1 text-xs font-tabular font-bold shrink-0">
                      <DynamicIcon src={UI_ASSETS.currency} kind="coin" size={14} />
                      <span>+{currentTier.rewardCoins}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-tabular font-bold mb-1">
                    <span>Progres</span>
                    <span>
                      {Math.min(progress, currentTier.target).toLocaleString('id-ID')} /{' '}
                      {currentTier.target.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="club-progress-track !h-2">
                    <div className="club-progress-fill" style={{ width: `${maxed ? 100 : pct}%` }} />
                  </div>
                </div>
              </KineticCard>
            );
          })}
        </div>
      )}

      {/* Statistics Tab */}
      {activeTab === 'stats' && (
        <div className="flex flex-col gap-3">
          <KineticCard className="!p-4 flex flex-col gap-2.5">
            <h3 className="font-display font-bold text-sm">Ringkasan Global</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--club-line)' }}>
                <div style={{ color: 'var(--club-muted)' }}>Total Permainan</div>
                <div className="font-tabular font-extrabold text-base mt-0.5">{stats.totalGamesPlayed}</div>
              </div>
              <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--club-line)' }}>
                <div style={{ color: 'var(--club-muted)' }}>Skor Tertinggi</div>
                <div className="font-tabular font-extrabold text-base mt-0.5">
                  {stats.highestSingleScore.toLocaleString('id-ID')}
                </div>
              </div>
              <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--club-line)' }}>
                <div style={{ color: 'var(--club-muted)' }}>Waktu Bermain</div>
                <div className="font-tabular font-extrabold text-base mt-0.5">
                  {formatPlayDuration(stats.totalPlayTimeMs)}
                </div>
              </div>
              <div className="rounded-xl border p-2.5" style={{ borderColor: 'var(--club-line)' }}>
                <div style={{ color: 'var(--club-muted)' }}>Kombo Terbaik</div>
                <div className="font-tabular font-extrabold text-base mt-0.5">×{stats.highestCombo}</div>
              </div>
            </div>
          </KineticCard>

          <KineticCard className="!p-4 flex flex-col gap-2">
            <h3 className="font-display font-bold text-sm">Onet Connect</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span style={{ color: 'var(--club-muted)' }}>Menang:</span>
                <span className="font-tabular font-bold">{stats.onet.wins}/{stats.onet.gamesPlayed}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--club-muted)' }}>Skor Max:</span>
                <span className="font-tabular font-bold">{stats.onet.highScore.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--club-muted)' }}>Pasangan:</span>
                <span className="font-tabular font-bold">{stats.onet.totalPairsMatched.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--club-muted)' }}>Tile Pecah:</span>
                <span className="font-tabular font-bold">{stats.onet.totalSplits}</span>
              </div>
            </div>
          </KineticCard>

          <KineticCard className="!p-4 flex flex-col gap-2">
            <h3 className="font-display font-bold text-sm">Match 3</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex justify-between">
                <span style={{ color: 'var(--club-muted)' }}>Menang:</span>
                <span className="font-tabular font-bold">{stats.match3.wins}/{stats.match3.gamesPlayed}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--club-muted)' }}>Skor Max:</span>
                <span className="font-tabular font-bold">{stats.match3.highScore.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--club-muted)' }}>Tile Spesial:</span>
                <span className="font-tabular font-bold">{stats.match3.specialTilesCreated}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--club-muted)' }}>Rintangan:</span>
                <span className="font-tabular font-bold">{stats.match3.blockersCleared}</span>
              </div>
            </div>
          </KineticCard>
        </div>
      )}

      {/* Milestones Tab */}
      {activeTab === 'milestones' && (
        <div className="flex flex-col gap-2.5">
          {ACCOUNT_MILESTONES.map((ms) => {
            const reached = account.level >= ms.accountLevel;
            return (
              <KineticCard
                key={ms.id}
                className="flex items-center justify-between gap-3 !p-3.5"
                style={{ opacity: reached ? 1 : 0.72 }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-2xl border-2 flex items-center justify-center font-tabular font-extrabold text-xs shrink-0"
                    style={{
                      backgroundColor: reached ? 'var(--club-gold)' : 'var(--club-paper-2)',
                      color: reached ? '#172337' : 'var(--club-muted)',
                      borderColor: 'var(--club-border-ink)',
                    }}
                  >
                    Lv.{ms.accountLevel}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-xs truncate">{ms.label}</div>
                    <div className="text-[11px] font-semibold" style={{ color: 'var(--club-muted)' }}>
                      {reached ? 'Terbuka otomatis' : `Capai Level Akun ${ms.accountLevel}`}
                    </div>
                  </div>
                </div>
                {reached ? (
                  <Check size={18} style={{ color: 'var(--club-success)' }} />
                ) : (
                  <Lock size={16} style={{ color: 'var(--club-muted)' }} />
                )}
              </KineticCard>
            );
          })}
        </div>
      )}

      {/* Edit Identity Modal */}
      <KineticModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Ubah Profil"
        testId="edit-profile-modal"
      >
        <form onSubmit={handleSaveIdentity} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="edit-player-name"
              className="block text-xs font-extrabold uppercase mb-1.5"
              style={{ color: 'var(--club-muted)' }}
            >
              Nama Pemain
            </label>
            <input
              id="edit-player-name"
              type="text"
              maxLength={20}
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full min-h-[48px] px-3.5 rounded-2xl border-2 font-display font-bold text-sm outline-none"
              style={{
                backgroundColor: 'var(--club-paper)',
                borderColor: 'var(--club-border-ink)',
                color: 'var(--club-ink)',
              }}
            />
          </div>

          <div>
            <span
              className="block text-xs font-extrabold uppercase mb-2"
              style={{ color: 'var(--club-muted)' }}
            >
              Pilih Avatar Dimiliki
            </span>
            <div className="grid grid-cols-3 gap-2">
              {AVATAR_CATALOG.map((av) => {
                const unlocked =
                  av.unlock.type === 'free' ||
                  saveData.inventory.unlockedAvatars.includes(av.id) ||
                  saveData.inventory.ownedCosmetics.includes(av.id);
                const selected = draftAvatarId === av.id;

                return (
                  <button
                    key={av.id}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => setDraftAvatarId(av.id)}
                    className="touch-target rounded-2xl border-2 p-2 flex flex-col items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: selected ? 'var(--g-soft)' : 'var(--club-paper)',
                      borderColor: selected ? 'var(--g-accent)' : 'var(--club-border-ink)',
                    }}
                  >
                    <img src={av.assetUrl} alt={av.name} className="w-11 h-11 object-contain" />
                    <span className="text-[11px] font-bold truncate w-full text-center">
                      {av.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <KineticButton type="submit" variant="primary" size="lg" fullWidth>
            Simpan Perubahan
          </KineticButton>
        </form>
      </KineticModal>
    </div>
  );
};
