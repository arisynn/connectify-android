/**
 * Native Capacitor Android Bridge for Connectify.
 * Handles hardware back button stack, app pause/resume lifecycle,
 * StatusBar theme syncing, SplashScreen handoff, and offline SW cleanup.
 * Owned by @android-eng.
 */

import { Capacitor } from '@capacitor/core';
import { App as CapApp, type BackButtonListenerEvent } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

export type BackButtonHandler = (event: BackButtonListenerEvent) => boolean | void | Promise<boolean | void>;

export interface LifecycleCallbacks {
  onPause?: () => void;
  onResume?: () => void;
  onBackButton?: BackButtonHandler;
}

class NativeCapacitorBridge {
  private initialized = false;
  private splashHidden = false;
  private backHandlers: BackButtonHandler[] = [];
  private pauseListeners = new Set<() => void>();
  private resumeListeners = new Set<() => void>();
  private cleanupFns: Array<() => void> = [];

  public isNative(): boolean {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }

  public getPlatform(): string {
    try {
      return Capacitor.getPlatform();
    } catch {
      return 'web';
    }
  }

  /**
   * Initializes global native lifecycle listeners (App state, Back button, SW guard).
   * Safe to call multiple times; idempotent.
   */
  public async init(callbacks?: LifecycleCallbacks): Promise<void> {
    if (callbacks?.onPause) this.pauseListeners.add(callbacks.onPause);
    if (callbacks?.onResume) this.resumeListeners.add(callbacks.onResume);
    if (callbacks?.onBackButton) this.pushBackHandler(callbacks.onBackButton);

    if (this.initialized) return;
    this.initialized = true;

    // Native builds load all assets locally from android/app/src/main/assets/public/.
    // Unregister any leftover service worker so it never intercepts or caps assets.
    if (this.isNative() && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
    }

    if (typeof document !== 'undefined') {
      const handleVisibility = () => {
        if (document.hidden) {
          this.emitPause();
        } else {
          this.emitResume();
        }
      };
      document.addEventListener('visibilitychange', handleVisibility);
      this.cleanupFns.push(() => document.removeEventListener('visibilitychange', handleVisibility));
    }

    if (typeof window !== 'undefined') {
      const handleBlur = () => this.emitPause();
      const handleFocus = () => {
        if (typeof document === 'undefined' || !document.hidden) {
          this.emitResume();
        }
      };
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);
      this.cleanupFns.push(() => {
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
      });
    }

    if (this.isNative()) {
      try {
        const appStateHandle = await CapApp.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            this.emitResume();
          } else {
            this.emitPause();
          }
        });
        this.cleanupFns.push(() => {
          void appStateHandle.remove();
        });
      } catch {
        // Ignore if plugin unavailable in test/web shell
      }

      try {
        const backHandle = await CapApp.addListener('backButton', async (event) => {
          // Run registered handlers in LIFO order (topmost overlay/screen first)
          for (let i = this.backHandlers.length - 1; i >= 0; i -= 1) {
            const handled = await this.backHandlers[i](event);
            if (handled) return;
          }
          // Default root fallback: minimize cleanly instead of killing WebView state
          await this.minimizeApp();
        });
        this.cleanupFns.push(() => {
          void backHandle.remove();
        });
      } catch {
        // Ignore if plugin unavailable
      }
    }
  }

  public pushBackHandler(handler: BackButtonHandler): () => void {
    this.backHandlers.push(handler);
    return () => {
      const idx = this.backHandlers.lastIndexOf(handler);
      if (idx !== -1) this.backHandlers.splice(idx, 1);
    };
  }

  public onPause(cb: () => void): () => void {
    this.pauseListeners.add(cb);
    return () => {
      this.pauseListeners.delete(cb);
    };
  }

  public onResume(cb: () => void): () => void {
    this.resumeListeners.add(cb);
    return () => {
      this.resumeListeners.delete(cb);
    };
  }

  private emitPause(): void {
    for (const cb of this.pauseListeners) {
      try {
        cb();
      } catch {
        // Prevent one subscriber from blocking storage flush or audio suspend
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connectify:app-pause'));
    }
  }

  private emitResume(): void {
    for (const cb of this.resumeListeners) {
      try {
        cb();
      } catch {
        // Ignore non-critical resume errors
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('connectify:app-resume'));
    }
  }

  /**
   * Syncs Android system status bar icon contrast and background with light/dark mode.
   */
  public async syncStatusBar(isDarkMode: boolean): Promise<void> {
    if (!this.isNative()) return;
    try {
      await StatusBar.setOverlaysWebView({ overlay: true });
      // Style.Dark renders light/white icons (for dark UI); Style.Light renders dark icons (for light UI)
      await StatusBar.setStyle({ style: isDarkMode ? Style.Dark : Style.Light });
    } catch {
      // Ignore on unsupported Android OEMs/versions
    }
  }

  /**
   * Hides the native Android splash screen and fades out the HTML #static-loader.
   */
  public async hideSplashScreen(fadeOutDuration = 250): Promise<void> {
    if (typeof window !== 'undefined') {
      (window as unknown as { _loaderReady?: boolean })._loaderReady = true;
    }
    if (typeof document !== 'undefined') {
      const loader = document.getElementById('static-loader');
      if (loader) {
        loader.style.opacity = '0';
        loader.style.pointerEvents = 'none';
        setTimeout(() => loader.remove(), fadeOutDuration + 50);
      }
    }

    if (this.splashHidden || !this.isNative()) return;
    this.splashHidden = true;
    try {
      await SplashScreen.hide({ fadeOutDuration });
    } catch {
      // Ignore if already hidden
    }
  }

  public async minimizeApp(): Promise<void> {
    if (!this.isNative()) return;
    try {
      await CapApp.minimizeApp();
    } catch {
      // Ignore
    }
  }

  public dispose(): void {
    for (const fn of this.cleanupFns) {
      try {
        fn();
      } catch {
        // Ignore
      }
    }
    this.cleanupFns = [];
    this.backHandlers = [];
    this.pauseListeners.clear();
    this.resumeListeners.clear();
    this.initialized = false;
  }
}

export const CapacitorBridge = new NativeCapacitorBridge();
export default CapacitorBridge;
