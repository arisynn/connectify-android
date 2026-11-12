/**
 * ShopScreen — Booster Bundles, Themes, Surfaces, Avatars & Cosmetics Store
 * Owned by @ui-eng
 */

import React, { useMemo, useState } from 'react';
import { Check, Eye, ReceiptText, ShoppingBag, Sparkles } from 'lucide-react';
import type { ShopGameScope } from '@/types/economy.types';
import { UI_ASSETS } from '@/config/themes.config';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { useAudio } from '@/services/audio/AudioContext';
import { useTheme } from '@/services/theme/ThemeContext';
import { EconomyEngine } from '@/services/economy/EconomyEngine';
import { ShopCatalogService } from '@/services/economy/ShopCatalogService';
import { useNavigation } from '@/app/NavigationContext';
import { CurrencyPill, DynamicIcon, KineticButton, KineticCard } from '@/components/common';

type ShopTab = 'booster' | 'theme' | 'surface' | 'profile' | 'effect';

export const ShopScreen: React.FC = () => {
  const { saveData, engine } = usePersistence();
  const { playSfx, triggerHaptic } = useAudio();
  const { preloadThemeTiles } = useTheme();
  const { navigate, openModal } = useNavigation();

  const [activeTab, setActiveTab] = useState<ShopTab>('theme');
  const [scopeFilter, setScopeFilter] = useState<ShopGameScope | 'all'>('all');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const catalogSummary = useMemo(
    () => ShopCatalogService.getCatalogSummary(saveData),
    [saveData],
  );

  const boosters = useMemo(() => {
    const all = ShopCatalogService.getBoosters();
    if (scopeFilter === 'all' || scopeFilter === 'profile') return all;
    return all.filter((b) => b.gameScope === 'both' || b.gameScope === scopeFilter);
  }, [scopeFilter]);

  const permanentItems = useMemo(() => {
    const all = ShopCatalogService.getAllPermanentItems(false);
    return all.filter((item) => {
      if (scopeFilter !== 'all') {
        if (scopeFilter === 'profile' && item.gameScope !== 'profile') return false;
        if (
          (scopeFilter === 'onet' || scopeFilter === 'match3') &&
          item.gameScope !== 'both' &&
          item.gameScope !== scopeFilter
        ) {
          return false;
        }
      }
      if (activeTab === 'theme') return item.category === 'theme';
      if (activeTab === 'surface') {
        return item.category === 'surface' || item.category === 'tilepack' || item.category === 'compass';
      }
      if (activeTab === 'profile') {
        return item.category === 'avatar' || item.category === 'frame';
      }
      if (activeTab === 'effect') {
        return item.category === 'effect' || item.category === 'animation';
      }
      return false;
    });
  }, [activeTab, scopeFilter]);

  const showToast = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(null), 3000);
  };

  const handleBuyItem = (itemId: string, quantity: 1 | 3 = 1) => {
    const opId = `shop:${itemId}:q${quantity}:${Date.now()}`;
    const outcome = EconomyEngine.purchaseCatalogItem(engine, opId, itemId, quantity);
    if (!outcome.success) {
      playSfx('wrong');
      triggerHaptic('invalidMove');
      showToast(
        'err',
        outcome.error === 'INSUFFICIENT_FUNDS'
          ? 'Permen kamu belum cukup.'
          : outcome.error === 'STOCK_LIMIT_REACHED'
            ? 'Stok booster sudah mencapai batas maksimum.'
            : outcome.error ?? 'Transaksi gagal.',
      );
      return;
    }

    const perm = ShopCatalogService.getPermanentItemById(itemId);
    if (perm?.themeId) {
      preloadThemeTiles(perm.themeId);
    }
    playSfx('coin');
    triggerHaptic('levelVictory');
    showToast('ok', `Berhasil membeli! Saldo tersisa ${outcome.newBalance} Permen.`);
  };

  return (
    <div data-testid="shop-panel" className="app-screen-scroll flex flex-col gap-3.5 club-enter">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-11 h-11 rounded-2xl border-2 flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--g-soft)', borderColor: 'var(--club-border-ink)' }}
          >
            <ShoppingBag size={21} style={{ color: 'var(--g-accent)' }} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display font-extrabold text-lg leading-tight">Toko Klub</h1>
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--club-muted)' }}>
              {catalogSummary.permanentsOwned}/{catalogSummary.permanentsTotal} item permanen dimiliki
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <CurrencyPill coins={saveData.profile.coins} />
          <button
            type="button"
            data-testid="shop-ledger-btn"
            aria-label="Riwayat transaksi"
            onClick={() => navigate('ledger')}
            className="touch-target w-11 h-11 rounded-2xl border-2 flex items-center justify-center cursor-pointer"
            style={{
              backgroundColor: 'var(--club-card)',
              borderColor: 'var(--club-border-ink)',
            }}
          >
            <ReceiptText size={18} />
          </button>
        </div>
      </header>

      {feedback && (
        <div
          data-testid="shop-toast"
          className="rounded-2xl border-2 px-3.5 py-2.5 text-xs font-bold flex items-center gap-2"
          style={{
            backgroundColor: feedback.type === 'ok' ? '#dcfce7' : '#fee2e2',
            borderColor: feedback.type === 'ok' ? '#16a34a' : '#ef4444',
            color: feedback.type === 'ok' ? '#14532d' : '#991b1b',
          }}
        >
          <Sparkles size={15} />
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto club-scroll-hide py-0.5">
        {(
          [
            { id: 'theme', label: 'Tema' },
            { id: 'booster', label: 'Booster' },
            { id: 'surface', label: 'Papan & Tile' },
            { id: 'profile', label: 'Avatar & Frame' },
            { id: 'effect', label: 'Efek' },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`shop-tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className="min-h-[42px] px-3.5 rounded-full border-2 text-xs font-display font-bold whitespace-nowrap cursor-pointer shrink-0"
              style={{
                backgroundColor: active ? 'var(--g-accent)' : 'var(--club-card)',
                color: active ? '#fff' : 'var(--club-ink)',
                borderColor: 'var(--club-border-ink)',
                boxShadow: active ? '0 2px 0 var(--club-border-ink)' : 'none',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Scope Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto club-scroll-hide">
        {(
          [
            { id: 'all', label: 'Semua' },
            { id: 'onet', label: 'Onet' },
            { id: 'match3', label: 'Match 3' },
            { id: 'profile', label: 'Profil' },
          ] as const
        ).map((s) => {
          const active = scopeFilter === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setScopeFilter(s.id)}
              className="min-h-[34px] px-3 rounded-xl border text-[11px] font-bold whitespace-nowrap cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--g-soft)' : 'var(--club-paper)',
                borderColor: active ? 'var(--g-accent)' : 'var(--club-line)',
                color: 'var(--club-ink)',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Boosters Grid */}
      {activeTab === 'booster' && (
        <div className="flex flex-col gap-3">
          {boosters.map((b) => {
            const stock = ShopCatalogService.getBoosterStock(saveData, b.id);
            const q1 = ShopCatalogService.quotePurchase(saveData, b.id, 1);
            const q3 = ShopCatalogService.quotePurchase(saveData, b.id, 3);

            return (
              <KineticCard key={b.id} className="flex flex-col gap-3 !p-3.5">
                <div className="flex items-start gap-3">
                  <div
                    className="w-13 h-13 rounded-2xl border-2 flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: 'var(--club-paper-2)',
                      borderColor: 'var(--club-border-ink)',
                    }}
                  >
                    <DynamicIcon src={b.assetPath} kind="star" size={34} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-bold text-sm truncate">{b.name}</h3>
                      <span
                        className="font-tabular text-xs font-extrabold px-2 py-0.5 rounded-full border shrink-0"
                        style={{
                          backgroundColor: 'var(--g-soft)',
                          borderColor: 'var(--club-border-ink)',
                        }}
                      >
                        Stok: {stock}
                      </span>
                    </div>
                    <p className="text-xs font-medium mt-1" style={{ color: 'var(--club-muted)' }}>
                      {b.description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <KineticButton
                    variant="secondary"
                    size="sm"
                    data-testid={`shop-buy-${b.id}-1`}
                    disabled={!q1.canAfford}
                    icon={<DynamicIcon src={UI_ASSETS.currency} kind="coin" size={16} />}
                    onClick={() => handleBuyItem(b.id, 1)}
                  >
                    +1 ({b.singlePrice})
                  </KineticButton>
                  <KineticButton
                    variant="gold"
                    size="sm"
                    data-testid={`shop-buy-${b.id}-3`}
                    disabled={!q3.canAfford}
                    icon={<DynamicIcon src={UI_ASSETS.currency} kind="coin" size={16} />}
                    onClick={() => handleBuyItem(b.id, 3)}
                  >
                    +3 Hemat ({b.bundle3Price})
                  </KineticButton>
                </div>
              </KineticCard>
            );
          })}
        </div>
      )}

      {/* Permanent Items Grid */}
      {activeTab !== 'booster' && (
        <div className="grid grid-cols-2 gap-2.5">
          {permanentItems.length === 0 ? (
            <div className="col-span-2 club-surface-soft p-6 text-center text-xs font-bold" style={{ color: 'var(--club-muted)' }}>
              Tidak ada item untuk filter mode ini.
            </div>
          ) : (
            permanentItems.map((item) => {
              const owned = ShopCatalogService.isItemOwned(saveData, item.id);
              const quote = ShopCatalogService.quotePurchase(saveData, item.id, 1);

              return (
                <KineticCard
                  key={item.id}
                  className="flex flex-col justify-between gap-2.5 !p-3"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border rarity-${item.rarity}`}
                      >
                        {item.rarity}
                      </span>
                      {item.themeId && (
                        <button
                          type="button"
                          aria-label={`Pratinjau ${item.name}`}
                          onClick={() => openModal('theme-preview', { themeId: item.themeId })}
                          className="w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer"
                          style={{
                            backgroundColor: 'var(--club-paper-2)',
                            borderColor: 'var(--club-border-ink)',
                          }}
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>

                    <div
                      className="w-full h-20 rounded-2xl border-2 flex items-center justify-center p-2 mb-2"
                      style={{
                        backgroundColor: 'var(--club-paper-2)',
                        borderColor: 'var(--club-line)',
                      }}
                    >
                      <img
                        src={item.assetPath}
                        alt={item.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>

                    <h3 className="font-display font-bold text-xs leading-tight line-clamp-1">
                      {item.name}
                    </h3>
                    <p
                      className="text-[11px] font-medium mt-0.5 line-clamp-2"
                      style={{ color: 'var(--club-muted)' }}
                    >
                      {item.description}
                    </p>
                  </div>

                  {owned ? (
                    <KineticButton
                      variant={item.themeId ? 'secondary' : 'success'}
                      size="sm"
                      fullWidth
                      icon={<Check size={14} />}
                      onClick={() => {
                        if (item.themeId) {
                          openModal('theme-preview', { themeId: item.themeId });
                        } else {
                          navigate('collection');
                        }
                      }}
                    >
                      {item.themeId ? 'Atur Tema' : 'Dimiliki'}
                    </KineticButton>
                  ) : (
                    <KineticButton
                      variant="gold"
                      size="sm"
                      fullWidth
                      data-testid={`shop-buy-${item.id}`}
                      disabled={!quote.canAfford}
                      icon={<DynamicIcon src={UI_ASSETS.currency} kind="coin" size={15} />}
                      onClick={() => handleBuyItem(item.id, 1)}
                    >
                      {item.price} Permen
                    </KineticButton>
                  )}
                </KineticCard>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
