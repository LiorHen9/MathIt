// col.add / col.sub (phase 9): adding and taking away in columns ("במאונך"). Level 1 three-digit
// numbers without carrying (or borrowing); level 2 with it, up to 1,000; level 3 four digits, up to
// 10,000. The question card writes the numbers one under the other (Visual 'column').
// Smart wrong answers: 'no-carry' (each column on its own, the tens never carried), 'no-borrow'
// (the smaller digit taken from the bigger in every column), 'misaligned' (a shorter number moved
// one place: 345 + 27 → 615), 'added' (adding instead of taking away), ten / a hundred off.
// The explanation fills the columns from the ones; a carried ten flies to the next column, a
// borrowed one comes back from it.
import type { Action, ErrorTag, Generator, Hint } from '../types';
import { numberDistractors } from './common';

type Q = ReturnType<Generator>;
type Lv = Parameters<Generator>[0];
type R = Parameters<Generator>[1];

/** The digits of a number, ones first. */
export const placeDigits = (n: number, len = 4): number[] => Array.from({ length: len }, (_, i) => Math.floor(n / 10 ** i) % 10);

/** Column by column without carrying (each column's sum kept to one digit). */
export function noCarry(a: number, b: number): number {
  const A = placeDigits(a);
  const B = placeDigits(b);
  return A.reduce((s, d, i) => s + ((d + B[i]) % 10) * 10 ** i, 0);
}

/** Column by column, the smaller digit from the bigger (no borrowing). */
export function noBorrow(a: number, b: number): number {
  const A = placeDigits(a);
  const B = placeDigits(b);
  return A.reduce((s, d, i) => s + Math.abs(d - B[i]) * 10 ** i, 0);
}

/** How many columns carry (adding) or borrow (taking away). */
export function regroups(a: number, b: number, op: '+' | '-'): number {
  const A = placeDigits(a);
  const B = placeDigits(b);
  let n = 0;
  let c = 0;
  for (let i = 0; i < 4; i++) {
    const v = op === '+' ? A[i] + B[i] + c : A[i] - B[i] - c;
    c = op === '+' ? (v >= 10 ? 1 : 0) : v < 0 ? 1 : 0;
    n += c;
  }
  return n;
}

export function columnQuestion(a: number, b: number, op: '+' | '-', level: Lv, rng: R): Q {
  const plus = op === '+';
  const answer = plus ? a + b : a - b;
  const sym = plus ? '+' : '−';
  const smart: [number, ErrorTag][] = [];
  const re = regroups(a, b, op);
  if (re) smart.push(plus ? [noCarry(a, b), 'no-carry'] : [noBorrow(a, b), 'no-borrow']);
  // A shorter number written one place off.
  if (String(b).length < String(a).length) smart.push([plus ? a + b * 10 : a - b * 10, 'misaligned']);
  if (!plus) smart.push([a + b, 'added']);
  smart.push([answer + 10, 'near'], [answer - 10, 'near'], [answer + 100, 'near'], [answer - 100, 'near'], [answer + 1, 'count-off-by-one'], [answer - 1, 'count-off-by-one']);
  const { distractors, errorTags } = numberDistractors(answer, smart, level, rng);
  const col: Action = { kind: 'column', a, b, op };
  const hints: Hint[] = [
    { text: plus ? 'מחברים טור-טור, מתחילים מהאחדות.' : 'מחסרים טור-טור, מתחילים מהאחדות.', action: col },
    { for: ['near', 'count-off-by-one'], text: 'בודקים כל טור שוב, מימין לשמאל.', action: col },
    { for: ['misaligned'], text: 'אחדות מתחת לאחדות, עשרות מתחת לעשרות.', action: col }
  ];
  if (re && plus) hints.push({ for: ['no-carry'], text: 'כשטור יוצא 10 או יותר, עשר עובר לטור הבא.', action: col });
  if (re && !plus) hints.push({ for: ['no-borrow'], text: 'כשאין מספיק בטור, פורטים אחד מהטור שמשמאל.', action: col });
  if (!plus) hints.push({ for: ['added'], text: 'זה חיסור: מורידים, ונשאר פחות.', action: col });
  return {
    prompt: {
      text: plus ? 'מחברים במאונך.' : 'מחסרים במאונך.',
      math: `${a} ${sym} ${b} = ?`,
      visual: { kind: 'column', rows: [a, b], op: plus ? '+' : '−' },
      speech: `כמה זה ${a} ${sym} ${b}?`
    },
    answer,
    distractors,
    errorTags,
    hints,
    explanation: [
      { text: 'כותבים אחד מתחת לשני: אחדות מתחת לאחדות.', action: col },
      {
        text: re ? (plus ? 'כל עשר שיוצא בטור עובר לטור הבא.' : 'כשאין מספיק, פורטים מהטור הבא.') : 'כל טור לבד, מימין לשמאל.',
        math: `${a} ${sym} ${b} = ${answer}`
      }
    ],
    numeric: true,
    key: `col:${a}${plus ? '+' : '-'}${b}`
  };
}

function pick(level: Lv, rng: R, op: '+' | '-'): [number, number] {
  const big = level.level === 3;
  for (;;) {
    const lo = big ? 1000 : 100;
    const hi = big ? 9999 : 999;
    let a = rng.int(lo, hi);
    // Sometimes the second number is shorter (a place to line up).
    let b = rng.next() < 0.25 ? rng.int(big ? 100 : 10, big ? 999 : 99) : rng.int(lo, hi);
    if (op === '-' && b > a) [a, b] = [b, a];
    const res = op === '+' ? a + b : a - b;
    if (res > level.max || res < 1 || a === b) continue;
    const re = regroups(a, b, op);
    if (level.level === 1 && re) continue;
    if (level.level >= 2 && !re) continue;
    return [a, b];
  }
}

export const colAdd: Generator = (level, rng) => {
  const [a, b] = pick(level, rng, '+');
  return columnQuestion(a, b, '+', level, rng);
};

export const colSub: Generator = (level, rng) => {
  const [a, b] = pick(level, rng, '-');
  return columnQuestion(a, b, '-', level, rng);
};
