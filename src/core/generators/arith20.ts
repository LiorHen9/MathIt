// Adding and taking away up to 20 (phase 7): add.within20, sub.within20, add.bridge10, sub.bridge10
// and the word problems up to 20 all ask "a + b" or "a − b"; this file builds such a question from
// its two numbers, with the explanation that fits it:
// - crossing ten (8 + 5, 13 − 5): two ten frames – "making ten" (8 + 2 + 3; 13 − 3 − 2), and the
//   smart wrong answer 10 ('no-bridge': stopped at ten and forgot the rest);
// - a teen and some ones (13 + 4, 17 − 4): tens rods and ones cubes;
// - small numbers: the groups of chapter 1.
// The number line hint hops to the ten first (8 → 10 → 13).
import type { Rng } from '../rng';
import type { Action, DifficultyLevel, ErrorTag, Generator, Hint, Step } from '../types';
import { countList, hopsFor, hopsWord, numberDistractors } from './common';

type Q = ReturnType<Generator>;

/** Does a + b cross ten (both below ten, the sum above)? */
export const bridgesAdd = (a: number, b: number) => a < 10 && b < 10 && a + b > 10;
/** Does a − b cross ten (a teen, more taken than its ones, the rest below ten)? */
export const bridgesSub = (a: number, b: number) => a > 10 && a < 20 && b > a % 10 && a - b < 10;

const line = (from: number, by: number): Action => ({ kind: 'line', from, hops: hopsFor(from, by), max: 20 });

export function addQuestion(a: number, b: number, level: DifficultyLevel, rng: Rng): Q {
  const sum = a + b;
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const bridge = bridgesAdd(a, b);
  const teen = big >= 10;
  const smart: [number, ErrorTag][] = [];
  if (bridge) smart.push([10, 'no-bridge']);
  smart.push([sum + 1, 'count-off-by-one'], [sum - 1, 'count-off-by-one']);
  if (teen && sum - 10 !== small) smart.push([sum - 10, 'one-part']);
  smart.push([big - small, 'subtracted'], [big, 'one-part']);
  const { distractors, errorTags } = numberDistractors(sum, smart, level, rng);
  const rest = sum - 10;
  const toTen = 10 - big;
  // The animation that shows this sum best.
  const main: Action = bridge
    ? { kind: 'doubleFrame', a: big, b: small }
    : teen
      ? { kind: 'tens', tens: Math.floor(big / 10), ones: big % 10, add: small }
      : { kind: 'combine', a, b };
  const explanation: Step[] = bridge
    ? [
        { text: `${big} ועוד ${small}: קודם משלימים ל-10.`, action: { kind: 'tenFrame', n: big } },
        { text: `${toTen} ${toTen === 1 ? 'משלים' : 'משלימים'} ל-10, ונשארים עוד ${rest}.`, action: main },
        { text: `10 ועוד ${rest} זה ${sum}.`, math: `${big} + ${toTen} + ${rest} = ${sum}` }
      ]
    : teen
      ? [
          { text: `${big} זה עשר ועוד ${big % 10}.`, action: { kind: 'tens', tens: Math.floor(big / 10), ones: big % 10 } },
          { text: `מוסיפים עוד ${small}: ${countList(big + 1, sum)}.`, action: main },
          { text: `יוצא ${sum}.`, math: `${a} + ${b} = ${sum}` }
        ]
      : [
          { text: `יש ${a} ועוד ${b}. שמים אותם יחד.`, action: main },
          { text: `יוצא ${sum}.`, math: `${a} + ${b} = ${sum}` }
        ];
  const hints: Hint[] = [
    { text: bridge ? `קודם משלימים את ${big} ל-10, ואז מוסיפים את מה שנשאר.` : `שמים יחד ${a} ועוד ${b}, וסופרים מ-${big}.`, action: main },
    {
      for: ['count-off-by-one', 'near'],
      text: bridge ? `מ-${big} קופצים ל-10, ומשם עוד ${rest}.` : `מתחילים ב-${big} וקופצים ${hopsWord(small)} קדימה.`,
      action: line(big, small)
    },
    { for: ['subtracted', 'one-part'], text: 'בחיבור שמים את שני החלקים יחד.', action: main }
  ];
  if (bridge) hints.push({ for: ['no-bridge'], text: `הגענו ל-10, אבל נשארו עוד ${rest} להוסיף.`, action: main });
  return {
    prompt: { text: 'כמה זה?', math: `${a} + ${b} = ?`, speech: `כמה זה ${a} + ${b}?` },
    answer: sum,
    distractors,
    errorTags,
    hints,
    explanation,
    numeric: true,
    key: `${a}+${b}`
  };
}

export function subQuestion(a: number, b: number, level: DifficultyLevel, rng: Rng): Q {
  const diff = a - b;
  const bridge = bridgesSub(a, b);
  const first = a % 10;
  const smart: [number, ErrorTag][] = [];
  if (bridge) smart.push([10, 'no-bridge']);
  smart.push([a + b, 'added'], [diff + 1, 'count-off-by-one'], [diff - 1, 'count-off-by-one'], [b, 'one-part']);
  const { distractors, errorTags } = numberDistractors(diff, smart, level, rng);
  const main: Action = bridge
    ? { kind: 'doubleFrame', a, b: -b }
    : a > 10
      ? { kind: 'tens', tens: Math.floor(a / 10), ones: a % 10, take: b }
      : { kind: 'takeAway', a, b };
  const explanation: Step[] = bridge
    ? [
        { text: `${a} פחות ${b}: קודם מורידים ${first} ומגיעים ל-10.`, action: { kind: 'line', from: a, hops: [-first], max: 20 } },
        { text: `ומ-10 מורידים עוד ${b - first}.`, action: main },
        { text: `נשארו ${diff}.`, math: `${a} − ${first} − ${b - first} = ${diff}` }
      ]
    : [
        { text: `היו ${a}, ומורידים ${b}.`, action: main },
        { text: `נשארו ${diff}.`, math: `${a} − ${b} = ${diff}` }
      ];
  const hints: Hint[] = [
    { text: bridge ? `קודם מורידים ${first} עד 10, ואז עוד ${b - first}.` : `היו ${a} ומורידים ${b}: כמה נשארו?`, action: main },
    {
      for: ['count-off-by-one', 'near'],
      text: bridge ? `מ-${a} קופצים אחורה ל-10, ומשם עוד ${b - first}.` : `מתחילים ב-${a} וקופצים ${hopsWord(b)} אחורה.`,
      action: line(a, -b)
    },
    { for: ['added'], text: 'בחיסור מורידים, ונשארים פחות.', action: main },
    { for: ['one-part'], text: `הורדנו ${b}. סופרים את אלה שנשארו.`, action: main }
  ];
  if (bridge) hints.push({ for: ['no-bridge'], text: `הגענו ל-10, אבל צריך להוריד עוד ${b - first}.`, action: main });
  return {
    prompt: { text: 'כמה זה?', math: `${a} − ${b} = ?`, speech: `כמה זה ${a} − ${b}?` },
    answer: diff,
    distractors,
    errorTags,
    hints,
    explanation,
    numeric: true,
    key: `${a}-${b}`
  };
}

/** add.within20 – level 1 without crossing ten (13 + 4, 10 + 6), level 2 any sum up to 20. */
export const add20: Generator = (level, rng) => {
  if (level.level === 1) {
    const teen = rng.int(10, 18);
    const b = rng.int(1, 9 - (teen % 10));
    const [a, c] = rng.next() < 0.3 ? [b, teen] : [teen, b];
    return addQuestion(a, c, level, rng);
  }
  const sum = rng.int(11, level.max);
  const a = rng.int(2, sum - 2);
  return addQuestion(a, sum - a, level, rng);
};

/** sub.within20 – level 1 without crossing ten (17 − 4, 15 − 5), level 2 anything up to 20. */
export const sub20: Generator = (level, rng) => {
  if (level.level === 1) {
    const a = rng.int(11, 19);
    return subQuestion(a, rng.int(1, a % 10), level, rng);
  }
  const a = rng.int(11, level.max);
  const b = rng.int(2, a - 1);
  return subQuestion(a, b, level, rng);
};

/** add.bridge10 – crossing ten by making ten: level 1 from 9 and 8, level 2 any two numbers. */
export const bridgeAdd: Generator = (level, rng) => {
  const big = level.level === 1 ? rng.int(8, 9) : rng.int(5, 9);
  const small = rng.int(11 - big, Math.min(9, level.max - big));
  return rng.next() < 0.3 ? addQuestion(small, big, level, rng) : addQuestion(big, small, level, rng);
};

/** sub.bridge10 – crossing ten backwards: level 1 from 11–14, level 2 from 11–18. */
export const bridgeSub: Generator = (level, rng) => {
  const a = rng.int(11, level.level === 1 ? 14 : 18);
  const b = rng.int(a % 10 + 1, 9);
  return subQuestion(a, b, level, rng);
};
