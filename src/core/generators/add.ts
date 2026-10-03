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
        text: `שמים יחד ${a} ועוד ${b}, וסופרים מ-${big}.`,
        visual: { kind: 'dots', groups: [a, b], between: '+', numbered: true },
        action: { kind: 'combine', a, b }
      },
      {
        // One off: count the hops carefully on the number line.
        for: ['count-off-by-one'],
        text: `מתחילים ב-${big} וקופצים ${small === 1 ? 'קפיצה אחת' : `${small} קפיצות`} קדימה.`,
        visual: { kind: 'dots', groups: [a, b], between: '+', numbered: true },
        action: { kind: 'jump', from: big, by: small }
      },
      {
        // Took away, or answered with one part: adding puts the groups together.
        for: ['subtracted', 'one-part'],
        text: 'בחיבור שמים את שתי הקבוצות יחד.',
        visual: { kind: 'dots', groups: [a, b], between: '+', numbered: true },
        action: { kind: 'combine', a, b }
      }
    ],
    explanation: [
      { text: `יש ${a} ועוד ${b}. שמים אותם יחד.`, action: { kind: 'combine', a, b } },
      { text: `מתחילים מ-${big} וקופצים עוד ${small}: ${countList(big + 1, sum)}.`, action: { kind: 'jump', from: big, by: small } },
      { text: `יוצא ${sum}.`, math: `${a} + ${b} = ${sum}` }
    ],
    numeric: true,
    key: `${a}+${b}`
  };
};
