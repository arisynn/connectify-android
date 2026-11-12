/**
 * Theme & Visual Presentation Provider for Connectify Android
 * Owned by @art-director
 *
 * Manages active global/per-game themes (Onet & Match 3), Light/Dark mode CSS
 * custom properties, equipped surface/effect/frame cosmetics, tile preloading,
 * and milestone visual reward synchronization with LocalPersistenceEngine.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import type { GameId } from '@/types/game.types';
import type { EquippedCosmeticSlots } from '@/types/persistence.types';
import type {
  AvatarFrameItem,
  AvatarItem,
  EffectCosmeticItem,
  SurfaceSkinItem,
  ThemeDefinition,
  ThemeEquipScope,
} from '@/types/theme.types';
import {
  AVATAR_CATALOG,
  EFFECT_CATALOG,
  FRAME_CATALOG,
  SURFACE_CATALOG,
  THEME_CATALOG,
  getThemeTilesForGame,
  resolveThemeDefinition,
} from '@/config/themes.config';
import { usePersistence } from '@/services/persistence/PersistenceContext';
import { getNewlyEarnedRewardThemes } from './ArtRewardsService';

export interface ThemeContextValue {
  activeGlobalTheme: ThemeDefinition;
  activeOnetTheme: ThemeDefinition;
  activeMatch3Theme: ThemeDefinition;
  activeSurface: SurfaceSkinItem;
  activeEffect: EffectCosmeticItem;
  activeAvatar: AvatarItem;
  activeFrame: AvatarFrameItem | null;
  isDarkMode: boolean;
  isReducedMotion: boolean;
  unlockedThemes: string[];
  ownedCosmetics: string[];
  themes: readonly ThemeDefinition[];
  resolveTheme: (themeId?: string | null) => ThemeDefinition;
  getThemeForGame: (gameId: GameId) => ThemeDefinition;
  getTilesForGame: (gameId: GameId, themeId?: string | null) => string[];
  equipTheme: (themeId: string, scope?: ThemeEquipScope) => boolean;
  equipCosmetic: (slot: keyof EquippedCosmeticSlots, cosmeticId: string | null) => void;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
  preloadThemeTiles: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const preloadedUrls = new Set<string>();

function preloadImageUrl(url: string): void {
  if (typeof Image === 'undefined' || preloadedUrls.has(url)) return;
  preloadedUrls.add(url);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
}

function applyThemeCssVariables(theme: ThemeDefinition, darkMode: boolean, reducedMotion: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const p = theme.palette;

  root.setAttribute('data-mode', darkMode ? 'dark' : 'light');
  root.setAttribute('data-reduced-motion', reducedMotion ? 'true' : 'false');
  root.setAttribute('data-theme-id', theme.id);

  root.style.setProperty('--color-background-main', darkMode ? p.darkBackgroundMain : p.backgroundMain);
  root.style.setProperty('--color-background-board', darkMode ? p.darkBackgroundBoard : p.backgroundBoard);
  root.style.setProperty('--color-background-tile', darkMode ? p.darkBackgroundTile : p.backgroundTile);
  root.style.setProperty('--color-tile-border', darkMode ? p.darkTileBorder : p.tileBorder);
  root.style.setProperty('--color-tile-selected', p.tileSelected);
  root.style.setProperty('--color-tile-hint', p.tileHint);
  root.style.setProperty('--color-text-primary', darkMode ? '#F4F7FC' : p.textPrimary);
  root.style.setProperty('--color-text-secondary', darkMode ? '#96A5BC' : p.textSecondary);
  root.style.setProperty('--color-accent-primary', p.accentPrimary);
  root.style.setProperty('--color-accent-secondary', p.accentSecondary);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { saveData, executeTransaction, updateSettings } = usePersistence();

  const isDarkMode = saveData.settings.display.darkMode;
  const isReducedMotion = saveData.settings.display.reducedMotion;
  const { equippedThemes, equippedCosmetics, unlockedThemes, ownedCosmetics } = saveData.inventory;

  const activeGlobalTheme = useMemo(
    () => resolveThemeDefinition(equippedThemes.globalThemeId),
    [equippedThemes.globalThemeId],
  );

  const activeOnetTheme = useMemo(
    () => resolveThemeDefinition(equippedThemes.onetThemeOverride ?? equippedThemes.globalThemeId),
    [equippedThemes.onetThemeOverride, equippedThemes.globalThemeId],
  );

  const activeMatch3Theme = useMemo(
    () => resolveThemeDefinition(equippedThemes.match3ThemeOverride ?? equippedThemes.globalThemeId),
    [equippedThemes.match3ThemeOverride, equippedThemes.globalThemeId],
  );

  const activeSurface = useMemo(
    () =>
      SURFACE_CATALOG.find((s) => s.id === equippedCosmetics.block) ??
      SURFACE_CATALOG.find((s) => s.id === activeGlobalTheme.defaultSurfaceId) ??
      SURFACE_CATALOG[0],
    [equippedCosmetics.block, activeGlobalTheme.defaultSurfaceId],
  );

  const activeEffect = useMemo(
    () =>
      EFFECT_CATALOG.find((e) => e.id === equippedCosmetics.effect) ??
      EFFECT_CATALOG.find((e) => e.id === activeGlobalTheme.defaultEffectId) ??
      EFFECT_CATALOG[0],
    [equippedCosmetics.effect, activeGlobalTheme.defaultEffectId],
  );

  const activeAvatar = useMemo(
    () => AVATAR_CATALOG.find((a) => a.id === saveData.profile.avatarId) ?? AVATAR_CATALOG[0],
    [saveData.profile.avatarId],
  );

  const activeFrame = useMemo(
    () => FRAME_CATALOG.find((f) => f.id === (equippedCosmetics.frame ?? saveData.profile.frameId)) ?? null,
    [equippedCosmetics.frame, saveData.profile.frameId],
  );

  // Apply CSS custom properties whenever global theme or light/dark preferences change
  useEffect(() => {
    applyThemeCssVariables(activeGlobalTheme, isDarkMode, isReducedMotion);
  }, [activeGlobalTheme, isDarkMode, isReducedMotion]);

  // Automatically grant milestone art rewards whenever player progression qualifies
  useEffect(() => {
    const newlyEarned = getNewlyEarnedRewardThemes(saveData);
    if (newlyEarned.length === 0) return;

    executeTransaction({
      idempotencyKey: `art_rewards:${newlyEarned.map((i) => i.id).sort().join(',')}`,
      type: 'STATE_UPDATE',
      label: 'Unlock Milestone Art Rewards',
      mutate: (draft) => {
        for (const item of newlyEarned) {
          if (item.targetType === 'theme') {
            if (!draft.inventory.unlockedThemes.includes(item.id)) {
              draft.inventory.unlockedThemes.push(item.id);
              draft.inventory.unseenThemes.push(item.id);
            }
          } else if (!draft.inventory.ownedCosmetics.includes(item.id)) {
            draft.inventory.ownedCosmetics.push(item.id);
          }
        }
      },
    });
  }, [saveData, executeTransaction]);

  const preloadThemeTiles = useCallback((themeId: string) => {
    const def = resolveThemeDefinition(themeId);
    for (const url of def.tileUrls) {
      preloadImageUrl(url);
    }
  }, []);

  // Warm active game theme sprites on change
  useEffect(() => {
    preloadThemeTiles(activeOnetTheme.id);
    if (activeMatch3Theme.id !== activeOnetTheme.id) {
      preloadThemeTiles(activeMatch3Theme.id);
    }
  }, [activeOnetTheme.id, activeMatch3Theme.id, preloadThemeTiles]);

  const getThemeForGame = useCallback(
    (gameId: GameId): ThemeDefinition => (gameId === 'match3' ? activeMatch3Theme : activeOnetTheme),
    [activeMatch3Theme, activeOnetTheme],
  );

  const getTilesForGame = useCallback(
    (gameId: GameId, themeId?: string | null): string[] => {
      const targetId = themeId ?? getThemeForGame(gameId).id;
      return getThemeTilesForGame(gameId, targetId);
    },
    [getThemeForGame],
  );

  const equipTheme = useCallback(
    (themeId: string, scope: ThemeEquipScope = 'both'): boolean => {
      if (!unlockedThemes.includes(themeId) && themeId !== 'sweets' && themeId !== 'meadow') {
        return false;
      }
      const res = executeTransaction({
        idempotencyKey: `equip_theme:${Date.now()}:${themeId}:${scope}`,
        type: 'STATE_UPDATE',
        label: `Equip Theme ${themeId} (${scope})`,
        mutate: (draft) => {
          if (scope === 'both') {
            draft.inventory.equippedThemes.globalThemeId = themeId;
            draft.inventory.equippedThemes.onetThemeOverride = null;
            draft.inventory.equippedThemes.match3ThemeOverride = null;
          } else if (scope === 'onet') {
            draft.inventory.equippedThemes.onetThemeOverride = themeId;
          } else {
            draft.inventory.equippedThemes.match3ThemeOverride = themeId;
          }
          draft.inventory.unseenThemes = draft.inventory.unseenThemes.filter((id) => id !== themeId);
        },
      });
      return res.success;
    },
    [unlockedThemes, executeTransaction],
  );

  const equipCosmetic = useCallback(
    (slot: keyof EquippedCosmeticSlots, cosmeticId: string | null) => {
      executeTransaction({
        idempotencyKey: `equip_cosmetic:${Date.now()}:${slot}:${cosmeticId ?? 'none'}`,
        type: 'STATE_UPDATE',
        label: `Equip ${slot}`,
        mutate: (draft) => {
          if (slot === 'onetAnimation' || slot === 'match3Animation' || slot === 'frame') {
            draft.inventory.equippedCosmetics[slot] = cosmeticId;
          } else if (cosmeticId !== null) {
            draft.inventory.equippedCosmetics[slot] = cosmeticId;
          }
          if (slot === 'frame') {
            draft.profile.frameId = cosmeticId;
          }
        },
      });
    },
    [executeTransaction],
  );

  const setDarkMode = useCallback(
    (enabled: boolean) => {
      updateSettings({ display: { darkMode: enabled } });
    },
    [updateSettings],
  );

  const toggleDarkMode = useCallback(() => {
    setDarkMode(!isDarkMode);
  }, [isDarkMode, setDarkMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      activeGlobalTheme,
      activeOnetTheme,
      activeMatch3Theme,
      activeSurface,
      activeEffect,
      activeAvatar,
      activeFrame,
      isDarkMode,
      isReducedMotion,
      unlockedThemes,
      ownedCosmetics,
      themes: THEME_CATALOG,
      resolveTheme: resolveThemeDefinition,
      getThemeForGame,
      getTilesForGame,
      equipTheme,
      equipCosmetic,
      toggleDarkMode,
      setDarkMode,
      preloadThemeTiles,
    }),
    [
      activeGlobalTheme,
      activeOnetTheme,
      activeMatch3Theme,
      activeSurface,
      activeEffect,
      activeAvatar,
      activeFrame,
      isDarkMode,
      isReducedMotion,
      unlockedThemes,
      ownedCosmetics,
      getThemeForGame,
      getTilesForGame,
      equipTheme,
      equipCosmetic,
      toggleDarkMode,
      setDarkMode,
      preloadThemeTiles,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
