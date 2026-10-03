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
  const visual = { kind: 'dots' as const, groups: [a], crossed: b, numbered: true };
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
        visual,
        action: { kind: 'takeAway', a, b }
      },
      {
        // Added instead: taking away makes fewer.
        for: ['added'],
        text: `בחיסור מורידים: ${went}, ונשארים פחות.`,
        visual,
        action: { kind: 'takeAway', a, b }
      },
      {
        for: ['count-off-by-one'],
        text: `מתחילים ב-${a} וקופצים ${b === 1 ? 'קפיצה אחת' : `${b} קפיצות`} אחורה.`,
        visual,
        action: { kind: 'jump', from: a, by: -b }
      },
      {
        // Answered with the part that went: count the ones that stay.
        for: ['one-part'],
        text: `${went}. סופרים את אלה שנשארו.`,
        visual,
        action: { kind: 'takeAway', a, b }
      }
    ],
    explanation: [
      { text: `היו ${a} ${andWent}.`, action: { kind: 'takeAway', a, b } },
      { text: `על הציר: מ-${a} קופצים ${b} אחורה.`, action: { kind: 'jump', from: a, by: -b } },
      { text: `נשארו ${diff}.`, math: `${a} − ${b} = ${diff}` }
    ],
    numeric: true,
    key: `${a}-${b}`
  };
};
