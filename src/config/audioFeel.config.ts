export type BgmScene = 'menu' | 'game' | 'off';

export type SfxKey =
  | 'click'
  | 'select'
  | 'swap'
  | 'place'
  | 'match'
  | 'split'
  | 'clear'
  | 'combo'
  | 'cascade_2'
  | 'cascade_3'
  | 'cascade_4plus'
  | 'special_spawn'
  | 'line_blast'
  | 'bomb_blast'
  | 'rainbow_zap'
  | 'hint'
  | 'shuffle'
  | 'purchase'
  | 'uiReward'
  | 'uiMatch'
  | 'win'
  | 'lose'
  | 'wrong'
  | 'invalid'
  | 'error';

export type HapticPatternKey =
  | 'uiTap'
  | 'tileSelect'
  | 'matchClear'
  | 'comboOrSpecial'
  | 'invalidMove'
  | 'levelVictory';

export type HapticIntensity = 'light' | 'medium' | 'strong';

export interface AudioSettings {
  musicVol: number;
  sfxVol: number;
  muteMusic: boolean;
  muteSfx: boolean;
  hapticsEnabled: boolean;
  hapticsIntensity: HapticIntensity;
}

export interface SfxPatternSpec {
  frequencies: number[];
  stepSec: number;
  durationSec: number;
  volume: number;
  waveform: OscillatorType;
  lowpassHz?: number;
}

export const AUDIO_STORAGE_KEY = 'sweetConnectAudioSettings';

export const AUDIO_DEFAULTS: AudioSettings = {
  musicVol: 45,
  sfxVol: 65,
  muteMusic: false,
  muteSfx: false,
  hapticsEnabled: true,
  hapticsIntensity: 'medium',
};

export const CLUBSYNTH_TEMPOS: Record<'menu' | 'game', number> = {
  menu: 84,
  game: 102,
};

export const CLUBSYNTH_GAIN = {
  musicMax: 0.38,
  sfxMax: 0.65,
  musicRampSec: 0.15,
  sfxRampSec: 0.03,
  compressorThreshold: -18,
  compressorRatio: 3,
  lookaheadSec: 0.18,
  schedulerIntervalMs: 100,
} as const;

export const CLUBSYNTH_SEQUENCES = {
  menuMelody: [72, 0, 76, 79, 0, 76, 74, 0, 72, 76, 0, 81, 79, 0, 76, 74] as readonly number[],
  gameMelody: [72, 79, 76, 0, 74, 81, 79, 0, 76, 79, 84, 0, 81, 79, 74, 0] as readonly number[],
  chords: [
    [48, 55, 64],
    [45, 52, 60],
    [41, 48, 57],
    [43, 50, 59],
  ] as readonly (readonly number[])[],
  bassHz: 58,
};

export const SFX_PATTERNS: Record<SfxKey, SfxPatternSpec> = {
  // Original 11 ClubSynth SFX patterns preserved
  click: { frequencies: [660], stepSec: 0.065, durationSec: 0.055, volume: 0.06, waveform: 'triangle' },
  place: { frequencies: [240, 360], stepSec: 0.065, durationSec: 0.18, volume: 0.14, waveform: 'triangle' },
  match: { frequencies: [659, 880], stepSec: 0.065, durationSec: 0.18, volume: 0.14, waveform: 'triangle' },
  split: { frequencies: [440, 659, 988], stepSec: 0.065, durationSec: 0.18, volume: 0.14, waveform: 'triangle' },
  clear: { frequencies: [523, 659, 784], stepSec: 0.065, durationSec: 0.18, volume: 0.14, waveform: 'triangle' },
  combo: { frequencies: [659, 784, 988, 1319], stepSec: 0.065, durationSec: 0.18, volume: 0.14, waveform: 'triangle' },
  win: { frequencies: [523, 659, 784, 1047, 1319], stepSec: 0.065, durationSec: 0.45, volume: 0.14, waveform: 'triangle' },
  lose: { frequencies: [440, 349, 294], stepSec: 0.065, durationSec: 0.18, volume: 0.14, waveform: 'triangle' },
  wrong: { frequencies: [185, 165], stepSec: 0.065, durationSec: 0.18, volume: 0.14, waveform: 'sine' },
  shuffle: { frequencies: [392, 494, 587], stepSec: 0.065, durationSec: 0.18, volume: 0.14, waveform: 'triangle' },
  purchase: { frequencies: [784, 988, 1175], stepSec: 0.065, durationSec: 0.18, volume: 0.14, waveform: 'triangle' },

  // Expanded Onet & Match 3 SFX patterns
  select: { frequencies: [523, 659], stepSec: 0.04, durationSec: 0.065, volume: 0.08, waveform: 'triangle' },
  swap: { frequencies: [392, 523], stepSec: 0.045, durationSec: 0.085, volume: 0.1, waveform: 'sine' },
  invalid: { frequencies: [185, 165], stepSec: 0.065, durationSec: 0.18, volume: 0.14, waveform: 'sine' },
  error: { frequencies: [185, 165], stepSec: 0.065, durationSec: 0.18, volume: 0.14, waveform: 'sine' },
  cascade_2: { frequencies: [740, 988], stepSec: 0.06, durationSec: 0.18, volume: 0.15, waveform: 'triangle' },
  cascade_3: { frequencies: [831, 1109], stepSec: 0.055, durationSec: 0.19, volume: 0.16, waveform: 'triangle' },
  cascade_4plus: { frequencies: [880, 1175, 1480], stepSec: 0.05, durationSec: 0.21, volume: 0.17, waveform: 'triangle' },
  special_spawn: { frequencies: [587, 880, 1175, 1760], stepSec: 0.045, durationSec: 0.22, volume: 0.15, waveform: 'triangle' },
  line_blast: {
    frequencies: [1319, 988, 659, 440, 880, 1319],
    stepSec: 0.03,
    durationSec: 0.24,
    volume: 0.12,
    waveform: 'sawtooth',
    lowpassHz: 1800,
  },
  bomb_blast: { frequencies: [147, 110, 82, 523, 784], stepSec: 0.04, durationSec: 0.28, volume: 0.18, waveform: 'triangle' },
  rainbow_zap: {
    frequencies: [523, 659, 784, 988, 1175, 1319, 1568],
    stepSec: 0.035,
    durationSec: 0.26,
    volume: 0.16,
    waveform: 'triangle',
  },
  hint: { frequencies: [784, 1047], stepSec: 0.07, durationSec: 0.16, volume: 0.12, waveform: 'sine' },
  uiReward: { frequencies: [523, 659, 784, 1047], stepSec: 0.055, durationSec: 0.24, volume: 0.14, waveform: 'triangle' },
  uiMatch: { frequencies: [659, 880], stepSec: 0.065, durationSec: 0.18, volume: 0.14, waveform: 'triangle' },
};

export const ONET_TIMINGS = {
  tapBounceMs: 140,
  ringADrawMs: 90,
  lineTravelDelayMs: 80,
  lineTravelMs: 170,
  ringBDelayMs: 250,
  ringBDrawMs: 90,
  fadeOutDelayMs: 340,
  fadeOutMs: 180,
  tilePopDelayMs: 300,
  tilePopMs: 200,
  splitDelayMs: 260,
  splitDurationMs: 240,
  burstDelayMs: 280,
  burstDurationMs: 460,
  totalMatchLockMs: 500,
  errorShakeMs: 400,
  comboBannerMs: 550,
  shufflePreDelayMs: 350,
  shuffleMs: 420,
  comboWindowMs: 4000,
  lineEase: [0.22, 1, 0.36, 1] as const,
  shuffleEase: [0.34, 1.56, 0.64, 1] as const,
} as const;

export const MATCH3_TIMINGS = {
  selectBounceMs: 120,
  swapSpringMs: 180,
  invalidSwapMs: 320,
  invalidSwapOutMs: 140,
  invalidSwapBackMs: 140,
  invalidSwapSettleMs: 40,
  matchPopMs: 220,
  specialMergeMs: 260,
  specialMergeSlideMs: 160,
  specialSpawnBounceMs: 100,
  cascadeOverlapDelayMs: 40,
  dropBaseFactorMs: 95,
  dropMinMs: 110,
  dropMaxMs: 310,
  columnStaggerMs: 12,
  landingSquashMs: 70,
  reEvalPauseMs: 60,
  lineBlastMs: 280,
  lineBlastStaggerMs: 22,
  bombBlastMs: 340,
  bombShakeMs: 140,
  rainbowZapMs: 520,
  rainbowBeamStaggerMs: 25,
  specialComboMs: 450,
  swapSpring: { type: 'spring', stiffness: 380, damping: 26, mass: 0.8 } as const,
  selectSpring: { type: 'spring', stiffness: 450, damping: 22 } as const,
  dropEase: [0.45, 0, 0.85, 0.35] as const,
  popEase: [0.34, 1.56, 0.64, 1] as const,
} as const;

export function computeMatch3DropDurationMs(dropCells: number): number {
  if (dropCells <= 0) return MATCH3_TIMINGS.dropMinMs;
  const raw = Math.round(Math.sqrt(dropCells) * MATCH3_TIMINGS.dropBaseFactorMs);
  return Math.max(MATCH3_TIMINGS.dropMinMs, Math.min(MATCH3_TIMINGS.dropMaxMs, raw));
}

export const HAPTIC_CONFIG = {
  throttleMs: 35,
  intensityScale: {
    light: 0.7,
    medium: 1.0,
    strong: 1.35,
  } as Record<HapticIntensity, number>,
  webPatterns: {
    uiTap: 6,
    tileSelect: 8,
    matchClear: 16,
    comboOrSpecial: [18, 35, 28],
    invalidMove: [30, 45, 35],
    levelVictory: [20, 40, 20, 40, 50],
  } as Record<HapticPatternKey, number | number[]>,
} as const;
