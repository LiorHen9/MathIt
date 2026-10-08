// place.value – tens and ones (phase 7). Level 1: tens and ones make a number (2 tens and 7
// ones → 27, up to 50); level 2: how many tens / ones a number has (up to 99); level 3: expanded
// form (40 + 7) and what a digit is worth (the 4 in 47 is 40).
// Smart wrong answers: 'swapped-digits' (27 ↔ 72, the other digit), 'tens-as-ones' (2 tens and
// 7 → 9; the 4 in 47 is "4"), the whole number for one digit, one off. The explanation always
// builds the number from rods (tens) and cubes (ones).
import type { Action, ErrorTag, Generator } from '../types';
import { numberDistractors } from './common';

export const tensWord = (t: number) => (t === 1 ? 'עשרת אחת' : `${t} עשרות`);
export const onesWord = (o: number) => (o === 1 ? 'אחדת אחת' : `${o} אחדות`);

export const place: Generator = (level, rng) => {
  const kind = level.level === 1 ? 'make' : level.level === 2 ? (rng.next() < 0.5 ? 'tens' : 'ones') : rng.next() < 0.5 ? 'expanded' : 'worth';
  const t = rng.int(1, level.level === 1 ? 4 : 9);
  let o = rng.int(kind === 'make' ? 0 : 1, 9);
  if (kind !== 'make' && o === t) o = o === 9 ? 1 : o + 1;
  const n = t * 10 + o;
  const blocks: Action = { kind: 'tens', tens: t, ones: o };
  const said = `${n} זה ${tensWord(t)} ו${o === 1 ? 'אחדת אחת' : `-${o} אחדות`}.`;
  const blocksHint = { text: 'המוטות הם העשרות, והקוביות הן האחדות.', action: blocks };

  if (kind === 'make' || kind === 'expanded') {
    const smart: [number, ErrorTag][] = [];
    if (o) smart.push([o * 10 + t, 'swapped-digits']);
    smart.push([t + o, 'tens-as-ones'], [n + 1, 'count-off-by-one'], [n - 1, 'count-off-by-one'], [n + 10, 'near'], [n - 10, 'near']);
    const { distractors, errorTags } = numberDistractors(n, smart, level, rng);
    const make = kind === 'make';
    const text = make ? `${tensWord(t)}${o ? ` ו${o === 1 ? 'אחדת אחת' : `-${o} אחדות`}` : ''}: איזה מספר זה?` : 'איזה מספר זה?';
    return {
      prompt: make
        ? { text, visual: { kind: 'blocks', tens: t, ones: o }, speech: text }
        : { text, math: `${t * 10} + ${o} = ?`, speech: `כמה זה ${t * 10} + ${o}?` },
      answer: n,
      distractors,
      errorTags,
      hints: [
        blocksHint,
        { for: ['swapped-digits'], text: 'את העשרות כותבים קודם, משמאל, ואחריהן את האחדות.', action: blocks },
        { for: ['tens-as-ones'], text: `כל עשרת היא 10: ${tensWord(t)} הן ${t * 10}.`, action: blocks },
        { for: ['count-off-by-one', 'near'], text: `סופרים את המוטות בעשרות עד ${t * 10}, ואז את הקוביות.`, action: blocks }
      ],
      explanation: [
        { text: `${tensWord(t)} הן ${t * 10}.`, action: { kind: 'tens', tens: t, ones: 0 } },
        ...(o ? [{ text: `ועוד ${onesWord(o)}.`, action: blocks }] : []),
        { text: `יוצא ${n}.`, math: `${t * 10} + ${o} = ${n}` }
      ],
      numeric: true,
      key: `pv:${kind}:${n}`
    };
  }

  if (kind === 'tens' || kind === 'ones') {
    const tens = kind === 'tens';
    const answer = tens ? t : o;
    const other = tens ? o : t;
    const { distractors, errorTags } = numberDistractors(
      answer,
      [
        [other, 'swapped-digits'],
        [n, 'one-part'],
        [answer + 1, 'count-off-by-one'],
        [answer - 1, 'count-off-by-one']
      ],
      level,
      rng
    );
    const ask: Action = { kind: 'tens', tens: t, ones: o, ask: kind };
    const text = tens ? `כמה עשרות יש במספר ${n}?` : `כמה אחדות יש במספר ${n}?`;
    return {
      prompt: { text, speech: text },
      answer,
      distractors,
      errorTags,
      hints: [
        { text: tens ? 'סופרים את המוטות: כל מוט הוא עשרת.' : 'סופרים את הקוביות הבודדות: כל אחת היא אחדת.', action: ask },
        { for: ['swapped-digits'], text: tens ? 'העשרות הן הספרה השמאלית.' : 'האחדות הן הספרה הימנית, האחרונה.', action: ask },
        { for: ['one-part'], text: tens ? 'לא כל המספר – רק כמה מוטות.' : 'לא כל המספר – רק כמה קוביות בודדות.', action: ask },
        { for: ['count-off-by-one', 'near'], text: tens ? 'סופרים כל מוט פעם אחת.' : 'סופרים כל קובייה פעם אחת.', action: ask }
      ],
      explanation: [
        { text: said, action: blocks },
        { text: tens ? `יש ${t === 1 ? 'מוט אחד' : `${t} מוטות`}: ${tensWord(t)}.` : `יש ${o === 1 ? 'קובייה אחת' : `${o} קוביות`}: ${onesWord(o)}.`, action: ask, math: String(answer) }
      ],
      numeric: true,
      key: `pv:${kind}:${n}`
    };
  }

  // What the tens digit is worth: the 4 in 47 is 40.
  const answer = t * 10;
  const { distractors, errorTags } = numberDistractors(
    answer,
    [
      [t, 'tens-as-ones'],
      [o * 10, 'swapped-digits'],
      [answer + 10, 'near'],
      [answer - 10, 'near']
    ],
    level,
    rng
  );
  const text = `כמה שווה הספרה ${t} במספר ${n}?`;
  return {
    prompt: { text, speech: text },
    answer,
    distractors,
    errorTags,
    hints: [
      { text: `הספרה ${t} היא העשרות: ${t === 1 ? 'מוט אחד' : `${t} מוטות`}.`, action: { kind: 'tens', tens: t, ones: 0 } },
      { for: ['tens-as-ones'], text: `כל מוט הוא 10, אז ${t === 1 ? 'מוט אחד הוא' : `${t} מוטות הם`} ${answer}.`, action: { kind: 'tens', tens: t, ones: 0 } },
      { for: ['swapped-digits'], text: `הספרה ${t} משמאל – היא העשרות.`, action: blocks },
      { for: ['near', 'count-off-by-one'], text: 'סופרים את המוטות בעשרות.', action: { kind: 'tens', tens: t, ones: 0 } }
    ],
    explanation: [
      { text: said, action: blocks },
      { text: `הספרה ${t} היא המוטות: ${answer}.`, action: { kind: 'tens', tens: t, ones: 0 }, math: String(answer) }
    ],
    numeric: true,
    key: `pv:worth:${n}`
  };
};
