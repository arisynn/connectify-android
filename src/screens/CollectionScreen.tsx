/**
 * CollectionScreen — Owned Themes, Board Surfaces, Match Effects & Quick-Theme Picker
 * Owned by @ui-eng
 */

import React, { useEffect, useState } from 'react';
import { Check, Eye, Lock, Palette, Sparkles } from 'lucide-react';
import type { ThemeEquipScope } from '@/types/theme.types';
import {
  EFFECT_CATALOG,
  FRAME_CATALOG,
  SURFACE_CATALOG,
} from '@/config/themes.config';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { useTheme } from '@/services/theme/ThemeContext';
import { useAudio } from '@/services/audio/AudioContext';
import { useNavigation } from '@/app/NavigationContext';
import { KineticButton, KineticCard, KineticModal } from '@/components/common';

type CollectionTab = 'themes' | 'surfaces' | 'effects' | 'frames';

export const CollectionScreen: React.FC = () => {
  const { saveData, executeTransaction } = usePersistence();
  const {
    themes,
    unlockedThemes,
    ownedCosmetics,
    activeSurface,
    activeEffect,
    activeFrame,
    equipTheme,
    equipCosmetic,
  } = useTheme();
  const { playSfx, triggerHaptic } = useAudio();
  const { openModal, navigate } = useNavigation();

  const [tab, setTab] = useState<CollectionTab>('themes');
  const [scope, setScope] = useState<ThemeEquipScope>('both');
  const [toast, setToast] = useState<string | null>(null);

  // Clear unseen theme badges when inspecting collection
  useEffect(() => {
    if (saveData.inventory.unseenThemes.length > 0) {
      executeTransaction({
        idempotencyKey: `clear_unseen:${Date.now()}`,
        type: 'STATE_UPDATE',
        mutate: (draft) => {
          draft.inventory.unseenThemes = [];
        },
      });
    }
  }, [executeTransaction, saveData.inventory.unseenThemes.length]);

  const notify = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <div data-testid="collection-screen" className="app-screen-scroll flex flex-col gap-3.5 club-enter">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-11 h-11 rounded-2xl border-2 flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--g-soft)', borderColor: 'var(--club-border-ink)' }}
          >
            <Palette size={21} style={{ color: 'var(--g-accent)' }} />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-lg leading-tight">Koleksi & Tema</h1>
            <p className="text-xs font-semibold" style={{ color: 'var(--club-muted)' }}>
              {unlockedThemes.length}/{themes.length} Tema Terbuka
            </p>
          </div>
        </div>

        <KineticButton variant="secondary" size="sm" onClick={() => navigate('shop')}>
          Ke Toko
        </KineticButton>
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

      {/* Sub-tabs */}
      <div className="grid grid-cols-4 gap-1.5">
        {(
          [
            { id: 'themes', label: 'Tema' },
            { id: 'surfaces', label: 'Papan' },
            { id: 'effects', label: 'Efek' },
            { id: 'frames', label: 'Bingkai' },
          ] as const
        ).map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className="min-h-[42px] rounded-xl border-2 text-xs font-display font-bold cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--g-accent)' : 'var(--club-card)',
                color: active ? '#fff' : 'var(--club-ink)',
                borderColor: 'var(--club-border-ink)',
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Themes Tab */}
      {tab === 'themes' && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold" style={{ color: 'var(--club-muted)' }}>
              Pasang untuk:
            </span>
            <div className="grid grid-cols-3 gap-1.5 flex-1">
              {(
                [
                  { id: 'both', label: 'Semua' },
                  { id: 'onet', label: 'Onet' },
                  { id: 'match3', label: 'Match 3' },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setScope(s.id)}
                  className="min-h-[36px] rounded-xl border text-xs font-bold cursor-pointer"
                  style={{
                    backgroundColor: scope === s.id ? 'var(--g-soft)' : 'var(--club-card)',
                    borderColor: scope === s.id ? 'var(--g-accent)' : 'var(--club-line)',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {themes.map((theme) => {
              const unlocked =
                theme.unlock.type === 'free' || unlockedThemes.includes(theme.id);
              const eq = saveData.inventory.equippedThemes;
              const equipped =
                scope === 'both'
                  ? eq.globalThemeId === theme.id
                  : scope === 'onet'
                    ? (eq.onetThemeOverride ?? eq.globalThemeId) === theme.id
                    : (eq.match3ThemeOverride ?? eq.globalThemeId) === theme.id;

              const tiles = theme.preview.preview4Indices.map(
                (i) => theme.tileUrls[i] ?? theme.tileUrls[0],
              );

              return (
                <KineticCard key={theme.id} className="flex flex-col justify-between gap-2.5 !p-3">
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border rarity-${theme.rarity}`}>
                        {theme.rarity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Pratinjau ${theme.name}`}
                        onClick={() => openModal('theme-preview', { themeId: theme.id })}
                        className="w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer"
                        style={{
                          backgroundColor: 'var(--club-paper-2)',
                          borderColor: 'var(--club-border-ink)',
                        }}
                      >
                        <Eye size={14} />
                      </button>
                    </div>

                    <div
                      className="rounded-xl border p-2 grid grid-cols-2 gap-1.5 mb-2"
                      style={{
                        backgroundColor: theme.palette.backgroundBoard,
                        borderColor: theme.palette.tileBorder,
                      }}
                    >
                      {tiles.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt=""
                          className="w-full aspect-square object-contain rounded-lg bg-white/90 p-0.5"
                        />
                      ))}
                    </div>

                    <h3 className="font-display font-bold text-xs truncate">{theme.name}</h3>
                    <p className="text-[10px] font-semibold mt-0.5 truncate" style={{ color: 'var(--club-muted)' }}>
                      {unlocked
                        ? theme.soundPairing.presetName
                        : theme.unlock.type === 'coins'
                          ? `${theme.unlock.price} Permen`
                          : theme.unlock.type === 'milestone'
                            ? theme.unlock.label
                            : 'Gratis'}
                    </p>
                  </div>

                  {unlocked ? (
                    <KineticButton
                      variant={equipped ? 'success' : 'primary'}
                      size="sm"
                      fullWidth
                      icon={equipped ? <Check size={14} /> : undefined}
                      onClick={() => {
                        equipTheme(theme.id, scope);
                        playSfx('match');
                        triggerHaptic('uiTap');
                        notify(`Tema "${theme.name}" dipasang!`);
                      }}
                    >
                      {equipped ? 'Dipakai' : 'Pasang'}
                    </KineticButton>
                  ) : (
                    <KineticButton
                      variant="secondary"
                      size="sm"
                      fullWidth
                      icon={<Lock size={13} />}
                      onClick={() => openModal('theme-preview', { themeId: theme.id })}
                    >
                      Pratinjau
                    </KineticButton>
                  )}
                </KineticCard>
              );
            })}
          </div>
        </>
      )}

      {/* Surfaces Tab */}
      {tab === 'surfaces' && (
        <div className="grid grid-cols-2 gap-2.5">
          {SURFACE_CATALOG.map((surface) => {
            const owned =
              surface.priceCoins === 0 || ownedCosmetics.includes(surface.id);
            const isEquipped = activeSurface.id === surface.id;
            const slot = surface.category === 'arrow_skin' ? 'arrow' : 'block';

            return (
              <KineticCard key={surface.id} className="flex flex-col justify-between gap-2.5 !p-3">
                <div>
                  <div
                    className="w-full h-18 rounded-xl border-2 flex items-center justify-center p-2 mb-2"
                    style={{
                      backgroundColor: surface.trayTint,
                      borderColor: 'var(--club-border-ink)',
                    }}
                  >
                    <img src={surface.assetUrl} alt={surface.name} className="max-h-full object-contain" />
                  </div>
                  <h3 className="font-display font-bold text-xs truncate">{surface.name}</h3>
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--club-muted)' }}>
                    {owned ? 'Dimiliki' : surface.isMilestoneReward ? 'Hadiah Milestone' : `${surface.priceCoins} Permen`}
                  </p>
                </div>

                {owned ? (
                  <KineticButton
                    variant={isEquipped ? 'success' : 'primary'}
                    size="sm"
                    fullWidth
                    onClick={() => {
                      equipCosmetic(slot, surface.id);
                      notify(`"${surface.name}" dipasang!`);
                    }}
                  >
                    {isEquipped ? 'Dipakai' : 'Pasang'}
                  </KineticButton>
                ) : (
                  <KineticButton variant="secondary" size="sm" fullWidth onClick={() => navigate('shop')}>
                    Buka di Toko
                  </KineticButton>
                )}
              </KineticCard>
            );
          })}
        </div>
      )}

      {/* Effects Tab */}
      {tab === 'effects' && (
        <div className="grid grid-cols-2 gap-2.5">
          {EFFECT_CATALOG.map((eff) => {
            const owned = eff.isStarterFree || ownedCosmetics.includes(eff.id);
            const isEquipped = activeEffect.id === eff.id;

            return (
              <KineticCard key={eff.id} className="flex flex-col justify-between gap-2.5 !p-3">
                <div>
                  <div
                    className="w-full h-18 rounded-xl border-2 flex items-center justify-center p-2 mb-2"
                    style={{ backgroundColor: 'var(--club-paper-2)', borderColor: eff.accentHex }}
                  >
                    <img src={eff.particleUrl} alt={eff.name} className="w-12 h-12 object-contain" />
                  </div>
                  <h3 className="font-display font-bold text-xs truncate">{eff.name}</h3>
                  <p className="text-[10px] font-semibold capitalize" style={{ color: 'var(--club-muted)' }}>
                    Gaya: {eff.animationStyle}
                  </p>
                </div>

                {owned ? (
                  <KineticButton
                    variant={isEquipped ? 'success' : 'primary'}
                    size="sm"
                    fullWidth
                    onClick={() => {
                      equipCosmetic('effect', eff.id);
                      notify(`Efek "${eff.name}" dipasang!`);
                    }}
                  >
                    {isEquipped ? 'Dipakai' : 'Pasang'}
                  </KineticButton>
                ) : (
                  <KineticButton variant="secondary" size="sm" fullWidth onClick={() => navigate('shop')}>
                    {eff.priceCoins} Permen
                  </KineticButton>
                )}
              </KineticCard>
            );
          })}
        </div>
      )}

      {/* Frames Tab */}
      {tab === 'frames' && (
        <div className="grid grid-cols-2 gap-2.5">
          {FRAME_CATALOG.map((frame) => {
            const owned = ownedCosmetics.includes(frame.id);
            const isEquipped = activeFrame?.id === frame.id;

            return (
              <KineticCard key={frame.id} className="flex flex-col justify-between gap-2.5 !p-3">
                <div>
                  <div
                    className="w-full h-18 rounded-xl border-2 flex items-center justify-center p-2 mb-2"
                    style={{ backgroundColor: 'var(--club-paper-2)', borderColor: 'var(--club-border-ink)' }}
                  >
                    <img src={frame.assetUrl} alt={frame.name} className="w-14 h-14 object-contain" />
                  </div>
                  <h3 className="font-display font-bold text-xs truncate">{frame.name}</h3>
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--club-muted)' }}>
                    {owned ? 'Dimiliki' : `${frame.priceCoins} Permen`}
                  </p>
                </div>

                {owned ? (
                  <KineticButton
                    variant={isEquipped ? 'success' : 'primary'}
                    size="sm"
                    fullWidth
                    onClick={() => {
                      equipCosmetic('frame', isEquipped ? null : frame.id);
                      notify(isEquipped ? 'Bingkai dilepas.' : `Bingkai "${frame.name}" dipasang!`);
                    }}
                  >
                    {isEquipped ? 'Lepas' : 'Pasang'}
                  </KineticButton>
                ) : (
                  <KineticButton variant="secondary" size="sm" fullWidth onClick={() => navigate('shop')}>
                    {frame.priceCoins} Permen
                  </KineticButton>
                )}
              </KineticCard>
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * QuickThemeModal — Lightweight in-level/level-select theme switcher
 */
export const QuickThemeModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { themes, unlockedThemes, equipTheme, getThemeForGame } = useTheme();
  const { selectedGame } = useNavigation();
  const { playSfx } = useAudio();

  const currentTheme = getThemeForGame(selectedGame);
  const ownedList = themes.filter(
    (t) => t.unlock.type === 'free' || unlockedThemes.includes(t.id),
  );

  return (
    <KineticModal
      open={open}
      onClose={onClose}
      title="Ganti Tema Cepat"
      subtitle={`Aktif untuk ${selectedGame === 'onet' ? 'Onet Connect' : 'Match 3'}`}
      testId="quick-theme-modal"
    >
      <div className="grid grid-cols-2 gap-2.5">
        {ownedList.map((theme) => {
          const isCurrent = currentTheme.id === theme.id;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => {
                equipTheme(theme.id, selectedGame);
                playSfx('match');
                onClose();
              }}
              className="touch-target rounded-2xl border-2 p-3 flex flex-col gap-2 text-left cursor-pointer"
              style={{
                backgroundColor: isCurrent ? 'var(--g-soft)' : 'var(--club-paper)',
                borderColor: isCurrent ? 'var(--g-accent)' : 'var(--club-border-ink)',
                boxShadow: isCurrent ? '0 3px 0 var(--club-border-ink)' : 'none',
              }}
            >
              <div className="flex items-center gap-1">
                {theme.preview.preview4Indices.slice(0, 3).map((idx, i) => (
                  <img
                    key={i}
                    src={theme.tileUrls[idx] ?? theme.tileUrls[0]}
                    alt=""
                    className="w-7 h-7 rounded-lg bg-white border border-black/15 object-contain p-0.5"
                  />
                ))}
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="font-display font-bold text-xs truncate">{theme.name}</span>
                {isCurrent && <Check size={14} style={{ color: 'var(--g-accent)' }} />}
              </div>
            </button>
          );
        })}
      </div>
    </KineticModal>
  );
};
