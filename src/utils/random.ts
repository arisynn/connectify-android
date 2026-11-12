/**
 * Deterministic PRNG & pure array randomization utilities.
 * Owned by @architect. Used across Onet, Match 3, PCG, and Daily Challenges.
 */

export type RngFn = () => number;

/**
 * Computes a deterministic unsigned 32-bit FNV-1a hash from an arbitrary string seed.
 */
export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Mulberry32 deterministic 32-bit PRNG returning floats in [0, 1).
 */
export function mulberry32(initialSeed: number): RngFn {
  let state = initialSeed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates a deterministic PRNG function from either a string or numeric seed.
 */
export function seededRandom(seed: string | number): RngFn {
  const numericSeed = typeof seed === 'number' ? seed >>> 0 : hashSeed(String(seed));
  return mulberry32(numericSeed);
}

/**
 * Pure non-mutating Fisher-Yates shuffle.
 */
export function shuffleArray<T>(items: readonly T[], rng: RngFn = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * Returns a deterministic integer in [min, maxInclusive].
 */
export function randomInt(min: number, maxInclusive: number, rng: RngFn = Math.random): number {
  const lo = Math.ceil(min);
  const hi = Math.floor(maxInclusive);
  if (hi <= lo) return lo;
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/**
 * Picks a random element from a non-empty array.
 */
export function pickRandom<T>(items: readonly T[], rng: RngFn = Math.random): T {
  if (items.length === 0) {
    throw new Error('Cannot pick random element from an empty array');
  }
  return items[Math.floor(rng() * items.length)];
}
