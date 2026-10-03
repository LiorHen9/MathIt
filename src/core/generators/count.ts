// count.to10 – how many stars? The stars are the question (prompt.visual); the answer is a number.
import type { Generator } from '../types';
import { countList, numberDistractors } from './common';

export const count: Generator = (level, rng) => {
  const n = rng.int(level.min, level.max);
  const { distractors, errorTags } = numberDistractors(
    n,
    [
      [n - 1, 'count-off-by-one'],
      [n + 1, 'count-off-by-one'],
      [n + 2, 'near'],
      [n - 2, 'near']
    ],
    level,
    rng
  );
  return {
    prompt: {
      text: 'כמה כוכבים יש?',
      visual: { kind: 'dots', groups: [n] },
      speech: 'כמה כוכבים יש?'
    },
    answer: n,
    distractors,
    errorTags,
    hints: [
      { text: 'סופרים כל כוכב פעם אחת, עם האצבע.', visual: { kind: 'dots', groups: [n], numbered: true }, action: { kind: 'count', n } },
      {
        // One too many or too few: in a ten frame every star has its own place.
        for: ['count-off-by-one', 'near'],
        text: 'במסגרת עשר לכל כוכב יש משבצת משלו.',
        visual: { kind: 'dots', groups: [n], numbered: true },
        action: { kind: 'tenFrame', n }
      }
    ],
    explanation: [
      { text: `סופרים כל כוכב פעם אחת: ${countList(1, n)}.`, action: { kind: 'count', n } },
      { text: 'שמים אותם במסגרת עשר.', action: { kind: 'tenFrame', n } },
      { text: n === 1 ? 'יש כוכב אחד.' : `יש ${n} כוכבים.`, math: String(n) }
    ],
    numeric: true,
    key: `count:${n}`
  };
};
