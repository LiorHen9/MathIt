// story.within10 – adding and taking away as a little story, with the world's words
// (core/story.ts): "{place} יש 3 {items}, ומוסיפים עוד 2: כמה {items} יש עכשיו?".
// The math is the add/sub generators' own (the same smart distractors, hints and animated
// explanation); only the prompt becomes a story. A noun follows a number only when it is 2 or
// more ("3 כדורים", never "1 כדורים").
import type { Generator } from '../types';
import { add } from './add';
import { sub } from './sub';

// One sentence each (ages 5–7 hear one sentence at a time).
const ADD = ['{place} יש {a} {items}, ומוסיפים עוד {b}: כמה {items} יש עכשיו?', 'ל{hero} יש {a} {items}, ומקבלים עוד {b}: כמה {items} יש בסך הכול?'];
const SUB = ['{place} היו {a} {items}, ולקחו {b}: כמה {items} נשארו?', 'ל{hero} היו {a} {items}, ונתנו {b} לחברים: כמה {items} נשארו?'];

export const story: Generator = (level, rng) => {
  const plus = rng.next() < 0.5;
  const gen = plus ? add : sub;
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
