import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AUDIO_DEFAULTS,
  AUDIO_STORAGE_KEY,
  AudioSettings,
  HapticPatternKey,
  SfxKey,
} from '../../config/audioFeel.config';
import { ClubSynth } from './ClubSynth';
import { hapticsEngine } from '../haptics/HapticsEngine';

export interface AudioContextValue {
  settings: AudioSettings;
  updateSettings: (patch: Partial<AudioSettings>) => void;
  playMenuBgm: () => void;
  playGameBgm: () => void;
  stopBgm: () => void;
  playSfx: (key: SfxKey | string, _fallback?: () => void) => void;
  playComboMatch: (comboCount: number) => void;
  playMatch: () => void;
  playWrong: () => void;
  playUiClick: () => void;
  triggerHaptic: (pattern: HapticPatternKey) => void;
  pauseAudio: () => void;
  resumeAudio: () => void;
}

const clampVolume = (value: unknown, fallback: number): number => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(100, Math.max(0, Math.round(num)));
};

const readStoredSettings = (): AudioSettings => {
  if (typeof localStorage === 'undefined') {
    return { ...AUDIO_DEFAULTS };
  }
  try {
    const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (!raw) return { ...AUDIO_DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      ...AUDIO_DEFAULTS,
      ...parsed,
      musicVol: clampVolume(parsed.musicVol, AUDIO_DEFAULTS.musicVol),
      sfxVol: clampVolume(parsed.sfxVol, AUDIO_DEFAULTS.sfxVol),
      muteMusic: Boolean(parsed.muteMusic),
      muteSfx: Boolean(parsed.muteSfx),
      hapticsEnabled:
        parsed.hapticsEnabled === undefined
          ? AUDIO_DEFAULTS.hapticsEnabled
          : Boolean(parsed.hapticsEnabled),
      hapticsIntensity:
        parsed.hapticsIntensity === 'light' ||
        parsed.hapticsIntensity === 'medium' ||
        parsed.hapticsIntensity === 'strong'
          ? parsed.hapticsIntensity
          : AUDIO_DEFAULTS.hapticsIntensity,
    };
  } catch {
    return { ...AUDIO_DEFAULTS };
  }
};

const writeStoredSettings = (next: AudioSettings): void => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors; authoritative persistence handles durable writes
  }
};

export const AudioContext = createContext<AudioContextValue | null>(null);

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AudioSettings>(readStoredSettings);
  const synthRef = useRef<ClubSynth | null>(null);
  if (!synthRef.current) {
    synthRef.current = new ClubSynth(settings);
  }

  useEffect(() => {
    hapticsEngine.configure({
      enabled: settings.hapticsEnabled,
      intensity: settings.hapticsIntensity,
    });
  }, [settings.hapticsEnabled, settings.hapticsIntensity]);

  useEffect(() => {
    const engine = synthRef.current!;

    const onGesture = (e: Event) => {
      engine.unlock();
      const target = e.target as Element | null;
      if (target?.closest?.('button,[role="button"]')) {
        engine.sound('click');
      }
    };

    const onVisibility = () => engine.visibility();
    const onWindowBlur = () => engine.pauseForBackground();
    const onWindowFocus = () => engine.resumeFromForeground();

    document.addEventListener('pointerdown', onGesture);
    document.addEventListener('keydown', onGesture);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);

    let appStateHandle: { remove: () => Promise<void> } | null = null;
    let mounted = true;

    import('@capacitor/app')
      .then(({ App }) => {
        if (!mounted || !App?.addListener) return null;
        return App.addListener('appStateChange', ({ isActive }) => {
          if (isActive) {
            engine.resumeFromForeground();
          } else {
            engine.pauseForBackground();
          }
        });
      })
      .then((handle) => {
        if (mounted && handle) {
          appStateHandle = handle;
        } else if (handle) {
          handle.remove().catch(() => {});
        }
      })
      .catch(() => {
        // Running in plain browser / test environment without Capacitor App plugin
      });

    return () => {
      mounted = false;
      document.removeEventListener('pointerdown', onGesture);
      document.removeEventListener('keydown', onGesture);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
      appStateHandle?.remove().catch(() => {});
      engine.dispose();
    };
  }, []);

  const methods = useMemo(
    () => ({
      updateSettings: (patch: Partial<AudioSettings>) => {
        setSettings((old) => {
          const next: AudioSettings = {
            ...old,
            ...patch,
            musicVol:
              patch.musicVol !== undefined
                ? clampVolume(patch.musicVol, old.musicVol)
                : old.musicVol,
            sfxVol:
              patch.sfxVol !== undefined
                ? clampVolume(patch.sfxVol, old.sfxVol)
                : old.sfxVol,
          };
          synthRef.current?.apply(next);
          hapticsEngine.configure({
            enabled: next.hapticsEnabled,
            intensity: next.hapticsIntensity,
          });
          writeStoredSettings(next);
          return next;
        });
      },
      playMenuBgm: () => synthRef.current?.setScene('menu'),
      playGameBgm: () => synthRef.current?.setScene('game'),
      stopBgm: () => synthRef.current?.setScene('off'),
      playSfx: (key: SfxKey | string) => synthRef.current?.sound(key),
      playComboMatch: (comboCount: number) => synthRef.current?.playComboMatch(comboCount),
      playMatch: () => synthRef.current?.sound('match'),
      playWrong: () => synthRef.current?.sound('wrong'),
      playUiClick: () => synthRef.current?.sound('click'),
      triggerHaptic: (pattern: HapticPatternKey) => {
        void hapticsEngine.trigger(pattern);
      },
      pauseAudio: () => synthRef.current?.pauseForBackground(),
      resumeAudio: () => synthRef.current?.resumeFromForeground(),
    }),
    []
  );

  const value = useMemo<AudioContextValue>(
    () => ({
      settings,
      ...methods,
    }),
    [settings, methods]
  );

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const useAudio = (): AudioContextValue => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('AudioProvider required');
  }
  return context;
};
