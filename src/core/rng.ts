// A small seeded random number generator (mulberry32). The same seed gives the same questions,
// which makes generators testable and bugs reproducible (docs/ARCHITECTURE.md §4.2).
// Learning Core: no UI, worlds, sounds or animations here.

export interface Rng {
  /** A float in [0, 1). */
  next(): number;
  /** An integer in [min, max], both included. */
  int(min: number, max: number): number;
  /** One item of a non-empty list. */
  pick<T>(items: readonly T[]): T;
  /** A shuffled copy. */
  shuffle<T>(items: readonly T[]): T[];
  /** The seed this generator started from. */
  readonly seed: number;
}

export function createRng(seed: number = Date.now()): Rng {
  const start = seed >>> 0;
  let a = start;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) throw new Error(`rng.int: bad range ${min}..${max}`);
    return min + Math.floor(next() * (max - min + 1));
  };
  return {
    seed: start,
    next,
    int,
    pick: (items) => {
      if (items.length === 0) throw new Error('rng.pick: empty list');
      return items[int(0, items.length - 1)];
    },
    shuffle: (items) => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }
  };
}
