// numbers.to100 – numbers up to 100 (phase 7): counting tens rods and ones cubes, what comes
// after / before a number, and which of two numbers is bigger. Level 1 whole tens, level 2 up to
// 50, level 3 up to 100.
// Smart wrong answers: the digits swapped (47 → 74), the rods counted as ones (4 rods and 7 cubes
// → 11), one off; comparing – the opposite sign. The explanation builds the number from rods and
// cubes, hops on the number line, or lines the two numbers up as tens and ones.
import type { Action, ErrorTag, Generator, Sign } from '../types';
import { digits, numberDistractors } from './common';

type Q = ReturnType<Generator>;

export const numbers100: Generator = (level, rng) => {
  const r = rng.next();
  if (level.level === 1) return r < 0.6 ? countBlocks(rng.int(1, 9) * 10, level, rng) : compareTwo(rng.int(1, 9) * 10, rng.int(1, 9) * 10, rng);
  const lo = 11;
  const n = rng.int(lo, level.max - 1);
  if (r < 0.45) return countBlocks(n, level, rng);
  if (r < 0.75) return nextTo(n, rng.next() < 0.6 ? 1 : -1, level, rng);
  // Comparing: sometimes the same digits the other way round (47 ? 74), sometimes equal.
  const { t, o } = digits(n);
  const swapped = o * 10 + t;
  const other = rng.next() < 0.3 && o > 0 && o !== t && swapped <= level.max ? swapped : rng.next() < 0.15 ? n : rng.int(lo, level.max - 1);
  return compareTwo(n, other, rng);
};

/** "How many?" – tens rods and ones cubes. */
function countBlocks(n: number, level: Parameters<Generator>[0], rng: Parameters<Generator>[1]): Q {
  const { t, o } = digits(n);
  const blocks: Action = { kind: 'tens', tens: t, ones: o };
  const { distractors, errorTags } = numberDistractors(
    n,
    [
      ...(o ? [[o * 10 + t, 'swapped-digits'] as [number, ErrorTag]] : []),
      [t + o, 'tens-as-ones'],
      [n + 1, 'count-off-by-one'],
      [n - 1, 'count-off-by-one'],
      [n + 10, 'near'],
      [n - 10, 'near']
    ],
    level,
    rng
  );
  const tensText = t === 1 ? 'מוט אחד הוא 10' : `${t} מוטות הם ${t * 10}`;
  return {
    prompt: { text: 'כמה קוביות יש?', visual: { kind: 'blocks', tens: t, ones: o }, speech: 'כמה קוביות יש?' },
    answer: n,
    distractors,
    errorTags,
    hints: [
      { text: 'סופרים את המוטות בעשרות, ואז את הקוביות באחדות.', action: blocks },
      { for: ['count-off-by-one', 'near'], text: `${tensText}, ומשם ממשיכים לספור את הקוביות.`, action: blocks },
      { for: ['swapped-digits'], text: 'המוטות הם העשרות, והן נכתבות ראשונות משמאל.', action: blocks },
      { for: ['tens-as-ones'], text: 'כל מוט הוא עשר קוביות, לא אחת.', action: blocks }
    ],
    explanation: [
      { text: `סופרים מוטות בעשרות: ${Array.from({ length: t }, (_, i) => (i + 1) * 10).join(', ')}.`, action: { kind: 'tens', tens: t, ones: 0 } },
      ...(o ? [{ text: `ועוד ${o === 1 ? 'קובייה אחת' : `${o} קוביות`}.`, action: blocks }] : []),
      { text: `יש ${n}.`, math: `${t * 10} + ${o} = ${n}` }
    ],
    numeric: true,
    key: `n100:count:${n}`
  };
}

/** "What comes after / before?" – a hop of one on the number line. */
function nextTo(n: number, dir: 1 | -1, level: Parameters<Generator>[0], rng: Parameters<Generator>[1]): Q {
  const answer = n + dir;
  const hop: Action = { kind: 'line', from: n, hops: [dir], max: 100 };
  const { distractors, errorTags } = numberDistractors(
    answer,
    [
      [n - dir, 'count-off-by-one'],
      [answer + 10 * dir, 'near'],
      [answer + dir, 'count-off-by-one'],
      [answer - 10 * dir, 'near']
    ],
    level,
    rng
  );
  const after = dir > 0;
  return {
    prompt: {
      text: after ? 'איזה מספר בא אחרי?' : 'איזה מספר בא לפני?',
      math: after ? `${n}, ?` : `?, ${n}`,
      speech: after ? `איזה מספר בא אחרי ${n}?` : `איזה מספר בא לפני ${n}?`
    },
    answer,
    distractors,
    errorTags,
    hints: [
      { text: after ? `מ-${n} קופצים אחת קדימה.` : `מ-${n} קופצים אחת אחורה.`, action: hop },
      { for: ['count-off-by-one', 'near'], text: after ? 'אחרי – קפיצה אחת קדימה על הציר.' : 'לפני – קפיצה אחת אחורה על הציר.', action: hop }
    ],
    explanation: [
      { text: after ? `על הציר, מ-${n} קופצים אחת קדימה.` : `על הציר, מ-${n} קופצים אחת אחורה.`, action: hop },
      { text: after ? `אחרי ${n} בא ${answer}.` : `לפני ${n} בא ${answer}.`, math: after ? `${n}, ${answer}` : `${answer}, ${n}` }
    ],
    numeric: true,
    key: `n100:${after ? 'after' : 'before'}:${n}`
  };
}

/** "Which sign?" between two numbers up to 100. */
function compareTwo(a: number, b: number, rng: Parameters<Generator>[1]): Q {
  const answer: Sign = a > b ? '>' : a < b ? '<' : '=';
  const errorTags: Record<string, ErrorTag> = {};
  let distractors: Sign[];
  if (answer === '=') {
    distractors = rng.shuffle<Sign>(['<', '>']);
    for (const d of distractors) errorTags[d] = 'not-equal';
  } else {
    const opposite: Sign = answer === '>' ? '<' : '>';
    distractors = [opposite, '='];
    errorTags[opposite] = 'reversed-sign';
    errorTags['='] = 'not-equal';
  }
  const cmp: Action = { kind: 'compare', a, b };
  const big = Math.max(a, b);
  const [ta, tb] = [digits(a).t, digits(b).t];
  const why =
    answer === '=' ? 'אותן עשרות ואותן אחדות.' : ta !== tb ? `משווים קודם את העשרות: ${Math.max(ta, tb)} עשרות זה יותר.` : 'העשרות שוות, אז משווים את האחדות.';
  return {
    prompt: { text: 'איזה סימן מתאים?', math: `${a} ? ${b}`, speech: `איזה סימן מתאים בין ${a} ל-${b}?` },
    answer,
    distractors,
    errorTags,
    hints: [
      { text: 'משווים קודם את העשרות, ואם הן שוות – את האחדות.', action: cmp },
      { for: ['reversed-sign'], text: `הצד הפתוח של הסימן פונה אל המספר הגדול, ${big}.`, action: cmp },
      { for: ['not-equal'], text: answer === '=' ? 'אותו מספר בדיוק – זה שווה.' : 'המספרים שונים, אז זה לא שווה.', action: cmp }
    ],
    explanation: [
      { text: why, action: cmp },
      answer === '=' ? { text: `${a} ו-${b} שווים.`, math: `${a} = ${b}` } : { text: `${big} גדול יותר, והצד הפתוח פונה אליו.`, math: `${a} ${answer} ${b}` }
    ],
    numeric: false,
    key: `n100:${a}?${b}`
  };
}
