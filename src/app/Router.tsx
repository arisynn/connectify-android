/**
 * Router — Portrait Screen Switcher, Mobile Bottom Nav & Global Modal Host
 * Owned by @ui-eng
 */

import React, { useMemo } from 'react';
import { LogOut, X } from 'lucide-react';
import type { ScreenId } from '@/types/game.types';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { getReadyMissionCount } from '@/services/progression/MissionEngine';
import { getClaimableAchievements } from '@/services/progression/AchievementEngine';
import { getLoginStreakState } from '@/services/progression/LoginStreakEngine';
import { KineticButton, KineticModal, MobileNav } from '@/components/common';
import { OnetScreen } from '@/games/onet/components/OnetScreen';
import { Match3Screen } from '@/games/match3/components/Match3Screen';
import {
  BootScreen,
  CollectionScreen,
  DailyChallengesModal,
  HomeScreen,
  LedgerScreen,
  LevelSelectScreen,
  ProfileScreen,
  QuickThemeModal,
  SettingsModal,
  ShopScreen,
  StartupScreen,
  ThemePreviewModal,
} from '@/screens';
import { useNavigation } from './NavigationContext';

const SCREENS_WITH_BOTTOM_NAV = new Set<ScreenId>([
  'home',
  'level-select',
  'shop',
  'collection',
  'profile',
  'ledger',
]);

export const Router: React.FC = () => {
  const { saveData } = usePersistence();
  const {
    currentScreen,
    activeLevel,
    activeMode,
    activeDailyDateKey,
    activeModal,
    modalPayload,
    navigate,
    startGame,
    closeModal,
    confirmExitApp,
  } = useNavigation();

  const unseenThemesCount = saveData.inventory.unseenThemes.length;

  const claimableBadgeCount = useMemo(() => {
    const missions = getReadyMissionCount(saveData);
    const achievements = getClaimableAchievements(saveData).length;
    const loginBonus = getLoginStreakState(saveData).claimedToday ? 0 : 1;
    return missions + achievements + loginBonus;
  }, [saveData]);

  const showBottomNav = SCREENS_WITH_BOTTOM_NAV.has(currentScreen);

  const renderScreen = () => {
    switch (currentScreen) {
      case 'boot':
        return <BootScreen />;
      case 'startup':
        return <StartupScreen />;
      case 'home':
        return <HomeScreen />;
      case 'level-select':
        return <LevelSelectScreen />;
      case 'play-onet':
        return (
          <OnetScreen
            key={`onet-${activeMode}-${activeLevel}-${activeDailyDateKey}`}
            level={activeLevel}
            mode={activeMode}
            dailyDateKey={activeDailyDateKey}
            onExit={() => navigate('level-select', { game: 'onet' })}
            onPlayLevel={(nextLevel, mode) =>
              startGame({
                game: 'onet',
                level: nextLevel,
                mode: mode ?? activeMode,
                dailyDateKey: activeDailyDateKey,
              })
            }
            onNextLevel={(nextLevel) =>
              startGame({
                game: 'onet',
                level: nextLevel,
                mode: 'normal',
              })
            }
          />
        );
      case 'play-match3':
        return (
          <Match3Screen
            key={`match3-${activeMode}-${activeLevel}-${activeDailyDateKey}`}
            level={activeLevel}
            mode={activeMode}
            isDailyChallenge={activeMode === 'daily'}
            dailyDateKey={activeDailyDateKey}
            onExit={() => navigate('level-select', { game: 'match3' })}
            onPlayLevel={(nextLevel, mode) =>
              startGame({
                game: 'match3',
                level: nextLevel,
                mode: mode ?? activeMode,
                dailyDateKey: activeDailyDateKey,
              })
            }
          />
        );
      case 'shop':
        return <ShopScreen />;
      case 'collection':
        return <CollectionScreen />;
      case 'profile':
        return <ProfileScreen />;
      case 'ledger':
        return <LedgerScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <div className="app-shell">
      <div className="app-bg-pattern" aria-hidden="true" />

      {renderScreen()}

      {showBottomNav && (
        <MobileNav
          currentScreen={currentScreen}
          onNavigate={(screen) => navigate(screen)}
          unseenThemesCount={unseenThemesCount}
          claimableBadgeCount={claimableBadgeCount}
        />
      )}

      {/* Global Modals */}
      <SettingsModal
        open={activeModal === 'settings'}
        onClose={closeModal}
      />

      <ThemePreviewModal
        open={activeModal === 'theme-preview'}
        themeId={modalPayload?.themeId ?? null}
        onClose={closeModal}
      />

      <QuickThemeModal
        open={activeModal === 'quick-theme'}
        onClose={closeModal}
      />

      <DailyChallengesModal
        open={activeModal === 'daily-challenges'}
        onClose={closeModal}
      />

      {/* Android Back-Button Exit Confirmation Dialog */}
      <KineticModal
        open={activeModal === 'exit-confirm'}
        onClose={closeModal}
        title="Keluar dari Connectify?"
        subtitle="Progresmu tersimpan otomatis secara lokal."
        testId="exit-confirm-modal"
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium" style={{ color: 'var(--club-muted)' }}>
            Kamu bisa kembali bermain kapan saja tanpa koneksi internet.
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <KineticButton
              variant="secondary"
              size="md"
              data-testid="exit-cancel-btn"
              icon={<X size={16} />}
              onClick={closeModal}
            >
              Tetap di Sini
            </KineticButton>
            <KineticButton
              variant="danger"
              size="md"
              data-testid="exit-confirm-btn"
              icon={<LogOut size={16} />}
              onClick={() => void confirmExitApp()}
            >
              Keluar
            </KineticButton>
          </div>
        </div>
      </KineticModal>
    </div>
  );
};
