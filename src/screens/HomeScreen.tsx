/**
 * HomeScreen — Play Club Lobby, Continue CTA, Onet & Match 3 Cards, Daily Hub
 * Owned by @ui-eng
 */

import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Flame,
  Gift,
  Palette,
  Play,
  Settings,
  Star,
} from 'lucide-react';
import type { GameId, GameMode } from '@/types/game.types';
import { APP_CONFIG, GAME_METADATA } from '@/config/app.config';
import { AVATAR_CATALOG, FRAME_CATALOG, UI_ASSETS } from '@/config/themes.config';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { useTheme } from '@/services/theme/ThemeContext';
import { useAudio } from '@/services/audio/AudioContext';
import { getAccountProgress } from '@/services/progression/ProgressionEngine';
import { getLoginStreakState } from '@/services/progression/LoginStreakEngine';
import { getReadyMissionCount } from '@/services/progression/MissionEngine';
import { RewardEngine } from '@/services/progression/RewardEngine';
import { useNavigation } from '@/app/NavigationContext';
import { CurrencyPill, DynamicIcon, KineticButton, KineticCard } from '@/components/common';
import { getTodayKey, msUntilWibMidnight } from '@/utils/time';

function formatCountdownMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  return `${String(hrs).padStart(2, '0')}j ${String(mins).padStart(2, '0')}m`;
}

export const HomeScreen: React.FC = () => {
  const { saveData, engine, getActiveSession } = usePersistence();
  const { activeGlobalTheme } = useTheme();
  const { playMenuBgm, playSfx, triggerHaptic } = useAudio();
  const { navigate, openLevelSelect, startGame, openModal, selectedGame } = useNavigation();

  const [loginToast, setLoginToast] = useState<string | null>(null);
  const [countdownText, setCountdownText] = useState<string>(() =>
    formatCountdownMs(msUntilWibMidnight()),
  );

  useEffect(() => {
    playMenuBgm();
  }, [playMenuBgm]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdownText(formatCountdownMs(msUntilWibMidnight()));
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const account = getAccountProgress(saveData.profile.xp);
  const loginStatus = getLoginStreakState(saveData);
  const readyMissionCount = getReadyMissionCount(saveData);
  const todayKey = getTodayKey();

  const onetSession = getActiveSession('onet');
  const match3Session = getActiveSession('match3');

  // Choose Continue Playing target cleanly
  const continueTarget: {
    game: GameId;
    level: number;
    mode: GameMode;
    dailyDateKey?: string;
    hasSuspended: boolean;
    subtitle: string;
  } = (() => {
    if (onetSession && (!match3Session || onetSession.savedAt >= match3Session.savedAt)) {
      const mode: GameMode = onetSession.isDailyChallenge ? 'daily' : 'normal';
      return {
        game: 'onet',
        level: onetSession.level,
        mode,
        dailyDateKey: onetSession.dailyChallengeDateKey ?? undefined,
        hasSuspended: true,
        subtitle: `Lanjutkan ${mode === 'daily' ? 'Sprint Harian' : 'sesi aktif'} · Skor ${onetSession.score.toLocaleString('id-ID')}`,
      };
    }
    if (match3Session) {
      const mode: GameMode = match3Session.isDailyChallenge ? 'daily' : 'normal';
      return {
        game: 'match3',
        level: match3Session.level,
        mode,
        dailyDateKey: match3Session.dailyChallengeDateKey ?? undefined,
        hasSuspended: true,
        subtitle: `Lanjutkan ${mode === 'daily' ? 'Match 3 Harian' : 'sesi aktif'} · Skor ${match3Session.score.toLocaleString('id-ID')}`,
      };
    }
    const lastPlayedGame: GameId =
      saveData.activeSession.lastPlayedGame === 'match3' ? 'match3' : selectedGame;
    const nextLvl = saveData.progression[lastPlayedGame].highestUnlockedLevel;
    return {
      game: lastPlayedGame,
      level: nextLvl,
      mode: 'normal',
      hasSuspended: false,
      subtitle: `${GAME_METADATA[lastPlayedGame].tagline}`,
    };
  })();

  const activeAvatar =
    AVATAR_CATALOG.find((a) => a.id === saveData.profile.avatarId) ?? AVATAR_CATALOG[0];
  const activeFrame = saveData.inventory.equippedCosmetics.frame
    ? FRAME_CATALOG.find((f) => f.id === saveData.inventory.equippedCosmetics.frame) ?? null
    : null;

  const isDailyCurrent = saveData.dailyChallenges.dailyPuzzle.dateKey === todayKey;
  const onetDailyDone = isDailyCurrent && saveData.dailyChallenges.dailyPuzzle.onetCompleted;
  const match3DailyDone = isDailyCurrent && saveData.dailyChallenges.dailyPuzzle.match3Completed;

  const handleClaimLoginReward = () => {
    const res = RewardEngine.commitLoginRewardClaim(engine);
    if (res.success && !res.idempotent) {
      playSfx('coin');
      triggerHaptic('levelVictory');
      setLoginToast(`+${res.coinsEarned} Permen & +${res.xpEarned} XP diklaim!`);
      window.setTimeout(() => setLoginToast(null), 3200);
    }
  };

  return (
    <div data-testid="main-lobby" className="app-screen-scroll flex flex-col gap-3.5 club-enter">
      {/* Top Club Header Bar */}
      <header className="flex items-center justify-between gap-2">
        <button
          type="button"
          data-testid="home-profile-btn"
          onClick={() => navigate('profile')}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left touch-target cursor-pointer"
        >
          <div
            className="relative w-12 h-12 rounded-2xl border-2 shrink-0 flex items-center justify-center overflow-hidden"
            style={{
              backgroundColor: activeAvatar.defaultBgColor,
              borderColor: 'var(--club-border-ink)',
              boxShadow: '0 2px 0 var(--club-border-ink)',
            }}
          >
            <img
              src={activeAvatar.assetUrl}
              alt={saveData.profile.playerName}
              className="w-10 h-10 object-contain"
            />
            {activeFrame && (
              <img
                src={activeFrame.assetUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-sm truncate">
                {saveData.profile.playerName}
              </span>
              <span
                className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full border shrink-0"
                style={{
                  backgroundColor: 'var(--club-gold)',
                  color: '#172337',
                  borderColor: 'var(--club-border-ink)',
                }}
              >
                Lv.{account.level}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <div className="club-progress-track !h-2 flex-1 max-w-[110px]">
                <div className="club-progress-fill" style={{ width: `${account.percent}%` }} />
              </div>
              <span
                className="text-[10px] font-bold truncate"
                style={{ color: 'var(--club-muted)' }}
              >
                {account.title}
              </span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <CurrencyPill
            coins={saveData.profile.coins}
            showAddHint
            onClick={() => navigate('shop')}
          />

          <button
            type="button"
            data-testid="home-settings-btn"
            aria-label="Pengaturan"
            onClick={() => openModal('settings')}
            className="touch-target w-12 h-12 rounded-2xl border-2 flex items-center justify-center cursor-pointer transition-transform active:translate-y-[2px]"
            style={{
              backgroundColor: 'var(--club-card)',
              borderColor: 'var(--club-border-ink)',
              boxShadow: '0 2px 0 var(--club-border-ink)',
            }}
          >
            <Settings size={20} strokeWidth={2.4} />
          </button>
        </div>
      </header>

      {/* Club Brand Strip + Equipped Theme Pill */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={UI_ASSETS.brandMark}
            alt={APP_CONFIG.appName}
            className="w-7 h-7 object-contain shrink-0"
          />
          <span className="font-display font-extrabold text-base tracking-tight truncate">
            {APP_CONFIG.appName}
          </span>
        </div>

        <button
          type="button"
          data-testid="home-theme-pill"
          onClick={() => navigate('collection')}
          className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1 rounded-full border-2 text-xs font-bold cursor-pointer"
          style={{
            backgroundColor: 'var(--club-card)',
            borderColor: 'var(--club-border-ink)',
          }}
        >
          <Palette size={14} style={{ color: 'var(--g-accent)' }} />
          <span className="truncate max-w-[130px]">{activeGlobalTheme.name}</span>
        </button>
      </div>

      {/* Daily Login Streak Banner (when claimable) */}
      {!loginStatus.claimedToday && (
        <KineticCard
          data-testid="home-login-streak-card"
          className="flex items-center justify-between gap-3 !p-3.5"
          style={{
            background: 'linear-gradient(135deg, var(--club-paper-2), var(--g-soft))',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-11 h-11 rounded-2xl border-2 flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--club-gold)',
                borderColor: 'var(--club-border-ink)',
              }}
            >
              <Gift size={22} color="#172337" strokeWidth={2.4} />
            </div>
            <div className="min-w-0">
              <div className="font-display font-bold text-sm leading-tight">
                Bonus Check-In Hari ke-{loginStatus.currentStreak}
              </div>
              <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--club-muted)' }}>
                +{loginStatus.rewardCoins} Permen · +{loginStatus.rewardXp} XP
              </div>
            </div>
          </div>

          <KineticButton
            variant="gold"
            size="sm"
            data-testid="home-claim-login-btn"
            onClick={handleClaimLoginReward}
          >
            Klaim
          </KineticButton>
        </KineticCard>
      )}

      {loginToast && (
        <div
          className="rounded-2xl border-2 px-3.5 py-2.5 flex items-center gap-2 text-xs font-bold"
          style={{
            backgroundColor: '#dcfce7',
            borderColor: '#16a34a',
            color: '#14532d',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{loginToast}</span>
        </div>
      )}

      {/* Continue Playing Primary CTA Card */}
      <KineticCard
        interactive
        data-testid="home-continue-cta"
        onClick={() =>
          startGame({
            game: continueTarget.game,
            level: continueTarget.level,
            mode: continueTarget.mode,
            dailyDateKey: continueTarget.dailyDateKey,
          })
        }
        className="flex items-center justify-between gap-3 !p-4"
        style={{
          background:
            continueTarget.game === 'onet'
              ? 'linear-gradient(135deg, #fff0f3 0%, #ffe0e8 100%)'
              : 'linear-gradient(135deg, #eefaf2 0%, #d3f4e1 100%)',
          color: '#172337',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-13 h-13 rounded-2xl border-2 flex items-center justify-center shrink-0 bg-white"
            style={{ borderColor: '#172337', boxShadow: '0 2px 0 #172337' }}
          >
            <DynamicIcon
              src={GAME_METADATA[continueTarget.game].iconAsset}
              kind={continueTarget.game}
              size={34}
            />
          </div>
          <div className="min-w-0">
            <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/80 border border-[#172337]">
              {continueTarget.hasSuspended ? 'Sesi Tersimpan' : 'Lanjut Main'}
            </span>
            <h2 className="font-display text-lg font-extrabold leading-tight mt-1 truncate">
              {GAME_METADATA[continueTarget.game].name} · Lv. {continueTarget.level}
            </h2>
            <p className="text-xs font-semibold opacity-80 truncate">{continueTarget.subtitle}</p>
          </div>
        </div>

        <span
          className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center shrink-0 text-white"
          style={{
            backgroundColor: GAME_METADATA[continueTarget.game].accentColor,
            borderColor: '#172337',
            boxShadow: '0 2px 0 #172337',
          }}
        >
          <Play size={20} fill="currentColor" />
        </span>
      </KineticCard>

      {/* Two Core Game Mode Cards: Onet Connect & Match 3 */}
      <section aria-label="Pilih mode permainan" className="grid grid-cols-2 gap-3">
        {(['onet', 'match3'] as const).map((gameId) => {
          const meta = GAME_METADATA[gameId];
          const modeProg = saveData.progression[gameId];

          return (
            <KineticCard
              key={gameId}
              interactive
              data-testid={`hub-game-${gameId}`}
              onClick={() => openLevelSelect(gameId)}
              className="flex flex-col justify-between gap-3 !p-3.5"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div
                    className="w-12 h-12 rounded-2xl border-2 flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: meta.softColor,
                      borderColor: 'var(--club-border-ink)',
                    }}
                  >
                    <DynamicIcon src={meta.iconAsset} kind={gameId} size={32} />
                  </div>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-tabular font-extrabold"
                    style={{
                      backgroundColor: 'var(--club-paper-2)',
                      borderColor: 'var(--club-border-ink)',
                    }}
                  >
                    <Star size={11} fill="#FFB020" color="#172337" />
                    {modeProg.totalStars}
                  </span>
                </div>

                <h3 className="font-display font-extrabold text-base mt-2.5 leading-tight">
                  {meta.name}
                </h3>
                <p
                  className="text-[11px] font-medium mt-1 line-clamp-2"
                  style={{ color: 'var(--club-muted)' }}
                >
                  {meta.tagline}
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--club-line)' }}>
                <span className="font-tabular text-xs font-extrabold">
                  Lv. {modeProg.highestUnlockedLevel}
                </span>
                <span
                  className="text-xs font-display font-bold px-2.5 py-1 rounded-xl border text-white"
                  style={{
                    backgroundColor: meta.accentColor,
                    borderColor: '#172337',
                  }}
                >
                  Peta
                </span>
              </div>
            </KineticCard>
          );
        })}
      </section>

      {/* Daily Challenges & Missions Hub Card */}
      <KineticCard
        interactive
        data-testid="home-daily-card"
        onClick={() => openModal('daily-challenges')}
        className="flex flex-col gap-3 !p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-10 h-10 rounded-2xl border-2 flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--club-paper-2)',
                borderColor: 'var(--club-border-ink)',
              }}
            >
              <DynamicIcon src={UI_ASSETS.missions} kind="missions" size={24} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-sm leading-tight">
                Tantangan & Misi Harian
              </h3>
              <p className="text-[11px] font-semibold flex items-center gap-1 mt-0.5" style={{ color: 'var(--club-muted)' }}>
                <Calendar size={11} />
                Reset WIB dalam {countdownText}
              </p>
            </div>
          </div>

          {readyMissionCount > 0 ? (
            <span
              className="px-2.5 py-1 rounded-full text-xs font-extrabold text-white border shrink-0"
              style={{
                backgroundColor: 'var(--club-success)',
                borderColor: 'var(--club-border-ink)',
              }}
            >
              {readyMissionCount} Klaim!
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border shrink-0"
              style={{
                backgroundColor: 'var(--club-paper-2)',
                borderColor: 'var(--club-border-ink)',
              }}
            >
              <Flame size={13} style={{ color: '#f97316' }} />
              {loginStatus.currentStreak}h
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-xl border px-3 py-2 flex items-center justify-between text-xs font-bold"
            style={{
              backgroundColor: 'var(--club-paper)',
              borderColor: 'var(--club-line)',
            }}
          >
            <span>Onet Sprint</span>
            <span style={{ color: onetDailyDone ? 'var(--club-success)' : 'var(--g-accent)' }}>
              {onetDailyDone ? 'Selesai' : '+8 Permen'}
            </span>
          </div>
          <div
            className="rounded-xl border px-3 py-2 flex items-center justify-between text-xs font-bold"
            style={{
              backgroundColor: 'var(--club-paper)',
              borderColor: 'var(--club-line)',
            }}
          >
            <span>Match 3 Harian</span>
            <span style={{ color: match3DailyDone ? 'var(--club-success)' : 'var(--g-accent)' }}>
              {match3DailyDone ? 'Selesai' : '+8 Permen'}
            </span>
          </div>
        </div>
      </KineticCard>
    </div>
  );
};
