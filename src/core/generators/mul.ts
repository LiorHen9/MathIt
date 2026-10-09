// mul.table / mul.big (phase 9). The times table by columns: level 1 times 2, 5 and 10; level 2
// times 3 and 4; level 3 times 6–9 (the hard column, with the others mixed in now and then).
// A two-digit number times a one-digit one: level 1 whole tens (40 × 6), level 2 without carrying
// (23 × 3), level 3 with it (47 × 6).
// Smart wrong answers: 'times-as-plus' (3 × 4 → 7), 'table-neighbor' (one group too many or too
// few: 3 × 4 → 8, 16), one off; for big numbers 'no-carry' (47 × 6 → 242: the carried tens
// dropped), 'one-part' (only the tens multiplied) and 'tens-as-ones'.
// The explanation is an array that grows row by row – adding again and again – and turns round
// (3 × 4 = 4 × 3); big numbers are split into tens and ones and the two parts added in columns.
// Asked another way: in the Pattern game as the column's sequence (3, 6, 9, 12, ?), in the speed
// game as it is.
import type { Action, ErrorTag, Generator, Hint } from '../types';
import { numberDistractors } from './common';

type Q = ReturnType<Generator>;
type Lv = Parameters<Generator>[0];
type R = Parameters<Generator>[1];

/** The columns of the table each level practises. */
export const TABLE_COLUMNS: Record<number, number[]> = { 1: [2, 5, 10], 2: [3, 4], 3: [6, 7, 8, 9] };

/** "3, 6, 9, 12, ?": the sequence of `b`'s column up to `a` × `b`, with the gap at the end (five numbers at most). */
export function tableSequence(a: number, b: number): string {
  const len = Math.max(4, Math.min(a, 5));
  const first = Math.max(1, a - len + 1);
  const terms: string[] = [];
  for (let k = first; k < first + len; k++) terms.push(k === a ? '?' : String(k * b));
  return terms.join(', ');
}

/** `a` × `b`: `a` groups (rows) of `b`. */
export function mulQuestion(a: number, b: number, level: Lv, rng: R): Q {
  const p = a * b;
  const smart: [number, ErrorTag][] = [
    [a + b, 'times-as-plus'],
    [p + b, 'table-neighbor'],
    [p - b, 'table-neighbor'],
    [p + a, 'table-neighbor'],
    [p - a, 'table-neighbor'],
    [p + 1, 'count-off-by-one'],
    [p - 1, 'count-off-by-one']
  ];
  const { distractors, errorTags } = numberDistractors(p, smart, level, rng);
  const array: Action = { kind: 'array', rows: a, cols: b };
  const line: Action = { kind: 'line', from: 0, hops: Array.from({ length: a }, () => b), max: 100 };
  const adds = Array.from({ length: Math.min(a, 4) }, () => b).join(' + ') + (a > 4 ? ' …' : '');
  const hints: Hint[] = [
    { text: `${a} שורות, ובכל שורה ${b}.`, action: array },
    { for: ['times-as-plus'], text: `כפל זה חיבור שחוזר על עצמו: \u2066${adds}\u2069.`, action: array },
    { for: ['table-neighbor', 'count-off-by-one', 'near'], text: `סופרים בקפיצות של ${b}, בדיוק ${a === 1 ? 'קפיצה אחת' : `${a} קפיצות`}.`, action: p <= 100 && b <= 10 ? line : array }
  ];
  const turn = a !== b;
  return {
    prompt: { text: 'כמה זה?', math: `${a} × ${b} = ?`, speech: `כמה זה ${a} × ${b}?` },
    answer: p,
    distractors,
    errorTags,
    hints,
    explanation: [
      { text: `${a} × ${b} זה ${a === 1 ? 'שורה אחת' : `${a} שורות`} של ${b}.`, action: { kind: 'array', rows: a, cols: b } },
      turn
        ? { text: `מסובבים: ${b} שורות של ${a} – אותו מספר!`, action: { ...array, turn: true } }
        : { text: `סופרים בקפיצות של ${b}: ${Array.from({ length: a }, (_, i) => (i + 1) * b).join(', ')}.`, action: array },
      { text: `יוצא ${p}.`, math: `${a} × ${b} = ${p}` }
    ],
    numeric: true,
    key: `${a}x${b}`,
    prompts: {
      pattern: { text: `משלימים את סדרת ה-${b}.`, math: tableSequence(a, b), speech: `איזה מספר חסר בסדרה של ${b}?` },
      speed: { text: 'מהר מהר: כמה זה?', math: `${a} × ${b} = ?`, speech: `כמה זה ${a} × ${b}?` }
    }
  };
}

export const mulTable: Generator = (level, rng) => {
  // Level 3 is the hard column, with an easier one now and then (the whole table by the end).
  const cols = level.level === 3 && rng.next() < 0.2 ? [...TABLE_COLUMNS[1], ...TABLE_COLUMNS[2]] : TABLE_COLUMNS[level.level] ?? TABLE_COLUMNS[1];
  const b = rng.pick(cols);
  const a = rng.int(level.level === 1 ? 1 : 2, 10);
  // Both orders: the column's number second (3 × 4 = three fours) or first.
  return rng.next() < 0.6 ? mulQuestion(a, b, level, rng) : mulQuestion(b, a, level, rng);
};

/** 47 × 6: tens and ones times the digit, then the two parts added. */
export function mulBigQuestion(a: number, b: number, level: Lv, rng: R): Q {
  const p = a * b;
  const t = Math.floor(a / 10) * 10;
  const o = a % 10;
  const tensPart = t * b;
  const onesPart = o * b;
  const smart: [number, ErrorTag][] = [];
  // The carried tens of the ones forgotten: 47 × 6 → 240 + 2.
  if (onesPart >= 10) smart.push([tensPart + (onesPart % 10), 'no-carry']);
  if (o) smart.push([tensPart, 'one-part'], [(t / 10) * b + onesPart, 'tens-as-ones']);
  smart.push([a + b, 'times-as-plus'], [p + b, 'table-neighbor'], [p - b, 'table-neighbor'], [p + 10, 'near'], [p - 10, 'near'], [p + 1, 'count-off-by-one']);
  const { distractors, errorTags } = numberDistractors(p, smart, level, rng);
  const parts: Action = o ? { kind: 'column', a: tensPart, b: onesPart, op: '+' } : { kind: 'array', rows: b, cols: t / 10, unit: 10 };
  const hints: Hint[] = [
    { text: o ? `מפרקים: ${t} × ${b} ועוד ${o} × ${b}.` : `${t} זה ${t / 10} עשרות: ${t / 10} × ${b} עשרות.`, action: parts },
    { for: ['times-as-plus'], text: `כופלים, לא מחברים: ${b} פעמים ${a}.`, action: parts },
    { for: ['table-neighbor', 'near', 'count-off-by-one'], text: `בודקים כל חלק: ${t} × ${b} = ${tensPart}${o ? ` ו-${o} × ${b} = ${onesPart}` : ''}.`, action: parts }
  ];
  if (o) {
    hints.push({ for: ['one-part', 'tens-as-ones'], text: `גם האחדות נכפלות: ${o} × ${b} = ${onesPart}, ומחברים.`, action: parts });
    if (onesPart >= 10) hints.push({ for: ['no-carry'], text: `${onesPart} זה יותר מעשר: העשרות שלו עוברות לטור העשרות.`, action: parts });
  }
  const explanation = o
    ? [
        { text: `${a} זה ${t} ועוד ${o}.`, math: `${a} = ${t} + ${o}` },
        { text: `${o} × ${b} = ${onesPart}.`, action: { kind: 'array', rows: b, cols: o } as Action },
        { text: `${t} × ${b} = ${tensPart}: כל נקודה היא עשר.`, action: { kind: 'array', rows: b, cols: t / 10, unit: 10 } as Action },
        { text: `מחברים את שני החלקים: ${tensPart} + ${onesPart}.`, action: parts },
        { text: `יוצא ${p}.`, math: `${a} × ${b} = ${p}` }
      ]
    : [
        { text: `${t / 10} × ${b} = ${(t / 10) * b}.`, action: { kind: 'array', rows: b, cols: t / 10 } as Action },
        { text: `אבל כל נקודה היא עשר: ${(t / 10) * b} עשרות.`, action: parts },
        { text: `יוצא ${p}.`, math: `${a} × ${b} = ${p}` }
      ];
  return {
    prompt: { text: 'כמה זה?', math: `${a} × ${b} = ?`, speech: `כמה זה ${a} × ${b}?` },
    answer: p,
    distractors,
    errorTags,
    hints,
    explanation,
    numeric: true,
    key: `${a}x${b}`
  };
}

export const mulBig: Generator = (level, rng) => {
  for (;;) {
    const b = rng.int(2, 9);
    const a = level.level === 1 ? rng.int(1, 9) * 10 : rng.int(11, 99);
    if (level.level > 1 && a % 10 === 0) continue;
    const carry = (a % 10) * b >= 10 || Math.floor(a / 10) * b >= 10;
    if (level.level === 2 && carry) continue;
    if (level.level === 3 && (a % 10) * b < 10) continue;
    if (a * b > level.max) continue;
    return mulBigQuestion(a, b, level, rng);
  }
};
