// sub.within10 – a − b with a positive answer, everything inside the level.
// Smart wrong answers: one off (a counting slip), a + b (added instead of subtracting – only when
// it fits in the level), and b (answered with the part taken away instead of what is left: the
// single-digit form of "reversing" the exercise, since b − a would be negative here).
import type { Generator } from '../types';
import { numberDistractors } from './common';

export const sub: Generator = (level, rng) => {
  const a = rng.int(Math.max(2, level.min), level.max);
  const b = rng.int(1, a - 1);
  const diff = a - b;
  const went = b === 1 ? 'אחד הלך' : `${b} הלכו`;
  const andWent = b === 1 ? 'ואחד הלך' : `ו-${b} הלכו`;
  const { distractors, errorTags } = numberDistractors(
    diff,
    [
      [a + b, 'added'],
      [diff + 1, 'count-off-by-one'],
      [b, 'one-part'],
      [diff - 1, 'count-off-by-one']
    ],
    level,
    rng
  );
  return {
    prompt: {
      text: 'כמה זה?',
      math: `${a} − ${b} = ?`,
      visual: { kind: 'dots', groups: [a], crossed: b },
      speech: `כמה זה ${a} − ${b}?`
    },
    answer: diff,
    distractors,
    errorTags,
    hints: [
      {
        text: `היו ${a} ${andWent}, כמה נשארו?`,
        visual: { kind: 'dots', groups: [a], crossed: b, numbered: true }
      }
    ],
    explanation: [
      { text: `היו ${a}.` },
      { text: `${went}.` },
      { text: `נשארו ${diff}.`, math: `${a} − ${b} = ${diff}` }
    ],
    numeric: true,
    key: `${a}-${b}`
  };
};
