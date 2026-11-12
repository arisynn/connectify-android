import React, { Component, useEffect, useRef } from 'react';
import { APP_CONFIG } from '@/config/app.config';
import { NavigationProvider, useNavigation } from '@/app/NavigationContext';
import { Router } from '@/app/Router';
import { PersistenceProvider, usePersistence } from '@/services/persistence/PersistenceContext';
import { ThemeProvider, useTheme } from '@/services/theme/ThemeContext';
import { AudioProvider, useAudio } from '@/services/audio/AudioContext';
import { CapacitorBridge } from '@/services/native/CapacitorBridge';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends Component<React.PropsWithChildren, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Terjadi kesalahan yang tidak terduga.',
    };
  }

  public override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[AppErrorBoundary] Uncaught error:', error, info);
    if (typeof window !== 'undefined') {
      (window as unknown as { _loaderReady?: boolean })._loaderReady = true;
    }
    if (typeof document !== 'undefined') {
      document.getElementById('static-loader')?.remove();
    }
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  private handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public override render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        className="w-full h-[100dvh] flex items-center justify-center p-6"
        style={{
          backgroundColor: APP_CONFIG.backgroundColor,
          paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        <div
          className="w-full max-w-[380px] rounded-2xl bg-white p-6 text-center"
          style={{
            border: '3px solid #172337',
            boxShadow: '4px 5px 0px 0px #172337',
            color: '#172337',
          }}
        >
          <h1 className="text-xl font-bold tracking-tight">Ups, Ada Kendala</h1>
          <p className="mt-2 text-sm opacity-80">{this.state.errorMessage}</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-xl px-4 py-2 text-sm font-bold"
              style={{
                backgroundColor: '#f3f4f6',
                border: '2px solid #172337',
                color: '#172337',
              }}
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-xl px-4 py-2 text-sm font-bold text-white"
              style={{
                backgroundColor: '#ff6b8a',
                border: '2px solid #172337',
              }}
            >
              Muat Ulang
            </button>
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Coordinates native Capacitor lifecycle hooks, status bar contrast,
 * persistence flushing, and screen-aware background music switching.
 */
const AppRuntime: React.FC = () => {
  const { initialized, flushNow } = usePersistence();
  const { isDarkMode } = useTheme();
  const { playMenuBgm, playGameBgm, stopBgm, pauseAudio, resumeAudio } = useAudio();
  const { currentScreen } = useNavigation();

  const lifecycleRef = useRef({ flushNow, pauseAudio, resumeAudio });
  lifecycleRef.current = { flushNow, pauseAudio, resumeAudio };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { _loaderReady?: boolean })._loaderReady = true;
    }

    void CapacitorBridge.init();

    const unsubPause = CapacitorBridge.onPause(() => {
      lifecycleRef.current.flushNow();
      lifecycleRef.current.pauseAudio();
    });
    const unsubResume = CapacitorBridge.onResume(() => {
      lifecycleRef.current.resumeAudio();
    });

    return () => {
      unsubPause();
      unsubResume();
    };
  }, []);

  useEffect(() => {
    void CapacitorBridge.syncStatusBar(isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    if (!initialized || currentScreen === 'boot') {
      stopBgm();
      return;
    }

    if (currentScreen === 'play-onet' || currentScreen === 'play-match3') {
      playGameBgm();
      return;
    }

    playMenuBgm();
  }, [initialized, currentScreen, playMenuBgm, playGameBgm, stopBgm]);

  return <Router />;
};

export default function App() {
  return (
    <AppErrorBoundary>
      <PersistenceProvider>
        <ThemeProvider>
          <AudioProvider>
            <NavigationProvider>
              <AppRuntime />
            </NavigationProvider>
          </AudioProvider>
        </ThemeProvider>
      </PersistenceProvider>
    </AppErrorBoundary>
  );
}
