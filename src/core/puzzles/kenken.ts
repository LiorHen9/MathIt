// A small KenKen (phase 9): a 4×4 grid, 1–4 once in every row and every column, and the cells of
// each cage (thick lines) make its number – level 1 by adding, level 2 by adding, taking away and
// multiplying. Made from a seed: a Latin square (rows, columns and numbers shuffled), cages of one
// to three cells grown at random, then a solver checks it has exactly one solution – givens are
// added until it does.
import { createRng, type Rng } from '../rng';
import type { Cage, KenKenOp, KenKenPuzzle } from './types';

const N = 4;
const rowOf = (i: number) => Math.floor(i / N);
const colOf = (i: number) => i % N;

/** What the numbers of a cage make with its op (NaN when they do not make one). */
export function cageValue(op: KenKenOp, xs: number[]): number {
  if (op === '' || op === '+') return xs.reduce((s, x) => s + x, 0);
  if (op === '×') return xs.reduce((s, x) => s * x, 1);
  const [a, b] = [Math.max(...xs), Math.min(...xs)];
  if (xs.length !== 2) return NaN;
  return op === '−' ? a - b : a % b === 0 ? a / b : NaN;
}

/** Is a full grid right: every row and column 1–4 once, every cage on target. */
export function kenkenOk(cages: readonly Cage[], g: readonly number[]): boolean {
  for (let k = 0; k < N; k++) {
    const row = new Set(g.slice(k * N, k * N + N));
    const col = new Set([0, 1, 2, 3].map((r) => g[r * N + k]));
    if (row.size !== N || col.size !== N || [...row].some((x) => x < 1 || x > N)) return false;
  }
  return cages.every((c) => cageValue(c.op, c.cells.map((i) => g[i])) === c.target);
}

/** How many solutions (stops counting at `max`). */
export function kenkenSolutions(cages: readonly Cage[], givens: Readonly<Record<number, number>> = {}, max = 2): number {
  const g = new Array<number>(N * N).fill(0);
  const cageOf = new Array<Cage>(N * N);
  for (const c of cages) for (const i of c.cells) cageOf[i] = c;
  let count = 0;
  const fits = (i: number, v: number) => {
    for (let k = 0; k < N; k++) {
      if (g[rowOf(i) * N + k] === v || g[k * N + colOf(i)] === v) return false;
    }
    const c = cageOf[i];
    const xs = c.cells.map((j) => (j === i ? v : g[j]));
    if (xs.every((x) => x > 0)) return cageValue(c.op, xs) === c.target;
    // Partial cages: adding and multiplying must not go over.
    const known = xs.filter((x) => x > 0);
    if (c.op === '+') return known.reduce((s, x) => s + x, 0) < c.target;
    if (c.op === '×') return c.target % known.reduce((s, x) => s * x, 1) === 0;
    return true;
  };
  const go = (i: number): void => {
    if (count >= max) return;
    if (i === N * N) {
      count++;
      return;
    }
    if (givens[i]) {
      if (!fits(i, givens[i])) return;
      g[i] = givens[i];
      go(i + 1);
      g[i] = 0;
      return;
    }
    for (let v = 1; v <= N; v++) {
      if (!fits(i, v)) continue;
      g[i] = v;
      go(i + 1);
      g[i] = 0;
    }
  };
  go(0);
  return count;
}

function latin(rng: Rng): number[] {
  const rows = rng.shuffle([0, 1, 2, 3]);
  const cols = rng.shuffle([0, 1, 2, 3]);
  const syms = rng.shuffle([1, 2, 3, 4]);
  return Array.from({ length: N * N }, (_, i) => syms[(rows[rowOf(i)] + cols[colOf(i)]) % N]);
}

function cagesFor(sol: number[], level: number, rng: Rng): Cage[] {
  const owner = new Array<number>(N * N).fill(-1);
  const groups: number[][] = [];
  for (const start of rng.shuffle(Array.from({ length: N * N }, (_, i) => i))) {
    if (owner[start] >= 0) continue;
    const want = rng.pick(level >= 2 ? [1, 2, 2, 3] : [2, 2, 3, 1]);
    const cells = [start];
    owner[start] = groups.length;
    while (cells.length < want) {
      const next = rng.shuffle(cells.flatMap((c) => [c - N, c + N, colOf(c) > 0 ? c - 1 : -1, colOf(c) < N - 1 ? c + 1 : -1]).filter((j) => j >= 0 && j < N * N && owner[j] < 0));
      if (!next.length) break;
      owner[next[0]] = groups.length;
      cells.push(next[0]);
    }
    groups.push(cells.sort((a, b) => a - b));
  }
  return groups.map((cells) => {
    const xs = cells.map((i) => sol[i]);
    if (cells.length === 1) return { cells, op: '', target: xs[0] };
    let op: KenKenOp = '+';
    if (level >= 2) {
      const opts: KenKenOp[] = ['+', '×'];
      if (cells.length === 2) opts.push('−');
      if (cells.length === 2 && Math.max(...xs) % Math.min(...xs) === 0) opts.push(':');
      op = rng.pick(opts);
    }
    return { cells, op, target: cageValue(op, xs) };
  });
}

export function makeKenKen(level: number, seed: number): KenKenPuzzle {
  const rng = createRng(seed);
  for (let tries = 0; ; tries++) {
    const solution = latin(rng);
    const cages = cagesFor(solution, level, rng);
    // Givens until there is one solution (level 1 starts with two, to get going).
    const givens: number[] = level >= 2 ? [] : rng.shuffle(Array.from({ length: N * N }, (_, i) => i)).slice(0, 2);
    const known = () => Object.fromEntries(givens.map((i) => [i, solution[i]]));
    let n = kenkenSolutions(cages, known());
    const pool = rng.shuffle(Array.from({ length: N * N }, (_, i) => i).filter((i) => !givens.includes(i)));
    while (n > 1 && givens.length < 6 && pool.length) {
      givens.push(pool.shift()!);
      n = kenkenSolutions(cages, known());
    }
    if (n === 1) return { kind: 'kenken', size: 4, cages, solution, givens: givens.sort((a, b) => a - b) };
  }
}
