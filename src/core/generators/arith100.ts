// add.within100 / sub.within100 (phase 7). Level 1 whole tens (30 + 40, 47 + 20, 70 − 30);
// level 2 two-digit numbers without carrying or borrowing (34 + 25, 58 − 23); level 3 with them
// (38 + 25, 52 − 17).
// Smart wrong answers: 'no-carry' (38 + 25 → 53: ten ones never became a ten), 'no-borrow'
// (52 − 17 → 45: the small ones taken from the big ones), 'tens-as-ones' (30 + 40 → 7),
// 'swapped-digits', one off, ten off, adding instead of taking away.
// The explanation is tens rods and ones cubes: ten loose cubes snap into a rod, and a rod breaks
// into ten cubes when there are not enough ones. The number line hint hops by tens, then ones.
import type { Action, ErrorTag, Generator, Hint } from '../types';
import { digits, hopsFor, numberDistractors } from './common';

type Q = ReturnType<Generator>;
type Lv = Parameters<Generator>[0];
type R = Parameters<Generator>[1];

const blocks = (n: number) => ({ kind: 'tens' as const, tens: digits(n).t, ones: digits(n).o });
const said = (n: number) => {
  const { t, o } = digits(n);
  return o ? `${n} זה ${t === 1 ? 'עשרת אחת' : `${t} עשרות`} ו${o === 1 ? 'אחדת אחת' : `-${o} אחדות`}.` : `${n} זה ${t === 1 ? 'עשרת אחת' : `${t} עשרות`}.`;
};

export function add100Question(a: number, b: number, level: Lv, rng: R): Q {
  const sum = a + b;
  const A = digits(a);
  const B = digits(b);
  const carry = A.o + B.o >= 10;
  const S = digits(sum);
  const smart: [number, ErrorTag][] = [];
  if (carry) smart.push([(A.t + B.t) * 10 + ((A.o + B.o) % 10), 'no-carry']);
  if (!A.o && !B.o) smart.push([A.t + B.t, 'tens-as-ones']);
  if (S.o && S.o !== S.t && sum < 100) smart.push([S.o * 10 + S.t, 'swapped-digits']);
  smart.push([sum + 1, 'count-off-by-one'], [sum - 1, 'count-off-by-one'], [sum + 10, 'near'], [sum - 10, 'near']);
  const { distractors, errorTags } = numberDistractors(sum, smart, level, rng);
  const main: Action = { kind: 'tens', tens: A.t, ones: A.o, add: b };
  const hops: Action = { kind: 'line', from: a, hops: hopsFor(a, b), max: 100 };
  const hints: Hint[] = [
    { text: 'מחברים עשרות לעשרות ואחדות לאחדות.', action: main },
    { for: ['count-off-by-one', 'near'], text: `מ-${a} קופצים קודם בעשרות ואז באחדות.`, action: hops },
    { for: ['swapped-digits'], text: 'העשרות נכתבות משמאל והאחדות מימין.', action: main }
  ];
  if (carry) hints.push({ for: ['no-carry'], text: `${A.o} ועוד ${B.o} אחדות זה יותר מ-10: עשר קוביות הופכות למוט.`, action: main });
  if (!A.o && !B.o) hints.push({ for: ['tens-as-ones'], text: `${A.t} עשרות ועוד ${B.t} עשרות הן ${A.t + B.t} עשרות: ${sum}.`, action: main });
  return {
    prompt: { text: 'כמה זה?', math: `${a} + ${b} = ?`, speech: `כמה זה ${a} + ${b}?` },
    answer: sum,
    distractors,
    errorTags,
    hints,
    explanation: [
      { text: said(a), action: blocks(a) },
      { text: carry ? `מוסיפים ${b}: עשר קוביות נצמדות למוט חדש.` : `מוסיפים ${b}: מוטות למוטות וקוביות לקוביות.`, action: main },
      { text: `יוצא ${sum}.`, math: `${a} + ${b} = ${sum}` }
    ],
    numeric: true,
    key: `${a}+${b}`
  };
}

export function sub100Question(a: number, b: number, level: Lv, rng: R): Q {
  const diff = a - b;
  const A = digits(a);
  const B = digits(b);
  const borrow = B.o > A.o;
  const smart: [number, ErrorTag][] = [];
  if (borrow) smart.push([(A.t - B.t) * 10 + (B.o - A.o), 'no-borrow']);
  if (!A.o && !B.o) smart.push([A.t - B.t, 'tens-as-ones']);
  smart.push([diff + 1, 'count-off-by-one'], [diff - 1, 'count-off-by-one'], [a + b, 'added'], [diff + 10, 'near'], [diff - 10, 'near']);
  const { distractors, errorTags } = numberDistractors(diff, smart, level, rng);
  const main: Action = { kind: 'tens', tens: A.t, ones: A.o, take: b };
  const hops: Action = { kind: 'line', from: a, hops: hopsFor(a, -b), max: 100 };
  const hints: Hint[] = [
    { text: 'מורידים עשרות מהעשרות ואחדות מהאחדות.', action: main },
    { for: ['count-off-by-one', 'near'], text: `מ-${a} קופצים אחורה קודם בעשרות ואז באחדות.`, action: hops },
    { for: ['added'], text: 'בחיסור מורידים, ונשארים פחות.', action: main }
  ];
  if (borrow) hints.push({ for: ['no-borrow'], text: `אין מספיק אחדות להוריד ${B.o}: פורטים מוט ל-10 קוביות.`, action: main });
  if (!A.o && !B.o) hints.push({ for: ['tens-as-ones'], text: `${A.t} עשרות פחות ${B.t} עשרות הן ${A.t - B.t} עשרות: ${diff}.`, action: main });
  return {
    prompt: { text: 'כמה זה?', math: `${a} − ${b} = ?`, speech: `כמה זה ${a} − ${b}?` },
    answer: diff,
    distractors,
    errorTags,
    hints,
    explanation: [
      { text: said(a), action: blocks(a) },
      { text: borrow ? `מורידים ${b}: אין מספיק קוביות, אז מוט אחד נפרט ל-10.` : `מורידים ${b}: מוטות ממוטות וקוביות מקוביות.`, action: main },
      { text: `נשארו ${diff}.`, math: `${a} − ${b} = ${diff}` }
    ],
    numeric: true,
    key: `${a}-${b}`
  };
}

export const add100: Generator = (level, rng) => {
  if (level.level === 1) {
    // Tens and tens, or a number and some tens.
    const b = rng.int(1, 8) * 10;
    const a = rng.next() < 0.5 ? rng.int(1, (100 - b) / 10) * 10 : rng.int(11, 99 - b);
    return add100Question(a, b, level, rng);
  }
  for (;;) {
    const a = rng.int(11, 89);
    const b = rng.next() < 0.25 ? rng.int(2, 9) : rng.int(11, 89);
    const carry = (a % 10) + (b % 10) >= 10;
    if (a + b > level.max || carry !== (level.level === 3)) continue;
    // Both orders happen, the bigger first more often.
    return rng.next() < 0.7 || b < 10 ? add100Question(Math.max(a, b), Math.min(a, b), level, rng) : add100Question(a, b, level, rng);
  }
};

export const sub100: Generator = (level, rng) => {
  if (level.level === 1) {
    const b = rng.int(1, 8) * 10;
    const a = rng.next() < 0.5 ? rng.int(b / 10 + 1, 10) * 10 : rng.int(b + 1, 99);
    return sub100Question(a, b, level, rng);
  }
  for (;;) {
    const a = rng.int(21, level.max);
    const b = rng.next() < 0.25 ? rng.int(2, 9) : rng.int(11, a - 1);
    const borrow = b % 10 > a % 10;
    if (b >= a || borrow !== (level.level === 3) || a - b < 1) continue;
    return sub100Question(a, b, level, rng);
  }
};
