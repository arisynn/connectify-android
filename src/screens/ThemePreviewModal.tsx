/**
 * ThemePreviewModal — Live Theme Tile, Palette, Audio & Equip/Buy Preview
 * Owned by @ui-eng
 */

import React, { useMemo, useState } from 'react';
import { Check, Lock, Music2, Sparkles } from 'lucide-react';
import type { ThemeEquipScope } from '@/types/theme.types';
import { PERMANENT_CATALOG } from '@/config/economy.config';
import { AVATAR_CATALOG, UI_ASSETS, resolveThemeDefinition } from '@/config/themes.config';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { useTheme } from '@/services/theme/ThemeContext';
import { useAudio } from '@/services/audio/AudioContext';
import { EconomyEngine } from '@/services/economy/EconomyEngine';
import { DynamicIcon, KineticButton, KineticModal } from '@/components/common';

export interface ThemePreviewModalProps {
  open: boolean;
  themeId: string | null;
  onClose: () => void;
  onFeedback?: (message: string) => void;
}

export const ThemePreviewModal: React.FC<ThemePreviewModalProps> = ({
  open,
  themeId,
  onClose,
  onFeedback,
}) => {
  const { saveData, engine } = usePersistence();
  const {
    unlockedThemes,
    equipTheme,
    isDarkMode,
    preloadThemeTiles,
  } = useTheme();
  const { playSfx, triggerHaptic } = useAudio();

  const [equipScope, setEquipScope] = useState<ThemeEquipScope>('both');
  const [previewDark, setPreviewDark] = useState<boolean>(isDarkMode);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const theme = useMemo(() => resolveThemeDefinition(themeId), [themeId]);
  const isUnlocked =
    theme.unlock.type === 'free' || unlockedThemes.includes(theme.id);

  const catalogItem = useMemo(
    () => PERMANENT_CATALOG.find((i) => i.category === 'theme' && i.themeId === theme.id) ?? null,
    [theme.id],
  );

  const recommendedAvatar = useMemo(
    () => AVATAR_CATALOG.find((a) => a.id === theme.preview.recommendedAvatarId) ?? null,
    [theme.preview.recommendedAvatarId],
  );

  if (!themeId) {
    return null;
  }

  const previewTiles = theme.preview.preview4Indices.map(
    (idx) => theme.tileUrls[idx] ?? theme.tileUrls[0],
  );
  const match3Tiles = theme.match3TileIndices.map(
    (idx) => theme.tileUrls[idx] ?? theme.tileUrls[0],
  );

  const boardBg = previewDark ? theme.palette.darkBackgroundBoard : theme.palette.backgroundBoard;
  const tileBg = previewDark ? theme.palette.darkBackgroundTile : theme.palette.backgroundTile;
  const tileBorder = previewDark ? theme.palette.darkTileBorder : theme.palette.tileBorder;
  const textPrimary = previewDark ? '#F8FAFC' : theme.palette.textPrimary;

  const eq = saveData.inventory.equippedThemes;
  const isCurrentlyEquippedForScope =
    equipScope === 'both'
      ? eq.globalThemeId === theme.id
      : equipScope === 'onet'
        ? (eq.onetThemeOverride ?? eq.globalThemeId) === theme.id
        : (eq.match3ThemeOverride ?? eq.globalThemeId) === theme.id;

  const handleEquip = () => {
    preloadThemeTiles(theme.id);
    const ok = equipTheme(theme.id, equipScope);
    if (ok) {
      playSfx('match');
      triggerHaptic('matchClear');
      onFeedback?.(
        `Tema "${theme.name}" dipasang untuk ${
          equipScope === 'both' ? 'Semua Mode' : equipScope === 'onet' ? 'Onet' : 'Match 3'
        }.`,
      );
      onClose();
    }
  };

  const handlePurchase = () => {
    setErrorMsg(null);
    if (!catalogItem) return;
    const opId = `theme_buy:${catalogItem.id}:${Date.now()}`;
    const outcome = EconomyEngine.purchaseCatalogItem(engine, opId, catalogItem.id, 1);
    if (!outcome.success) {
      playSfx('wrong');
      triggerHaptic('invalidMove');
      setErrorMsg(
        outcome.error === 'INSUFFICIENT_FUNDS'
          ? 'Permen belum cukup untuk membeli tema ini.'
          : outcome.error ?? 'Gagal membeli tema.',
      );
      return;
    }
    preloadThemeTiles(theme.id);
    equipTheme(theme.id, equipScope);
    playSfx('win');
    triggerHaptic('levelVictory');
    onFeedback?.(`Berhasil membuka & memasang "${theme.name}"!`);
    onClose();
  };

  return (
    <KineticModal
      open={open}
      onClose={onClose}
      title={theme.name}
      subtitle={theme.preview.tagline}
      testId="theme-preview-modal"
    >
      <div className="flex flex-col gap-4">
        {/* Live Miniature Board Preview */}
        <div
          className="rounded-2xl border-2 p-3.5 transition-colors"
          style={{
            backgroundColor: boardBg,
            borderColor: 'var(--club-border-ink)',
            color: textPrimary,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border rarity-${theme.rarity}`}
            >
              {theme.rarity}
            </span>
            <button
              type="button"
              onClick={() => setPreviewDark((v) => !v)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full border cursor-pointer"
              style={{
                backgroundColor: tileBg,
                borderColor: tileBorder,
                color: textPrimary,
              }}
            >
              Mode {previewDark ? 'Gelap' : 'Terang'}
            </button>
          </div>

          {/* Onet Featured 4 Tiles */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {previewTiles.map((src, i) => (
              <div
                key={i}
                className="aspect-square rounded-xl border-2 p-1.5 flex items-center justify-center"
                style={{
                  backgroundColor: tileBg,
                  borderColor: tileBorder,
                  boxShadow: `0 3px 0 ${tileBorder}`,
                }}
              >
                <img src={src} alt="" className="w-full h-full object-contain" />
              </div>
            ))}
          </div>

          {/* Match 3 6-Color Palette Strip */}
          <div className="flex items-center justify-between gap-1.5 pt-2 border-t" style={{ borderColor: `${tileBorder}33` }}>
            <span className="text-[10px] font-extrabold uppercase opacity-80">Set Match 3</span>
            <div className="flex items-center gap-1">
              {match3Tiles.map((src, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-lg border p-0.5 flex items-center justify-center"
                  style={{ backgroundColor: tileBg, borderColor: tileBorder }}
                >
                  <img src={src} alt="" className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sound & Avatar Pairing Badges */}
        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-xl border p-2.5 flex items-center gap-2"
            style={{ backgroundColor: 'var(--club-paper-2)', borderColor: 'var(--club-line)' }}
          >
            <Music2 size={16} style={{ color: theme.palette.accentPrimary }} />
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--club-muted)' }}>
                Nada Tema
              </div>
              <div className="text-xs font-bold truncate">{theme.soundPairing.presetName}</div>
            </div>
          </div>

          {recommendedAvatar && (
            <div
              className="rounded-xl border p-2.5 flex items-center gap-2"
              style={{ backgroundColor: 'var(--club-paper-2)', borderColor: 'var(--club-line)' }}
            >
              <img
                src={recommendedAvatar.assetUrl}
                alt={recommendedAvatar.name}
                className="w-6 h-6 rounded-md object-contain"
              />
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase" style={{ color: 'var(--club-muted)' }}>
                  Rekomendasi
                </div>
                <div className="text-xs font-bold truncate">{recommendedAvatar.name}</div>
              </div>
            </div>
          )}
        </div>

        {/* Scope Selector when unlocked or buying */}
        {(isUnlocked || theme.unlock.type === 'coins') && (
          <div>
            <span
              className="block text-[11px] font-extrabold uppercase mb-1.5"
              style={{ color: 'var(--club-muted)' }}
            >
              Terapkan ke Mode
            </span>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'both', label: 'Semua' },
                  { id: 'onet', label: 'Onet' },
                  { id: 'match3', label: 'Match 3' },
                ] as const
              ).map((s) => {
                const active = equipScope === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setEquipScope(s.id)}
                    className="min-h-[42px] rounded-xl border-2 text-xs font-display font-bold cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--g-soft)' : 'var(--club-card)',
                      borderColor: active ? 'var(--g-accent)' : 'var(--club-border-ink)',
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-red-400 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            {errorMsg}
          </div>
        )}

        {/* Action CTA */}
        {isUnlocked ? (
          <KineticButton
            variant={isCurrentlyEquippedForScope ? 'success' : 'primary'}
            size="lg"
            fullWidth
            data-testid="theme-preview-equip-btn"
            icon={<Check size={18} strokeWidth={2.6} />}
            onClick={handleEquip}
          >
            {isCurrentlyEquippedForScope ? 'Sedang Dipakai' : 'Pasang Tema Ini'}
          </KineticButton>
        ) : theme.unlock.type === 'coins' ? (
          <KineticButton
            variant="gold"
            size="lg"
            fullWidth
            data-testid="theme-preview-buy-btn"
            disabled={saveData.profile.coins < theme.unlock.price}
            icon={<DynamicIcon src={UI_ASSETS.currency} kind="coin" size={20} />}
            onClick={handlePurchase}
          >
            Buka & Pasang ({theme.unlock.price} Permen)
          </KineticButton>
        ) : theme.unlock.type === 'milestone' ? (
          <div
            className="rounded-2xl border-2 px-4 py-3 flex items-center gap-2.5 text-xs font-bold"
            style={{ backgroundColor: 'var(--club-paper-2)', borderColor: 'var(--club-border-ink)' }}
          >
            <Lock size={16} />
            <span>Hadiah Milestone: {theme.unlock.label}</span>
            <Sparkles size={15} className="ml-auto" style={{ color: 'var(--club-gold)' }} />
          </div>
        ) : null}
      </div>
    </KineticModal>
  );
};
