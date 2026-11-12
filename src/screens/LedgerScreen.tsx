/**
 * LedgerScreen — Offline Wallet Transaction Log & Daily Economy Cap Inspector
 * Owned by @ui-eng
 */

import React from 'react';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, ReceiptText } from 'lucide-react';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { EconomyEngine } from '@/services/economy/EconomyEngine';
import { useNavigation } from '@/app/NavigationContext';
import { CurrencyPill, KineticCard } from '@/components/common';

export const LedgerScreen: React.FC = () => {
  const { saveData } = usePersistence();
  const { goBack } = useNavigation();

  const capStatus = EconomyEngine.getGameplayCapStatus(
    saveData.profile.dailyEconomy.coinsEarnedToday,
  );
  const entries = saveData.transactionLog.ledger;

  return (
    <div data-testid="ledger-screen" className="app-screen-scroll flex flex-col gap-3.5 club-enter">
      {/* Header */}
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Kembali"
            onClick={() => goBack()}
            className="touch-target w-12 h-12 rounded-2xl border-2 flex items-center justify-center cursor-pointer"
            style={{
              backgroundColor: 'var(--club-card)',
              borderColor: 'var(--club-border-ink)',
              boxShadow: '0 2px 0 var(--club-border-ink)',
            }}
          >
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="font-display font-extrabold text-lg leading-tight">Riwayat Permen</h1>
            <p className="text-xs font-semibold" style={{ color: 'var(--club-muted)' }}>
              Total didapat: {saveData.profile.lifetimeCoinsEarned.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        <CurrencyPill coins={saveData.profile.coins} />
      </header>

      {/* Daily Economy Cap Status */}
      <KineticCard className="flex flex-col gap-2 !p-3.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span>Batas Permen Ronde Hari Ini (WIB)</span>
          <span className="font-tabular">
            {capStatus.earnedToday} / {capStatus.hardCap}
          </span>
        </div>
        <div className="club-progress-track !h-2.5">
          <div
            className="club-progress-fill"
            style={{
              width: `${Math.min(100, (capStatus.earnedToday / Math.max(1, capStatus.hardCap)) * 100)}%`,
            }}
          />
        </div>
        <p className="text-[11px] font-medium" style={{ color: 'var(--club-muted)' }}>
          {capStatus.tier === 'hard_capped'
            ? 'Batas harian ronde tercapai. Hadiah misi, pencapaian, dan login streak tetap penuh!'
            : capStatus.tier === 'soft_capped'
              ? 'Masuk zona hemat (50% koin ronde). Misi & tantangan harian tetap memberi hadiah penuh.'
              : `Tarif penuh 100% aktif (sisa ${capStatus.remainingAtFullRate} koin sebelum zona hemat).`}
        </p>
      </KineticCard>

      {/* Ledger Entries */}
      {entries.length === 0 ? (
        <KineticCard className="flex flex-col items-center justify-center py-8 text-center gap-2">
          <ReceiptText size={28} style={{ color: 'var(--club-muted)' }} />
          <p className="font-display font-bold text-sm">Belum ada transaksi tercatat</p>
          <p className="text-xs" style={{ color: 'var(--club-muted)' }}>
            Mainkan level atau klaim hadiah login untuk mencatat riwayat.
          </p>
        </KineticCard>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((tx) => {
            const isCredit = tx.amount >= 0;
            const dateText = new Date(tx.timestampMs).toLocaleString('id-ID', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={tx.id}
                className="club-surface-soft px-3.5 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: isCredit ? '#dcfce7' : '#fee2e2',
                      borderColor: isCredit ? '#16a34a' : '#ef4444',
                      color: isCredit ? '#15803d' : '#b91c1c',
                    }}
                  >
                    {isCredit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                  </span>
                  <div className="min-w-0">
                    <div className="font-display font-bold text-xs truncate">{tx.label}</div>
                    <div className="text-[10px] font-medium" style={{ color: 'var(--club-muted)' }}>
                      {dateText} · Saldo {tx.balanceAfter.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                <span
                  className="font-tabular text-sm font-extrabold shrink-0"
                  style={{ color: isCredit ? 'var(--club-success)' : 'var(--club-danger)' }}
                >
                  {isCredit ? `+${tx.amount}` : tx.amount}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
