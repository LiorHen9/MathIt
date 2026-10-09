// The missing number (phase 9): an exercise with one number missing. Level 1 adding and taking
// away ("? + 17 = 42", "56 − ? = 19"); level 2 times and division ("? × 6 = 42", "36 : ? = 4");
// level 3 two steps ("(? + 4) × 3 = 21"). The number is typed; every puzzle has exactly one
// answer from 0 to 1,000 (checked by trying them all).
import { createRng } from '../rng';
import type { MissingPuzzle } from './types';

/** The value of an exercise's left side with `x` in the gap (NaN when a division leaves a remainder). */
export function evalMissing(math: string, x: number): number {
  const tokens = math.split(' = ')[0].replace('?', String(x)).match(/\d+|[+−×:()]/g) ?? [];
  let at = 0;
  // A tiny parser: sums of products, products of numbers or brackets.
  const atom = (): number => {
    const t = tokens[at++];
    if (t === '(') {
      const v = sum();
      at++;
      return v;
    }
    return Number(t);
  };
  const product = (): number => {
    let v = atom();
    while (tokens[at] === '×' || tokens[at] === ':') {
      const op = tokens[at++];
      const r = atom();
      v = op === '×' ? v * r : r !== 0 && v % r === 0 ? v / r : NaN;
    }
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (tokens[at] === '+' || tokens[at] === '−') {
      const op = tokens[at++];
      const r = product();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  return sum();
}

/** The answers from 0 to 1,000 that make the exercise true. */
export function missingSolutions(math: string): number[] {
  const right = Number(math.split(' = ')[1]);
  const out: number[] = [];
  for (let x = 0; x <= 1000; x++) if (evalMissing(math, x) === right) out.push(x);
  return out;
}

export function makeMissing(level: number, seed: number): MissingPuzzle {
  const rng = createRng(seed);
  for (;;) {
    let p: MissingPuzzle;
    if (level <= 1) {
      const a = rng.int(5, 60);
      const b = rng.int(5, 40);
      const k = rng.int(0, 2);
      p =
        k === 0
          ? { kind: 'missing', math: `? + ${b} = ${a + b}`, answer: a, undo: `מה ועוד ${b} נותן ${a + b}? מחסרים: ${a + b} − ${b}.` }
          : k === 1
            ? { kind: 'missing', math: `${a + b} − ? = ${a}`, answer: b, undo: `כמה מורידים מ-${a + b} כדי שיישאר ${a}? ${a + b} − ${a}.` }
            : { kind: 'missing', math: `? − ${b} = ${a}`, answer: a + b, undo: `החיסור הפוך מחיבור: ${a} + ${b}.` };
    } else if (level === 2) {
      const a = rng.int(2, 10);
      const b = rng.int(2, 10);
      const k = rng.int(0, 2);
      p =
        k === 0
          ? { kind: 'missing', math: `? × ${b} = ${a * b}`, answer: a, undo: `כמה פעמים ${b} זה ${a * b}? מחלקים: ${a * b} : ${b}.` }
          : k === 1
            ? { kind: 'missing', math: `${a * b} : ? = ${a}`, answer: b, undo: `לכמה קבוצות מחלקים ${a * b} כדי שבכל אחת ${a}? ${a * b} : ${a}.` }
            : { kind: 'missing', math: `? : ${b} = ${a}`, answer: a * b, undo: `החילוק הפוך מכפל: ${a} × ${b}.` };
    } else {
      const x = rng.int(1, 9);
      const a = rng.int(1, 9);
      const m = rng.int(2, 5);
      p =
        rng.next() < 0.5
          ? { kind: 'missing', math: `(? + ${a}) × ${m} = ${(x + a) * m}`, answer: x, undo: `הולכים אחורה: קודם ${(x + a) * m} : ${m}, ואז מורידים ${a}.` }
          : { kind: 'missing', math: `? × ${m} + ${a} = ${x * m + a}`, answer: x, undo: `הולכים אחורה: קודם מורידים ${a}, ואז מחלקים ב-${m}.` };
    }
    const sols = missingSolutions(p.math);
    if (sols.length === 1 && sols[0] === p.answer) return p;
  }
}
