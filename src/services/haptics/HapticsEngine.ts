import {
  HAPTIC_CONFIG,
  HapticIntensity,
  HapticPatternKey,
} from '../../config/audioFeel.config';

export type { HapticIntensity, HapticPatternKey };

interface CapacitorHapticsModule {
  Haptics: {
    impact(options: { style: string }): Promise<void>;
    notification(options: { type: string }): Promise<void>;
    vibrate(options?: { duration?: number }): Promise<void>;
    selectionChanged(): Promise<void>;
  };
  ImpactStyle: {
    Heavy: string;
    Medium: string;
    Light: string;
  };
  NotificationType: {
    Success: string;
    Warning: string;
    Error: string;
  };
}

class HapticsEngineImpl {
  private enabled = true;
  private intensity: HapticIntensity = 'medium';
  private lastTriggeredAt = 0;
  private pluginCache: CapacitorHapticsModule | null | undefined = undefined;
  private pluginLoadPromise: Promise<CapacitorHapticsModule | null> | null = null;

  configure(options: { enabled?: boolean; intensity?: HapticIntensity }): void {
    if (typeof options.enabled === 'boolean') {
      this.enabled = options.enabled;
    }
    if (options.intensity) {
      this.intensity = options.intensity;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getIntensity(): HapticIntensity {
    return this.intensity;
  }

  private async loadPlugin(): Promise<CapacitorHapticsModule | null> {
    if (this.pluginCache !== undefined) {
      return this.pluginCache;
    }
    if (this.pluginLoadPromise) {
      return this.pluginLoadPromise;
    }
    if (typeof window === 'undefined') {
      this.pluginCache = null;
      return null;
    }

    this.pluginLoadPromise = import('@capacitor/haptics')
      .then((mod) => {
        this.pluginCache = mod as unknown as CapacitorHapticsModule;
        return this.pluginCache;
      })
      .catch(() => {
        this.pluginCache = null;
        return null;
      });

    return this.pluginLoadPromise;
  }

  private isHighPriority(pattern: HapticPatternKey): boolean {
    return pattern === 'invalidMove' || pattern === 'levelVictory';
  }

  private scaleDuration(value: number): number {
    const scale = HAPTIC_CONFIG.intensityScale[this.intensity] ?? 1;
    return Math.max(4, Math.round(value * scale));
  }

  private triggerWebFallback(pattern: HapticPatternKey): void {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
      return;
    }

    const raw = HAPTIC_CONFIG.webPatterns[pattern];
    const scaled = Array.isArray(raw)
      ? raw.map((segment, idx) => (idx % 2 === 0 ? this.scaleDuration(segment) : segment))
      : this.scaleDuration(raw);

    try {
      navigator.vibrate(scaled);
    } catch {
      // Ignore browser permission or unsupported vibration errors
    }
  }

  async trigger(pattern: HapticPatternKey): Promise<void> {
    if (!this.enabled) return;

    const now = Date.now();
    if (!this.isHighPriority(pattern) && now - this.lastTriggeredAt < HAPTIC_CONFIG.throttleMs) {
      return;
    }
    this.lastTriggeredAt = now;

    const plugin = await this.loadPlugin();
    if (!plugin?.Haptics) {
      this.triggerWebFallback(pattern);
      return;
    }

    const { Haptics, ImpactStyle, NotificationType } = plugin;

    try {
      switch (pattern) {
        case 'uiTap':
        case 'tileSelect': {
          const style =
            this.intensity === 'strong' ? ImpactStyle.Medium : ImpactStyle.Light;
          await Haptics.impact({ style });
          break;
        }
        case 'matchClear': {
          const style =
            this.intensity === 'light'
              ? ImpactStyle.Light
              : this.intensity === 'strong'
                ? ImpactStyle.Heavy
                : ImpactStyle.Medium;
          await Haptics.impact({ style });
          break;
        }
        case 'comboOrSpecial': {
          await Haptics.vibrate({ duration: this.scaleDuration(28) });
          setTimeout(() => {
            if (!this.enabled) return;
            Haptics.impact({
              style:
                this.intensity === 'light' ? ImpactStyle.Medium : ImpactStyle.Heavy,
            }).catch(() => {});
          }, 55);
          break;
        }
        case 'invalidMove': {
          await Haptics.notification({ type: NotificationType.Error });
          break;
        }
        case 'levelVictory': {
          await Haptics.notification({ type: NotificationType.Success });
          break;
        }
      }
    } catch {
      this.triggerWebFallback(pattern);
    }
  }

  resetThrottle(): void {
    this.lastTriggeredAt = 0;
  }
}

export const hapticsEngine = new HapticsEngineImpl();

export const triggerHaptic = (pattern: HapticPatternKey): void => {
  void hapticsEngine.trigger(pattern);
};
