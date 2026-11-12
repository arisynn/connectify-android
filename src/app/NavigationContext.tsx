/**
 * Application Navigation, Modal Stack & Android Hardware Back-Button Controller
 * Owned by @ui-eng
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { GameId, GameMode, ModalId, ScreenId } from '@/types/game.types';
import { CapacitorBridge } from '@/services/native/CapacitorBridge';
import { getTodayKey } from '@/utils/time';

export interface ModalPayload {
  themeId?: string;
  itemId?: string;
  tab?: string;
  shopCategory?: string;
  shopScope?: 'all' | 'onet' | 'match3' | 'profile';
}

export interface StartGameOptions {
  game: GameId;
  level: number;
  mode?: GameMode;
  dailyDateKey?: string;
}

export interface NavigationContextValue {
  currentScreen: ScreenId;
  historyStack: ScreenId[];
  selectedGame: GameId;
  activeLevel: number;
  activeMode: GameMode;
  activeDailyDateKey: string;
  activeModal: ModalId;
  modalPayload: ModalPayload | null;
  setSelectedGame: (game: GameId) => void;
  navigate: (screen: ScreenId, options?: { replace?: boolean; game?: GameId }) => void;
  openLevelSelect: (game: GameId) => void;
  startGame: (options: StartGameOptions) => void;
  goBack: () => boolean;
  openModal: (modal: Exclude<ModalId, null>, payload?: ModalPayload) => void;
  closeModal: () => void;
  registerGameplayBackHandler: (handler: (() => boolean) | null) => void;
  confirmExitApp: () => Promise<void>;
}

const NavigationContext = createContext<NavigationContextValue | null>(null);

const NON_HISTORY_SCREENS = new Set<ScreenId>(['boot', 'startup']);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('boot');
  const [historyStack, setHistoryStack] = useState<ScreenId[]>([]);
  const [selectedGame, setSelectedGameState] = useState<GameId>('onet');
  const [activeLevel, setActiveLevel] = useState<number>(1);
  const [activeMode, setActiveMode] = useState<GameMode>('normal');
  const [activeDailyDateKey, setActiveDailyDateKey] = useState<string>(() => getTodayKey());
  const [activeModal, setActiveModal] = useState<ModalId>(null);
  const [modalPayload, setModalPayload] = useState<ModalPayload | null>(null);

  const gameplayBackHandlerRef = useRef<(() => boolean) | null>(null);

  // Sync [data-game] CSS token attribute for --g-accent / --g-soft
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-game', selectedGame);
  }, [selectedGame]);

  const setSelectedGame = useCallback((game: GameId) => {
    setSelectedGameState(game);
  }, []);

  const navigate = useCallback(
    (screen: ScreenId, options?: { replace?: boolean; game?: GameId }) => {
      if (options?.game) {
        setSelectedGameState(options.game);
      }
      setActiveModal(null);
      setModalPayload(null);

      setCurrentScreen((prev) => {
        if (prev === screen) return prev;
        if (!options?.replace && !NON_HISTORY_SCREENS.has(prev)) {
          setHistoryStack((stack) => [...stack.slice(-12), prev]);
        } else if (options?.replace && screen === 'home') {
          setHistoryStack([]);
        }
        return screen;
      });
    },
    [],
  );

  const openLevelSelect = useCallback(
    (game: GameId) => {
      setSelectedGameState(game);
      navigate('level-select', { game });
    },
    [navigate],
  );

  const startGame = useCallback(
    (options: StartGameOptions) => {
      const mode: GameMode = options.mode ?? 'normal';
      setSelectedGameState(options.game);
      setActiveLevel(Math.max(1, Math.floor(options.level)));
      setActiveMode(mode);
      setActiveDailyDateKey(options.dailyDateKey ?? getTodayKey());
      setActiveModal(null);
      setModalPayload(null);

      const targetScreen: ScreenId = options.game === 'onet' ? 'play-onet' : 'play-match3';
      setCurrentScreen((prev) => {
        if (prev !== targetScreen && !NON_HISTORY_SCREENS.has(prev)) {
          setHistoryStack((stack) => [...stack.slice(-12), prev]);
        }
        return targetScreen;
      });
    },
    [],
  );

  const openModal = useCallback((modal: Exclude<ModalId, null>, payload?: ModalPayload) => {
    setActiveModal(modal);
    setModalPayload(payload ?? null);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalPayload(null);
  }, []);

  const registerGameplayBackHandler = useCallback((handler: (() => boolean) | null) => {
    gameplayBackHandlerRef.current = handler;
  }, []);

  const confirmExitApp = useCallback(async () => {
    setActiveModal(null);
    setModalPayload(null);
    await CapacitorBridge.minimizeApp();
  }, []);

  /**
   * 6-level Android Hardware Back Button Priority Stack:
   * 1. Active modal/overlay -> close modal (if not exit-confirm, dismiss it)
   * 2. Active exit-confirm modal -> dismiss exit-confirm
   * 3. Gameplay screen -> delegate to gameplay pause handler (or return to level-select)
   * 4. Non-root screen -> pop history or return to 'home'
   * 5. 'home' screen -> open 'exit-confirm' dialog
   * 6. 'boot' / 'startup' -> return false (system default / ignore)
   */
  const goBack = useCallback((): boolean => {
    // Priority 1 & 2: Any open modal (settings, theme-preview, daily-challenges, pause, exit-confirm, etc.)
    if (activeModal !== null) {
      setActiveModal(null);
      setModalPayload(null);
      return true;
    }

    // Priority 3: Active gameplay screen
    if (currentScreen === 'play-onet' || currentScreen === 'play-match3') {
      if (gameplayBackHandlerRef.current) {
        const handled = gameplayBackHandlerRef.current();
        if (handled) return true;
      }
      setCurrentScreen('level-select');
      return true;
    }

    // Priority 4: Non-root meta screens -> pop history or return to home
    if (
      currentScreen === 'level-select' ||
      currentScreen === 'shop' ||
      currentScreen === 'collection' ||
      currentScreen === 'profile' ||
      currentScreen === 'ledger'
    ) {
      if (historyStack.length > 0) {
        const nextHistory = [...historyStack];
        const previous = nextHistory.pop()!;
        setHistoryStack(nextHistory);
        setCurrentScreen(NON_HISTORY_SCREENS.has(previous) ? 'home' : previous);
      } else {
        setCurrentScreen('home');
      }
      return true;
    }

    // Priority 5: Home screen -> show exit confirmation modal
    if (currentScreen === 'home') {
      setActiveModal('exit-confirm');
      setModalPayload(null);
      return true;
    }

    // Priority 6: Boot / Startup -> allow default
    return false;
  }, [activeModal, currentScreen, historyStack]);

  // Register LIFO back handler with CapacitorBridge
  useEffect(() => {
    const unregister = CapacitorBridge.pushBackHandler(() => goBack());
    return unregister;
  }, [goBack]);

  const value = useMemo<NavigationContextValue>(
    () => ({
      currentScreen,
      historyStack,
      selectedGame,
      activeLevel,
      activeMode,
      activeDailyDateKey,
      activeModal,
      modalPayload,
      setSelectedGame,
      navigate,
      openLevelSelect,
      startGame,
      goBack,
      openModal,
      closeModal,
      registerGameplayBackHandler,
      confirmExitApp,
    }),
    [
      currentScreen,
      historyStack,
      selectedGame,
      activeLevel,
      activeMode,
      activeDailyDateKey,
      activeModal,
      modalPayload,
      setSelectedGame,
      navigate,
      openLevelSelect,
      startGame,
      goBack,
      openModal,
      closeModal,
      registerGameplayBackHandler,
      confirmExitApp,
    ],
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};

export function useNavigation(): NavigationContextValue {
  const ctx = useContext(NavigationContext);
  if (!ctx) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return ctx;
}
