/**
 * MobileNav — 4-Tab Thumb-Zone Bottom Navigation Bar
 * Owned by @ui-eng
 */

import React from 'react';
import { Home, Palette, ShoppingBag, User, type LucideIcon } from 'lucide-react';
import type { ScreenId } from '@/types/game.types';
import { useAudio } from '@/services/audio/AudioContext';

export interface MobileNavProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  unseenThemesCount?: number;
  claimableBadgeCount?: number;
}

interface NavTabDef {
  screen: ScreenId;
  label: string;
  testId: string;
  icon: LucideIcon;
  badgeCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentScreen,
  onNavigate,
  unseenThemesCount = 0,
  claimableBadgeCount = 0,
}) => {
  const { playUiClick, triggerHaptic } = useAudio();

  const tabs: NavTabDef[] = [
    {
      screen: 'home',
      label: 'Beranda',
      testId: 'nav-home',
      icon: Home,
    },
    {
      screen: 'shop',
      label: 'Toko',
      testId: 'nav-shop',
      icon: ShoppingBag,
    },
    {
      screen: 'collection',
      label: 'Koleksi',
      testId: 'nav-collection',
      icon: Palette,
      badgeCount: unseenThemesCount,
    },
    {
      screen: 'profile',
      label: 'Profil',
      testId: 'nav-profile',
      icon: User,
      badgeCount: claimableBadgeCount,
    },
  ];

  return (
    <nav
      aria-label="Navigasi utama"
      data-testid="mobile-bottom-nav"
      className="app-bottom-nav"
    >
      <div className="grid grid-cols-4 gap-1.5">
        {tabs.map((tab) => {
          const isActive =
            currentScreen === tab.screen ||
            (tab.screen === 'home' && currentScreen === 'level-select') ||
            (tab.screen === 'profile' && currentScreen === 'ledger');
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.screen}
              type="button"
              data-testid={tab.testId}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => {
                playUiClick();
                triggerHaptic('uiTap');
                onNavigate(tab.screen);
              }}
              className="relative touch-target min-h-[52px] rounded-2xl flex flex-col items-center justify-center gap-0.5 px-2 transition-all cursor-pointer border-2"
              style={{
                backgroundColor: isActive ? 'var(--g-soft)' : 'transparent',
                borderColor: isActive ? 'var(--club-border-ink)' : 'transparent',
                boxShadow: isActive ? '0 2px 0 var(--club-border-ink)' : 'none',
                color: isActive ? 'var(--g-accent)' : 'var(--club-muted)',
              }}
            >
              <div className="relative">
                <IconComponent size={20} strokeWidth={isActive ? 2.6 : 2.1} />
                {tab.badgeCount !== undefined && tab.badgeCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center border border-[#172337]"
                    style={{ backgroundColor: '#ef4444' }}
                  >
                    {tab.badgeCount > 9 ? '9+' : tab.badgeCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[11px] leading-tight ${
                  isActive ? 'font-display font-bold' : 'font-semibold'
                }`}
                style={{ color: isActive ? 'var(--club-ink)' : 'var(--club-muted)' }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
