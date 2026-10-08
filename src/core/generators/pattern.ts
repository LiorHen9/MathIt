// pattern – number sequences (phase 7): "2, 4, 6, 8, ?". Level 1 counts on by 1, 2, 5 or 10 (up to
// 30); level 2 also backwards and by 3 (up to 50); level 3 by 4, 5 and 10 both ways up to 100,
// sometimes with the missing number in the middle.
// Smart wrong answers: 'wrong-step' (a step one too big or too small: 2, 4, 6 → 7), one off,
// the number before. The explanation hops along the number line, one hop per step.
import type { Action, ErrorTag, Generator } from '../types';
import { numberDistractors } from './common';

const STEPS: Record<number, number[]> = { 1: [1, 2, 5, 10], 2: [2, 3, 5, 10, -1, -2], 3: [4, 5, 10, -5, -10, 3] };
/** Numbers shown, the missing one included. */
const LEN = 5;

export const pattern: Generator = (level, rng) => {
  const step = rng.pick(STEPS[level.level] ?? STEPS[1]);
  const span = Math.abs(step) * (LEN - 1);
  // The smallest number of the sequence, so all of it stays in range.
  const lo = rng.int(Math.max(level.min, 0), level.max - span);
  // Round numbers for steps of 5 and 10 (5, 10, 15… or 23, 33, 43… both happen).
  const first = step > 0 ? lo : lo + span;
  const terms = Array.from({ length: LEN }, (_, i) => first + step * i);
  // The missing number: the last, or (level 3, sometimes) one in the middle.
  const gap = level.level === 3 && rng.next() < 0.35 ? rng.int(1, LEN - 2) : LEN - 1;
  const answer = terms[gap];
  const smart: [number, ErrorTag][] = [];
  if (Math.abs(step) > 1) smart.push([answer + 1, 'wrong-step'], [answer - 1, 'wrong-step']);
  else smart.push([answer + step, 'wrong-step'], [answer + 1, 'count-off-by-one'], [answer - 1, 'count-off-by-one']);
  smart.push([answer + step, 'near'], [answer - step, 'near']);
  const { distractors, errorTags } = numberDistractors(answer, smart, level, rng);
  const max = level.max > 20 ? 100 : 20;
  const shown = terms.map((x, i) => (i === gap ? '?' : String(x))).join(', ');
  const stepText = `${step > 0 ? '+' : '−'}${Math.abs(step)}`;
  const way = step > 0 ? 'קדימה' : 'אחורה';
  const all: Action = { kind: 'line', from: first, hops: Array.from({ length: gap }, () => step), max };
  const before = terms[gap - 1] ?? terms[gap + 1];
  const one: Action = { kind: 'line', from: before, hops: [gap > 0 ? step : -step], max };
  const last = gap === LEN - 1;
  const text = last ? 'איזה מספר בא אחר כך?' : 'איזה מספר חסר?';
  return {
    prompt: { text, math: shown, speech: last ? `איזה מספר בא אחרי ${terms.slice(0, gap).join(', ')}?` : text },
    answer,
    distractors,
    errorTags,
    hints: [
      { text: `בכל פעם קופצים ${Math.abs(step)} ${way}.`, action: one },
      { for: ['wrong-step'], text: `בודקים את הקפיצה: כל פעם בדיוק ${stepText}.`, action: all.hops.length ? all : one },
      { for: ['count-off-by-one', 'near'], text: `מ-${before} קופצים עוד ${Math.abs(step)} ${gap > 0 ? way : step > 0 ? 'אחורה' : 'קדימה'}.`, action: one }
    ],
    explanation: [
      { text: `בכל פעם המספר זז ${Math.abs(step)} ${way}: ${stepText}.`, math: shown },
      { text: `קופצים מ-${first}: ${terms.slice(1, gap + 1).join(', ')}.`, action: gap > 0 ? all : one },
      { text: `המספר החסר הוא ${answer}.`, math: terms.join(', ') }
    ],
    numeric: true,
    key: `pat:${terms.join(',')}:${gap}`
  };
};
