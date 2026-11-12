/**
 * StartupScreen — First-Launch Play Club Profile & Starter Avatar Setup
 * Owned by @ui-eng
 */

import React, { useState } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { AVATAR_CATALOG, UI_ASSETS } from '@/config/themes.config';
import { APP_CONFIG } from '@/config/app.config';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { useAudio } from '@/services/audio/AudioContext';
import { useNavigation } from '@/app/NavigationContext';
import { KineticButton, KineticCard } from '@/components/common';

export const StartupScreen: React.FC = () => {
  const { saveData, executeTransaction } = usePersistence();
  const { playMenuBgm } = useAudio();
  const { navigate } = useNavigation();

  const starterAvatars = AVATAR_CATALOG.filter((a) => a.unlock.type === 'free');
  const [playerName, setPlayerName] = useState(
    saveData.profile.playerName && saveData.profile.playerName !== 'Pemain Klub'
      ? saveData.profile.playerName
      : 'Pemain Klub',
  );
  const [selectedAvatarId, setSelectedAvatarId] = useState<string>(
    starterAvatars.some((a) => a.id === saveData.profile.avatarId)
      ? saveData.profile.avatarId
      : starterAvatars[0]?.id ?? 'avatar_male',
  );

  const handleEnterClub = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedName = playerName.trim().slice(0, 20) || 'Pemain Klub';
    executeTransaction({
      idempotencyKey: `startup_complete:${Date.now()}`,
      type: 'STATE_UPDATE',
      mutate: (draft) => {
        draft.profile.playerName = cleanedName;
        draft.profile.avatarId = selectedAvatarId;
      },
    });
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('connectify_onboarding_done', '1');
    }
    playMenuBgm();
    navigate('home', { replace: true });
  };

  return (
    <div
      data-testid="startup-screen"
      className="app-screen-scroll no-nav flex flex-col justify-center"
    >
      <form onSubmit={handleEnterClub} className="flex flex-col gap-4 max-w-[420px] w-full mx-auto">
        {/* Brand Hero */}
        <div className="flex flex-col items-center text-center gap-2">
          <img
            src={UI_ASSETS.brandMark}
            onError={(e) => {
              const img = e.currentTarget;
              if (!img.dataset.fb) {
                img.dataset.fb = '1';
                img.src = UI_ASSETS.brandMarkFallback;
              }
            }}
            alt={APP_CONFIG.appName}
            className="w-24 h-24 object-contain"
          />
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1 rounded-full border-2"
            style={{
              backgroundColor: 'var(--g-soft)',
              borderColor: 'var(--club-border-ink)',
            }}
          >
            <Sparkles size={13} style={{ color: 'var(--g-accent)' }} />
            Selamat Datang di {APP_CONFIG.appName}
          </span>
          <h1 className="font-display text-2xl font-extrabold leading-tight">
            {APP_CONFIG.subtitle}
          </h1>
          <p className="text-xs font-medium max-w-[300px]" style={{ color: 'var(--club-muted)' }}>
            Siapkan kartu anggota klubmu sebelum bermain Onet Connect & Match 3 secara offline.
          </p>
        </div>

        {/* Name & Avatar Picker */}
        <KineticCard className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="startup-name-input"
              className="block text-xs font-extrabold uppercase tracking-wider mb-1.5"
              style={{ color: 'var(--club-muted)' }}
            >
              Nama Panggilan
            </label>
            <input
              id="startup-name-input"
              data-testid="startup-name-input"
              type="text"
              maxLength={20}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Pemain Klub"
              className="w-full min-h-[48px] px-3.5 rounded-2xl border-2 font-display font-bold text-base outline-none"
              style={{
                backgroundColor: 'var(--club-paper)',
                borderColor: 'var(--club-border-ink)',
                color: 'var(--club-ink)',
              }}
            />
          </div>

          <div>
            <span
              className="block text-xs font-extrabold uppercase tracking-wider mb-2"
              style={{ color: 'var(--club-muted)' }}
            >
              Pilih Avatar Pemula
            </span>
            <div className="grid grid-cols-2 gap-3">
              {starterAvatars.map((avatar) => {
                const selected = avatar.id === selectedAvatarId;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    data-testid={`startup-avatar-${avatar.id}`}
                    onClick={() => setSelectedAvatarId(avatar.id)}
                    className="touch-target rounded-2xl border-2 p-3 flex items-center gap-3 text-left cursor-pointer transition-all"
                    style={{
                      backgroundColor: selected ? 'var(--g-soft)' : 'var(--club-paper)',
                      borderColor: selected ? 'var(--g-accent)' : 'var(--club-border-ink)',
                      boxShadow: selected ? '0 3px 0 var(--club-border-ink)' : 'none',
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl border-2 overflow-hidden shrink-0 flex items-center justify-center"
                      style={{
                        backgroundColor: avatar.defaultBgColor,
                        borderColor: 'var(--club-border-ink)',
                      }}
                    >
                      <img
                        src={avatar.assetUrl}
                        alt={avatar.name}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-display font-bold text-sm truncate">
                        {avatar.name}
                      </div>
                      <div className="text-[11px] font-semibold" style={{ color: 'var(--club-muted)' }}>
                        Gratis
                      </div>
                    </div>
                    {selected && (
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: 'var(--g-accent)' }}
                      >
                        <Check size={14} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <KineticButton
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            data-testid="startup-enter-btn"
            icon={<ArrowRight size={19} strokeWidth={2.6} />}
          >
            Masuk ke Klub
          </KineticButton>
        </KineticCard>
      </form>
    </div>
  );
};
