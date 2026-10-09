// div (phase 9): division as the times table backwards. Level 1 by 2, 5 and 10; level 2 by
// every number to 10; level 3 with a remainder ("17 : 5 = 3, שארית 2") – asking either what each
// one gets or what is left over.
// Smart wrong answers: 'table-neighbor' (one group too many or too few), 'times-as-plus' (took
// away instead of dividing: 12 : 3 → 9), 'one-part' (the divisor, or the remainder), and with a
// remainder 'remainder-dropped' (nothing left over).
// The explanation shares things onto plates one round at a time; what cannot fill a round stays
// aside – that is the remainder.
import type { Action, ErrorTag, Generator, Hint } from '../types';
import { numberDistractors } from './common';
import { TABLE_COLUMNS } from './mul';

type Q = ReturnType<Generator>;
type Lv = Parameters<Generator>[0];
type R = Parameters<Generator>[1];

/** `a` : `b`, no remainder. */
export function divQuestion(a: number, b: number, level: Lv, rng: R): Q {
  const q = a / b;
  const smart: [number, ErrorTag][] = [
    [q + 1, 'table-neighbor'],
    [b, 'one-part'],
    [a - b, 'times-as-plus'],
    [q - 1, 'table-neighbor'],
    [q + 2, 'near']
  ];
  const { distractors, errorTags } = numberDistractors(q, smart, level, rng);
  const share: Action = { kind: 'share', total: a, groups: b, ask: 'each' };
  const array: Action = { kind: 'array', rows: q, cols: b };
  const hints: Hint[] = [
    { text: `מחלקים ${a} שווה בשווה ל-${b} צלחות.`, action: share },
    { for: ['times-as-plus'], text: 'בחילוק מחלקים לקבוצות שוות, לא מורידים פעם אחת.', action: share },
    { for: ['table-neighbor', 'near', 'count-off-by-one'], text: `בודקים בכפל: כמה פעמים ${b} זה ${a}?`, action: array },
    { for: ['one-part'], text: `${b} זה מספר הצלחות; שואלים כמה יש בכל צלחת.`, action: share }
  ];
  return {
    prompt: { text: 'כמה זה?', math: `${a} : ${b} = ?`, speech: `כמה זה ${a} חלקי ${b}?` },
    answer: q,
    distractors,
    errorTags,
    hints,
    explanation: [
      { text: `מחלקים ${a} ל-${b} צלחות, בכל סיבוב אחד לכל צלחת.`, action: share },
      { text: `בכל צלחת ${q}, כי ${q} × ${b} = ${a}.`, math: `${a} : ${b} = ${q}` }
    ],
    numeric: true,
    key: `${a}:${b}`,
    prompts: { speed: { text: 'מהר מהר: כמה זה?', math: `${a} : ${b} = ?`, speech: `כמה זה ${a} חלקי ${b}?` } }
  };
}

/** `a` : `b` with a remainder: asking what each one gets (`ask` each) or what is left. */
export function remainderQuestion(a: number, b: number, ask: 'each' | 'left', level: Lv, rng: R): Q {
  const q = Math.floor(a / b);
  const r = a % b;
  const answer = ask === 'each' ? q : r;
  const smart: [number, ErrorTag][] =
    ask === 'each'
      ? [
          [q + 1, 'table-neighbor'],
          [q - 1, 'table-neighbor'],
          [r, 'one-part'],
          [a - b, 'times-as-plus']
        ]
      : [
          [0, 'remainder-dropped'],
          [r + b, 'table-neighbor'],
          [q, 'one-part'],
          [r + 1, 'count-off-by-one'],
          [r - 1, 'count-off-by-one']
        ];
  const { distractors, errorTags } = numberDistractors(answer, smart, level, rng);
  const share: Action = { kind: 'share', total: a, groups: b, ask };
  const left: Action = { kind: 'share', total: a, groups: b, ask: 'left' };
  const hints: Hint[] = [
    { text: `מחלקים ${a} ל-${b} צלחות; מה שלא מספיק לסיבוב שלם נשאר בצד.`, action: share },
    { for: ['table-neighbor', 'near', 'count-off-by-one'], text: `${q} × ${b} = ${q * b}, ועוד ${b} כבר יותר מ-${a}.`, action: share },
    { for: ['one-part', 'times-as-plus'], text: ask === 'each' ? 'שואלים כמה בכל צלחת, לא כמה נשאר.' : 'שואלים כמה נשאר בצד, לא כמה בכל צלחת.', action: share },
    { for: ['remainder-dropped'], text: `${a} לא מתחלק בדיוק: ${a - q * b} נשארים בצד.`, action: left }
  ];
  const math = ask === 'each' ? `${a} : ${b} = ? (שארית ${r})` : `${a} : ${b} = ${q} (שארית ?)`;
  const text = ask === 'each' ? 'כמה בכל קבוצה?' : 'כמה נשאר?';
  return {
    prompt: { text, math, speech: ask === 'each' ? `${a} חלקי ${b} זה כמה, עם שארית ${r}?` : `${a} חלקי ${b} זה ${q}, וכמה נשאר?` },
    answer,
    distractors,
    errorTags,
    hints,
    explanation: [
      { text: `מחלקים ${a} ל-${b} צלחות, סיבוב אחרי סיבוב.`, action: { kind: 'share', total: a, groups: b, ask: 'each' } },
      { text: `בכל צלחת ${q}, ו-${r} ${r === 1 ? 'נשאר' : 'נשארים'} בצד.`, action: share },
      { text: ask === 'each' ? `התשובה: ${q}, שארית ${r}.` : `השארית היא ${r}.`, math: `${a} : ${b} = ${q} (שארית ${r})` }
    ],
    numeric: true,
    key: ask === 'each' ? `${a}:${b}` : `${a}:${b}r`
  };
}

export const div: Generator = (level, rng) => {
  if (level.level === 3) {
    const b = rng.int(2, 9);
    const q = rng.int(1, 9);
    const r = rng.int(1, b - 1);
    return remainderQuestion(q * b + r, b, rng.next() < 0.6 ? 'each' : 'left', level, rng);
  }
  const b = level.level === 1 ? rng.pick(TABLE_COLUMNS[1]) : rng.pick([2, 3, 4, 5, 6, 7, 8, 9]);
  const q = rng.int(level.level === 1 ? 1 : 2, 10);
  return divQuestion(q * b, b, level, rng);
};
