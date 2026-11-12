/**
 * React Context & Lifecycle Hook Binding for LocalPersistenceEngine
 * Owned by: @data-eng
 */

import React, { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import type {
  ActiveGameSession,
  ActiveMatch3SessionState,
  ActiveOnetSessionState,
  ConnectifySaveDataV1,
  GameModeId,
  MutationResult,
  PersistenceBootReport,
  PlayerSettingsState,
} from '../../types/persistence.types';
import { LocalPersistenceEngine, type TransactionRequest } from './LocalPersistenceEngine';

export interface PersistenceContextValue {
  engine: LocalPersistenceEngine;
  saveData: Readonly<ConnectifySaveDataV1>;
  initialized: boolean;
  bootReport: PersistenceBootReport | null;
  revision: number;
  executeTransaction: (tx: TransactionRequest) => MutationResult;
  saveActiveSession: (gameId: GameModeId, session: ActiveGameSession | null) => void;
  getActiveSession: {
    (gameId: 'onet'): ActiveOnetSessionState | null;
    (gameId: 'match3'): ActiveMatch3SessionState | null;
    (gameId?: GameModeId): ActiveGameSession | null;
  };
  flushNow: () => void;
  updateSettings: (patch: {
    audio?: Partial<PlayerSettingsState['audio']>;
    haptics?: Partial<PlayerSettingsState['haptics']>;
    display?: Partial<PlayerSettingsState['display']>;
    locale?: PlayerSettingsState['locale'];
  }) => MutationResult;
  exportBackup: () => string;
  importBackup: (rawPayload: string) => MutationResult;
  resetAllData: () => Promise<ConnectifySaveDataV1>;
}

const PersistenceContext = createContext<PersistenceContextValue | null>(null);

export const PersistenceProvider: React.FC<{
  children: React.ReactNode;
  engine?: LocalPersistenceEngine;
}> = ({ children, engine: providedEngine }) => {
  const engine = providedEngine ?? LocalPersistenceEngine.getInstance();
  const [initialized, setInitialized] = useState<boolean>(() => engine.isInitialized());
  const [bootReport, setBootReport] = useState<PersistenceBootReport | null>(() => engine.getBootReport());

  const saveData = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);

  useEffect(() => {
    let mounted = true;
    void engine.initialize().then(() => {
      if (!mounted) return;
      setInitialized(true);
      setBootReport(engine.getBootReport());
    });

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        engine.flushNow();
      }
    };
    const handlePageHide = () => {
      engine.flushNow();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', handlePageHide);
    }

    return () => {
      mounted = false;
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handlePageHide);
      }
    };
  }, [engine]);

  const executeTransaction = useCallback((tx: TransactionRequest) => engine.executeTransaction(tx), [engine]);
  const saveActiveSession = useCallback(
    (gameId: GameModeId, session: ActiveGameSession | null) => engine.saveActiveSession(gameId, session),
    [engine],
  );
  const getActiveSession = useCallback(
    ((gameId?: GameModeId) => engine.getActiveSession(gameId)) as PersistenceContextValue['getActiveSession'],
    [engine],
  );
  const flushNow = useCallback(() => engine.flushNow(), [engine]);
  const updateSettings = useCallback(
    (patch: Parameters<LocalPersistenceEngine['updateSettings']>[0]) => engine.updateSettings(patch),
    [engine],
  );
  const exportBackup = useCallback(() => engine.exportBackupPayload(), [engine]);
  const importBackup = useCallback((raw: string) => engine.importBackupPayload(raw), [engine]);
  const resetAllData = useCallback(() => engine.resetAllData(), [engine]);

  return (
    <PersistenceContext.Provider
      value={{
        engine,
        saveData,
        initialized,
        bootReport,
        revision: engine.getRevision(),
        executeTransaction,
        saveActiveSession,
        getActiveSession,
        flushNow,
        updateSettings,
        exportBackup,
        importBackup,
        resetAllData,
      }}
    >
      {children}
    </PersistenceContext.Provider>
  );
};

export function usePersistence(): PersistenceContextValue {
  const ctx = useContext(PersistenceContext);
  if (!ctx) {
    throw new Error('usePersistence must be used within a PersistenceProvider');
  }
  return ctx;
}
