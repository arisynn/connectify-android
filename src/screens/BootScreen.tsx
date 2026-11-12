/**
 * BootScreen — Local Save Initialization & Native Splash Handoff
 * Owned by @ui-eng
 */

import React, { useEffect, useRef } from 'react';
import { UI_ASSETS } from '@/config/themes.config';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { useAudio } from '@/services/audio/AudioContext';
import { CapacitorBridge } from '@/services/native/CapacitorBridge';
import { RewardEngine } from '@/services/progression/RewardEngine';
import { recordDailyCheckIn } from '@/services/progression/LoginStreakEngine';
import { useNavigation } from '@/app/NavigationContext';
import { getTodayKey } from '@/utils/time';

function dismissStaticLoader(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  (window as { _loaderReady?: boolean })._loaderReady = true;
  const loader = document.getElementById('static-loader');
  if (loader) {
    loader.style.opacity = '0';
    loader.style.pointerEvents = 'none';
    window.setTimeout(() => {
      loader.remove();
    }, 240);
  }
}

export const BootScreen: React.FC = () => {
  const { initialized, saveData, engine, executeTransaction } = usePersistence();
  const { updateSettings: updateAudioSettings } = useAudio();
  const { navigate } = useNavigation();
  const bootedRef = useRef(false);

  useEffect(() => {
    if (!initialized || bootedRef.current) return;
    bootedRef.current = true;

    // 1. Sync audio & haptics settings from durable save state
    updateAudioSettings({
      musicVol: saveData.settings.audio.musicVolume,
      sfxVol: saveData.settings.audio.sfxVolume,
      muteMusic: saveData.settings.audio.muteMusic,
      muteSfx: saveData.settings.audio.muteSfx,
      hapticsEnabled: saveData.settings.haptics.enabled,
      hapticsIntensity: saveData.settings.haptics.intensity,
    });

    // 2. Sync native Android status bar contrast
    void CapacitorBridge.syncStatusBar(saveData.settings.display.darkMode);

    // 3. Ensure WIB daily/weekly missions & daily check-in are current
    const todayKey = getTodayKey();
    RewardEngine.syncMissionsPeriod(engine);
    if (saveData.profile.loginStreak.lastCheckInDate !== todayKey) {
      executeTransaction({
        idempotencyKey: `boot_checkin:${todayKey}`,
        type: 'STATE_UPDATE',
        mutate: (draft) => {
          recordDailyCheckIn(draft);
        },
      });
    }

    // 4. Dismiss static HTML preloader and Capacitor native splash screen
    dismissStaticLoader();
    void CapacitorBridge.hideSplashScreen(180);

    // 5. Route to onboarding if brand new user, otherwise home lobby
    const onboardingDone =
      (typeof localStorage !== 'undefined' &&
        localStorage.getItem('connectify_onboarding_done') === '1') ||
      saveData.statistics.totalGamesPlayed > 0 ||
      saveData.profile.lifetimeCoinsEarned > 0;

    if (!onboardingDone) {
      navigate('startup', { replace: true });
    } else {
      navigate('home', { replace: true });
    }
  }, [
    initialized,
    saveData.settings.audio,
    saveData.settings.haptics,
    saveData.settings.display.darkMode,
    saveData.profile.loginStreak.lastCheckInDate,
    saveData.profile.lifetimeCoinsEarned,
    saveData.statistics.totalGamesPlayed,
    engine,
    executeTransaction,
    updateAudioSettings,
    navigate,
  ]);

  return (
    <div
      data-testid="boot-screen"
      className="app-screen-locked items-center justify-center text-center gap-4"
    >
      <img
        src={UI_ASSETS.brandMark}
        onError={(e) => {
          const img = e.currentTarget;
          if (!img.dataset.fb) {
            img.dataset.fb = '1';
            img.src = UI_ASSETS.brandMarkFallback;
          }
        }}
        alt="Connectify"
        className="w-24 h-24 object-contain"
      />
      <div className="club-surface px-5 py-3">
        <p className="font-display font-bold text-base">Menyiapkan Klub Puzzle...</p>
      </div>
    </div>
  );
};
