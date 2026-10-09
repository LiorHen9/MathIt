// The magic square (phase 9): the classic 3×3 square of 1–9 (every line 15), turned or mirrored,
// shifted (level 1: + k) or scaled (level 2: × m + k), with numbers taken out until it still has
// exactly one way to put them back (checked over every order of the missing numbers).
import { createRng } from '../rng';
import type { MagicPuzzle } from './types';

const LO_SHU = [2, 7, 6, 9, 5, 1, 4, 3, 8];
export const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

/** Turn the square a quarter round. */
const turn = (g: number[]) => [g[6], g[3], g[0], g[7], g[4], g[1], g[8], g[5], g[2]];
const mirror = (g: number[]) => [g[2], g[1], g[0], g[5], g[4], g[3], g[8], g[7], g[6]];

/** Does every line of a full square add up to the target? */
export function isMagic(g: readonly number[], target: number): boolean {
  return LINES.every((l) => l.reduce((s, i) => s + g[i], 0) === target);
}

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/** The ways to put the missing numbers back so the square works (1 = a good puzzle). */
export function magicSolutions(cells: readonly (number | null)[], tray: readonly number[], target: number): number {
  const holes = cells.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  let n = 0;
  const seen = new Set<string>();
  for (const p of permutations([...tray])) {
    const key = p.join();
    if (seen.has(key)) continue;
    seen.add(key);
    const g = cells.map((c) => c ?? 0);
    holes.forEach((h, k) => (g[h] = p[k]));
    if (isMagic(g, target)) n++;
  }
  return n;
}

export function makeMagic(level: number, seed: number): MagicPuzzle {
  const rng = createRng(seed);
  let g = LO_SHU.slice();
  for (let t = rng.int(0, 3); t > 0; t--) g = turn(g);
  if (rng.next() < 0.5) g = mirror(g);
  const m = level >= 2 ? rng.pick([2, 3, 5, 10]) : 1;
  const k = rng.int(0, level >= 2 ? 4 : 6);
  const solution = g.map((x) => x * m + k);
  const target = 15 * m + 3 * k;
  const holes = level >= 2 ? 5 : 3;
  for (;;) {
    const out = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, holes);
    const cells = solution.map((x, i) => (out.includes(i) ? null : x));
    const tray = rng.shuffle(out.map((i) => solution[i]));
    if (magicSolutions(cells, tray, target) === 1) return { kind: 'magic', target, cells, solution, tray };
  }
}
