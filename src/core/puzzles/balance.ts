// The balance (phase 9): weights on two pans and a box of unknown weight. Level 1: one box and a
// weight on the left, two weights on the right ("? + 7 = 5 + 9"); level 2: two equal boxes and a
// weight ("2 × ? + 4 = 18"). Four weights to try in the box – exactly one makes it balance.
import { createRng } from '../rng';
import type { BalancePuzzle } from './types';

/** Left minus right with `w` in every box: 0 = balanced, < 0 = the right pan is heavier. */
export function balanceDiff(p: Pick<BalancePuzzle, 'left' | 'right' | 'boxes'>, w: number): number {
  const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0);
  return sum(p.left) + p.boxes * w - sum(p.right);
}

export function makeBalance(level: number, seed: number): BalancePuzzle {
  const rng = createRng(seed);
  for (;;) {
    const boxes = level >= 2 ? 2 : 1;
    const answer = rng.int(2, level >= 2 ? 12 : 15);
    const a = rng.int(1, 10);
    const total = a + boxes * answer;
    const b = rng.int(1, total - 1);
    const right = level >= 2 ? [total] : [b, total - b];
    if (right.some((x) => x < 1 || x > 30)) continue;
    // Near weights to try (one too heavy, one too light…), all different.
    const tries = new Set<number>([answer]);
    for (const w of rng.shuffle([answer + 1, answer - 1, answer + 2, answer - 2, answer + 3, total - a, a])) if (tries.size < 4 && w >= 1 && w <= 30) tries.add(w);
    const p: BalancePuzzle = { kind: 'balance', left: [a], right, boxes, answer, tray: rng.shuffle([...tries]) };
    if (p.tray.length === 4 && p.tray.filter((w) => balanceDiff(p, w) === 0).length === 1) return p;
  }
}
