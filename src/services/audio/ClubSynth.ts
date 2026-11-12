import {
  AUDIO_DEFAULTS,
  AudioSettings,
  BgmScene,
  CLUBSYNTH_GAIN,
  CLUBSYNTH_SEQUENCES,
  CLUBSYNTH_TEMPOS,
  SFX_PATTERNS,
  SfxKey,
} from '../../config/audioFeel.config';

export type { AudioSettings, BgmScene, SfxKey };

const midiToHz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

export class ClubSynth {
  context: AudioContext | null = null;
  music: GainNode | null = null;
  sfx: GainNode | null = null;
  scene: BgmScene = 'off';
  step = 0;
  next = 0;
  timer: ReturnType<typeof setInterval> | null = null;
  settings: AudioSettings;
  private isBackgrounded = false;
  private disposed = false;

  constructor(settings: Partial<AudioSettings> = {}) {
    this.settings = { ...AUDIO_DEFAULTS, ...settings };
  }

  private isHidden(): boolean {
    if (this.isBackgrounded) return true;
    return typeof document !== 'undefined' && document.hidden;
  }

  private getAudioContextCtor(): typeof AudioContext | null {
    if (typeof window === 'undefined') return null;
    const win = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    return win.AudioContext || win.webkitAudioContext || null;
  }

  unlock = (): void => {
    if (this.disposed) return;

    if (!this.context) {
      const AC = this.getAudioContextCtor();
      if (!AC) return;

      const c = (this.context = new AC());
      this.music = c.createGain();
      this.sfx = c.createGain();

      const compressor = c.createDynamicsCompressor();
      compressor.threshold.value = CLUBSYNTH_GAIN.compressorThreshold;
      compressor.ratio.value = CLUBSYNTH_GAIN.compressorRatio;

      this.music.connect(compressor);
      this.sfx.connect(compressor);
      compressor.connect(c.destination);

      this.apply(this.settings);
      this.next = c.currentTime + 0.06;
      this.startScheduler();
    }

    if (this.context.state === 'suspended' && !this.isHidden()) {
      this.next = this.context.currentTime + 0.06;
      this.context.resume().catch(() => {});
      this.startScheduler();
    }
  };

  private startScheduler(): void {
    if (this.timer !== null || this.disposed) return;
    this.timer = setInterval(this.schedule, CLUBSYNTH_GAIN.schedulerIntervalMs);
  }

  private stopScheduler(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  apply = (settings: AudioSettings): void => {
    this.settings = { ...settings };
    const now = this.context?.currentTime ?? 0;

    const musicTarget =
      this.isHidden() || settings.muteMusic || this.scene === 'off'
        ? 0
        : (Math.max(0, Math.min(100, settings.musicVol)) / 100) * CLUBSYNTH_GAIN.musicMax;

    const sfxTarget =
      this.isHidden() || settings.muteSfx
        ? 0
        : (Math.max(0, Math.min(100, settings.sfxVol)) / 100) * CLUBSYNTH_GAIN.sfxMax;

    this.music?.gain.setTargetAtTime(musicTarget, now, CLUBSYNTH_GAIN.musicRampSec);
    this.sfx?.gain.setTargetAtTime(sfxTarget, now, CLUBSYNTH_GAIN.sfxRampSec);
  };

  setScene = (scene: BgmScene): void => {
    if (this.scene !== scene) {
      this.scene = scene;
      this.step = 0;
      this.next = (this.context?.currentTime ?? 0) + 0.08;
      this.apply(this.settings);
    }
  };

  note = (
    hz: number,
    start: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'sine',
    bus: GainNode | null = this.music,
    lowpassHz?: number
  ): void => {
    const c = this.context;
    if (!c || !bus) return;

    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = hz;

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    if (lowpassHz && lowpassHz > 0) {
      const filter = c.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpassHz;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(bus);
      osc.onended = () => {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      };
    } else {
      osc.connect(gain);
      gain.connect(bus);
      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    }

    osc.start(start);
    osc.stop(start + duration + 0.03);
  };

  schedule = (): void => {
    const c = this.context;
    if (
      !c ||
      c.state !== 'running' ||
      this.scene === 'off' ||
      this.isHidden() ||
      this.settings.muteMusic
    ) {
      return;
    }

    if (this.next < c.currentTime) {
      this.next = c.currentTime + 0.03;
    }

    const tempo = this.scene === 'menu' ? CLUBSYNTH_TEMPOS.menu : CLUBSYNTH_TEMPOS.game;
    const beat = 60 / tempo / 2;
    const melody =
      this.scene === 'menu'
        ? CLUBSYNTH_SEQUENCES.menuMelody
        : CLUBSYNTH_SEQUENCES.gameMelody;
    const chords = CLUBSYNTH_SEQUENCES.chords;

    while (this.next < c.currentTime + CLUBSYNTH_GAIN.lookaheadSec) {
      const n = this.step % 16;
      const bar = Math.floor(this.step / 16) % 4;
      const melodyNote = melody[n];

      if (melodyNote) {
        this.note(midiToHz(melodyNote), this.next, 0.6, 0.09, 'triangle');
        this.note(midiToHz(melodyNote), this.next + beat * 0.65, 0.45, 0.025);
      }

      if (n % 8 === 0) {
        chords[bar].forEach((m) => this.note(midiToHz(m), this.next, beat * 7, 0.055));
      }

      if (n % 4 === 0) {
        this.note(CLUBSYNTH_SEQUENCES.bassHz, this.next, 0.13, 0.1);
      }

      this.step++;
      this.next += beat;
    }
  };

  sound = (key: SfxKey | string): void => {
    if (this.settings.muteSfx || this.isHidden()) return;
    this.unlock();
    if (!this.context) return;

    const spec = SFX_PATTERNS[key as SfxKey] ?? SFX_PATTERNS.click;
    const t = this.context.currentTime;

    spec.frequencies.forEach((freq, i) => {
      this.note(
        freq,
        t + i * spec.stepSec,
        spec.durationSec,
        spec.volume,
        spec.waveform,
        this.sfx,
        spec.lowpassHz
      );
    });
  };

  playComboMatch = (comboCount: number): void => {
    if (this.settings.muteSfx || this.isHidden()) return;
    this.unlock();
    if (!this.context) return;

    const chain = Math.max(1, Math.floor(comboCount));
    const semitones = Math.min(chain - 1, 8);
    const pitchScale = Math.pow(2, semitones / 12);
    const t = this.context.currentTime;

    const baseFreqs = chain >= 4 ? [659, 880, 1109] : [659, 880];
    baseFreqs.forEach((f, i) => {
      this.note(
        f * pitchScale,
        t + i * 0.055,
        chain >= 3 ? 0.2 : 0.18,
        Math.min(0.18, 0.14 + semitones * 0.005),
        'triangle',
        this.sfx
      );
    });
  };

  pauseForBackground = (): void => {
    this.isBackgrounded = true;
    this.stopScheduler();

    if (this.context) {
      const now = this.context.currentTime;
      this.music?.gain.cancelScheduledValues(now);
      this.sfx?.gain.cancelScheduledValues(now);
      this.music?.gain.setValueAtTime(0, now);
      this.sfx?.gain.setValueAtTime(0, now);
      this.context.suspend().catch(() => {});
    }
  };

  resumeFromForeground = (): void => {
    this.isBackgrounded = false;
    if (typeof document !== 'undefined' && document.hidden) return;

    if (this.context) {
      this.next = this.context.currentTime + 0.08;
      if (this.context.state === 'suspended') {
        this.context.resume().catch(() => {});
      }
      this.startScheduler();
      this.apply(this.settings);
    }
  };

  visibility = (): void => {
    if (typeof document !== 'undefined' && document.hidden) {
      this.pauseForBackground();
    } else {
      this.resumeFromForeground();
    }
  };

  dispose = (): void => {
    this.disposed = true;
    this.stopScheduler();
    this.context?.close().catch(() => {});
    this.context = null;
    this.music = null;
    this.sfx = null;
  };
}
