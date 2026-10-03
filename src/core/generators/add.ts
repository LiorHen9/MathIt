// add.within10 – a + b, both at least 1, the sum inside the level.
// Smart wrong answers: one off (a counting slip), a − b (subtracted instead of adding), and the
// bigger number alone (forgot to add the other part).
import type { Generator } from '../types';
import { countList, numberDistractors } from './common';

export const add: Generator = (level, rng) => {
  const sum = rng.int(Math.max(2, level.min), level.max);
  const a = rng.int(1, sum - 1);
  const b = sum - a;
  const big = Math.max(a, b);
  const small = Math.min(a, b);
  const { distractors, errorTags } = numberDistractors(
    sum,
    [
      [sum + 1, 'count-off-by-one'],
      [sum - 1, 'count-off-by-one'],
      [big - small, 'subtracted'],
      [big, 'one-part']
    ],
    level,
    rng
  );
  return {
    prompt: {
      text: 'כמה זה?',
      math: `${a} + ${b} = ?`,
      visual: { kind: 'dots', groups: [a, b], between: '+' },
      speech: `כמה זה ${a} + ${b}?`
    },
    answer: sum,
    distractors,
    errorTags,
    hints: [
      {
        text: `מתחילים מ-${big} וסופרים עוד ${small}.`,
        visual: { kind: 'dots', groups: [a, b], between: '+', numbered: true }
      }
    ],
    explanation: [
      { text: `מתחילים מ-${big}.` },
      { text: `סופרים עוד ${small}: ${countList(big + 1, sum)}.` },
      { text: `יוצא ${sum}.`, math: `${a} + ${b} = ${sum}` }
    ],
    numeric: true,
    key: `${a}+${b}`
  };
};
