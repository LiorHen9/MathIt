// story.within10 – adding and taking away as a little story, with the world's words
// (core/story.ts): "{place} יש 3 {items}, ומוסיפים עוד 2: כמה {items} יש עכשיו?".
// The math is the add/sub generators' own (the same smart distractors, hints and animated
// explanation); only the prompt becomes a story. A noun follows a number only when it is 2 or
// more ("3 כדורים", never "1 כדורים").
import type { Generator } from '../types';
import { add } from './add';
import { sub } from './sub';
import { add20, bridgeAdd, bridgeSub, sub20 } from './arith20';
import { mulQuestion } from './mul';
import { divQuestion } from './div';

// One sentence each (ages 5–7 hear one sentence at a time).
const ADD = ['{place} יש {a} {items}, ומוסיפים עוד {b}: כמה {items} יש עכשיו?', 'ל{hero} יש {a} {items}, ומקבלים עוד {b}: כמה {items} יש בסך הכול?'];
const SUB = ['{place} היו {a} {items}, ולקחו {b}: כמה {items} נשארו?', 'ל{hero} היו {a} {items}, ונתנו {b} לחברים: כמה {items} נשארו?'];

/** A story generator over an adding and a taking-away generator. */
export function storyOf(addGen: Generator, subGen: Generator): Generator {
  return (level, rng) => {
  const plus = rng.next() < 0.5;
  const gen = plus ? addGen : subGen;
  // Re-roll until the first number is at least 2 (and, adding, the second too).
  let q = gen(level, rng);
  let [a, b] = q.key.split(/[+-]/).map(Number);
  for (let t = 0; t < 40 && (a < 2 || (plus && b < 2)); t++) {
    q = gen(level, rng);
    [a, b] = q.key.split(/[+-]/).map(Number);
  }
  const t = rng.int(0, 1);
  const text = (plus ? ADD : SUB)[t].replace('{a}', String(a)).replace('{b}', String(b));
  return {
    ...q,
    prompt: { ...q.prompt, text, speech: text },
    key: `story${t}:${q.key}`
  };
  };
}

export const story: Generator = storyOf(add, sub);

/** story.within20 (phase 7): level 1 up to 20 without crossing ten, level 2 crossing ten. */
export const story20: Generator = (level, rng) => (level.level === 1 ? storyOf(add20, sub20) : storyOf(bridgeAdd, bridgeSub))(level, rng);

// story.muldiv (phase 9): times and sharing as a story. Level 1 groups of things ("4 קופסאות, ובכל
// אחת 6"); level 2 sharing them out equally. The math is mul.table's and div's own.
const MUL = ['ל{hero} יש {a} שקיות, ובכל שקית {b} {items}: כמה {items} יש בסך הכול?', '{place} יש {a} שורות, ובכל שורה {b} {items}: כמה {items} יש?'];
const DIV = ['{place} יש {a} {items}, ומחלקים אותם שווה בשווה ל-{b} קבוצות: כמה {items} בכל קבוצה?', 'ל{hero} יש {a} {items}, ושמים {b} בכל קופסה: כמה קופסאות מתמלאות?'];

export const storyMulDiv: Generator = (level, rng) => {
  const t = rng.int(0, 1);
  if (level.level === 1) {
    // Two or more of each, so the nouns read right ("3 שקיות", never "1 שקיות").
    const a = rng.int(2, 9);
    const b = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const q = mulQuestion(a, b, level, rng);
    const text = MUL[t].replace('{a}', String(a)).replace('{b}', String(b));
    return { ...q, prompt: { ...q.prompt, text, speech: text }, prompts: undefined, key: `smul${t}:${q.key}` };
  }
  const b = rng.int(2, 9);
  const per = rng.int(2, 10);
  const q = divQuestion(per * b, b, level, rng);
  const text = DIV[t].replace('{a}', String(per * b)).replace('{b}', String(b));
  return { ...q, prompt: { ...q.prompt, text, speech: text }, prompts: undefined, key: `sdiv${t}:${q.key}` };
};
