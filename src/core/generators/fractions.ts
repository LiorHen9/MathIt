// Fractions (phase 9): frac.part – a part of a whole in a picture (level 1 one slice, level 2
// several); frac.compare – the same denominator (level 1) or the same numerator (level 2);
// frac.equiv – a fraction worth the same (level 1 cut finer: 1/2 = 2/4; level 2 in its simplest
// form: 6/8 = 3/4); frac.add – the same denominator (level 1 less than a whole, level 2 up to one).
// Fractions are answers of their own kind ({ n, d }, core/types Frac): written as they are, never
// reduced on their own. Where the question says so (colouring a pizza, adding), one worth the same
// counts as right too (`equivalent`) – and then no choice is worth the same as the answer.
// Smart wrong answers: 'part-to-part' (coloured over the rest), 'flipped-fraction', 'bigger-
// denominator' (1/8 > 1/4), 'added-denominators' (1/4 + 2/4 → 3/8), 'equiv-add' (1/2 → 3/4:
// adding on top and below), 'one-part' (only one of the two changed).
// The pictures and the explanations are pizzas: cut into equal slices, coloured, cut finer or glued.
import { answerKey, sameValue, type Action, type ErrorTag, type Frac, type Generator, type Hint } from '../types';
import type { Rng } from '../rng';

type Q = ReturnType<Generator>;
type R = Rng;

const MASC: Record<number, string> = { 1: 'אחד', 2: 'שני', 3: 'שלושה', 4: 'ארבעה', 5: 'חמישה', 6: 'שישה', 7: 'שבעה', 8: 'שמונה', 9: 'תשעה', 10: 'עשרה', 11: 'אחד-עשר', 12: 'שנים-עשר' };
const FEM: Record<number, string> = { 1: 'אחת', 2: 'שתי', 3: 'שלוש', 4: 'ארבע', 5: 'חמש', 6: 'שש', 7: 'שבע', 8: 'שמונה', 9: 'תשע', 10: 'עשר', 11: 'אחת-עשרה', 12: 'שתים-עשרה' };
/** One part and many parts of each denominator; masculine ones are counted in the masculine. */
const PARTS: Record<number, [string, string, boolean]> = {
  2: ['חצי', 'חצאים', true],
  3: ['שליש', 'שלישים', true],
  4: ['רבע', 'רבעים', true],
  5: ['חמישית', 'חמישיות', false],
  6: ['שישית', 'שישיות', false],
  7: ['שביעית', 'שביעיות', false],
  8: ['שמינית', 'שמיניות', false],
  9: ['תשיעית', 'תשיעיות', false],
  10: ['עשירית', 'עשיריות', false]
};

/** A fraction in Hebrew words, for the voice: 3/4 → "שלושה רבעים", 1/2 → "חצי", 4/4 → "שלם". */
export function fracWords(f: Frac): string {
  if (f.n === f.d) return 'שלם';
  if (f.n === 0) return 'אפס';
  const p = PARTS[f.d];
  if (!p) return `${f.n} חלקים מתוך ${f.d}`;
  if (f.n === 1) return p[0];
  return `${(p[2] ? MASC : FEM)[f.n] ?? f.n} ${p[1]}`;
}

export const frac = (n: number, d: number): Frac => ({ n, d });
const fx = (f: Frac) => `${f.n}/${f.d}`;

/**
 * Wrong fractions: the smart ones first (in order), then neighbours; none equal to the answer as
 * written – and none worth the same when `equivalent` – none twice, every part 0–12, d ≥ 1.
 */
export function fracDistractors(answer: Frac, smart: [Frac, ErrorTag][], equivalent: boolean, rng: R, want = 3): { distractors: Frac[]; errorTags: Record<string, ErrorTag> } {
  const out: Frac[] = [];
  const errorTags: Record<string, ErrorTag> = {};
  const ok = (f: Frac) =>
    Number.isInteger(f.n) &&
    Number.isInteger(f.d) &&
    f.n >= 0 &&
    f.n <= 12 &&
    f.d >= 1 &&
    f.d <= 12 &&
    answerKey(f) !== answerKey(answer) &&
    !(equivalent && sameValue(f, answer)) &&
    !out.some((x) => answerKey(x) === answerKey(f));
  for (const [f, tag] of smart) {
    if (out.length >= want) break;
    if (ok(f)) {
      out.push(f);
      errorTags[answerKey(f)] = tag;
    }
  }
  const near: Frac[] = rng.shuffle([frac(answer.n + 1, answer.d), frac(answer.n - 1, answer.d), frac(answer.n, answer.d + 1), frac(answer.n, answer.d - 1), frac(answer.n + 2, answer.d), frac(answer.n + 1, answer.d + 1)]);
  for (const f of near) {
    if (out.length >= want) break;
    if (ok(f)) {
      out.push(f);
      errorTags[answerKey(f)] = f.d === answer.d ? 'count-off-by-one' : 'near';
    }
  }
  return { distractors: out, errorTags };
}

/** frac.part: which part of the pizza is coloured. */
export function fracPartQuestion(n: number, d: number, rng: R): Q {
  const answer = frac(n, d);
  const smart: [Frac, ErrorTag][] = [
    [frac(n, d - n), 'part-to-part'],
    [frac(d, n), 'flipped-fraction'],
    [frac(d - n, d), 'near'],
    [frac(n, d + 1), 'count-off-by-one']
  ];
  const { distractors, errorTags } = fracDistractors(answer, smart, true, rng);
  const pizza: Action = { kind: 'pizza', d, n };
  const hints: Hint[] = [
    { text: `הפיצה חתוכה ל-${d} חלקים שווים, ו-${n} צבועים.`, action: pizza },
    { for: ['part-to-part', 'near'], text: 'למטה כותבים את כל החלקים, גם את אלה שלא צבועים.', action: pizza },
    { for: ['flipped-fraction'], text: 'למעלה – החלקים הצבועים, למטה – כל החלקים.', action: pizza },
    { for: ['count-off-by-one'], text: 'סופרים שוב את כל החלקים, כל חלק פעם אחת.', action: pizza }
  ];
  return {
    prompt: { text: 'איזה חלק מהפיצה צבוע?', visual: { kind: 'pizza', n, d }, speech: 'איזה חלק מהפיצה צבוע?' },
    answer,
    distractors,
    errorTags,
    hints,
    explanation: [
      { text: `חותכים את הפיצה ל-${d} חלקים שווים: זה המספר שלמטה.`, action: { kind: 'pizza', d, n: 0 } },
      { text: `צובעים ${n}: זה המספר שלמעלה.`, action: pizza },
      { text: `צבוע ${fracWords(answer)}.`, math: fx(answer) }
    ],
    numeric: false,
    key: `fp:${n}/${d}`,
    equivalent: true,
    prompts: {
      slice: { text: `צובעים ${fx(answer)} מהפיצה (אפשר לחתוך דק יותר).`, math: fx(answer), speech: `צובעים ${fracWords(answer)} מהפיצה.` }
    }
  };
}

export const fracPart: Generator = (level, rng) => {
  if (level.level === 1) {
    const d = rng.int(2, 10);
    return fracPartQuestion(1, d, rng);
  }
  const d = rng.pick([3, 4, 5, 6, 8, 10]);
  return fracPartQuestion(rng.int(2, d - 1), d, rng);
};

const SIGN = (x: Frac, y: Frac) => (x.n * y.d > y.n * x.d ? '>' : x.n * y.d < y.n * x.d ? '<' : '=');

/** frac.compare: two fractions with the same denominator or the same numerator. */
export function fracCompareQuestion(x: Frac, y: Frac): Q {
  const answer = SIGN(x, y);
  const sameD = x.d === y.d;
  const others = (['<', '>', '='] as const).filter((s) => s !== answer);
  const errorTags: Record<string, ErrorTag> = {};
  for (const s of others) errorTags[s] = s === '=' || answer === '=' ? 'not-equal' : sameD ? 'reversed-sign' : 'bigger-denominator';
  const vs: Action = { kind: 'pizza', d: x.d, n: x.n, vs: y };
  const hints: Hint[] = [
    { text: sameD ? `החלקים באותו גודל: משווים כמה חלקים צבועים.` : `אותו מספר חלקים צבועים: משווים כמה גדול כל חלק.`, action: vs },
    { for: ['reversed-sign', 'not-equal'], text: 'הפה של הסימן פתוח אל השבר הגדול.', action: vs },
    { for: ['bigger-denominator'], text: 'ככל שחותכים ליותר חלקים, כל חלק קטן יותר.', action: vs }
  ];
  return {
    prompt: { text: 'איזה סימן חסר?', math: `${fx(x)} ? ${fx(y)}`, speech: `מה גדול יותר: ${fracWords(x)} או ${fracWords(y)}?` },
    answer,
    distractors: others,
    errorTags,
    hints,
    explanation: [
      { text: `שמים את שתי הפיצות זו ליד זו: ${fx(x)} ו-${fx(y)}.`, action: { kind: 'pizza', d: x.d, n: x.n } },
      { text: sameD ? 'החלקים באותו גודל, אז סופרים חלקים.' : `לחלקים של ${fx(y)} גודל אחר: משווים.`, action: vs },
      { text: answer === '=' ? 'הם שווים.' : `${fx(x)} ${answer} ${fx(y)}.`, math: `${fx(x)} ${answer} ${fx(y)}` }
    ],
    numeric: false,
    key: `fc:${fx(x)}?${fx(y)}`
  };
}

export const fracCompare: Generator = (level, rng) => {
  if (level.level === 1) {
    const d = rng.int(3, 10);
    const a = rng.int(1, d - 1);
    const b = rng.next() < 0.1 ? a : rng.int(1, d - 1);
    return fracCompareQuestion(frac(a, d), frac(b, d));
  }
  const n = rng.int(1, 3);
  const d1 = rng.int(n + 1, 10);
  const d2 = rng.next() < 0.1 ? d1 : rng.int(n + 1, 10);
  return fracCompareQuestion(frac(n, d1), frac(n, d2));
};

/** frac.equiv level 1: `f` cut finer by `k` (1/2 = 2/4). */
function finerQuestion(f: Frac, k: number, rng: R): Q {
  const answer = frac(f.n * k, f.d * k);
  const D = f.d * k;
  const smart: [Frac, ErrorTag][] = [
    [frac(f.n + (D - f.d), D), 'equiv-add'],
    [frac(f.n, D), 'one-part'],
    [frac(f.n * k + 1, D), 'near'],
    [frac(f.n * k - 1, D), 'near']
  ];
  const { distractors, errorTags } = fracDistractors(answer, smart, true, rng);
  const split: Action = { kind: 'pizza', d: f.d, n: f.n, split: k };
  return {
    prompt: { text: `איזה שבר שווה ל-${fx(f)}?`, math: `${fx(f)} = ?`, visual: { kind: 'pizza', n: f.n, d: f.d }, speech: `איזה שבר שווה ל${fracWords(f)}?` },
    answer,
    distractors,
    errorTags,
    hints: [
      { text: `חותכים כל חלק ל-${k}: יש פי ${k} חלקים, ופי ${k} צבועים.`, action: split },
      { for: ['equiv-add', 'near'], text: 'כופלים למעלה ולמטה באותו מספר, לא מוסיפים.', action: split },
      { for: ['one-part', 'count-off-by-one'], text: 'כשחותכים, גם החלקים הצבועים נחתכים.', action: split }
    ],
    explanation: [
      { text: `זה ${fracWords(f)}.`, action: { kind: 'pizza', d: f.d, n: f.n } },
      { text: `חותכים כל חלק ל-${k}: אותה כמות פיצה.`, action: split },
      { text: `${fx(f)} = ${fx(answer)}.`, math: `${fx(f)} = ${fx(answer)}` }
    ],
    numeric: false,
    key: `fe:${fx(f)}=${fx(answer)}`
  };
}

/** frac.equiv level 2: `f` in its simplest form, by gluing every `k` slices together (6/8 = 3/4). */
function simplestQuestion(f: Frac, k: number, rng: R): Q {
  const answer = frac(f.n / k, f.d / k);
  const smart: [Frac, ErrorTag][] = [
    [frac(f.n - (f.d - answer.d), answer.d), 'equiv-add'],
    [frac(answer.n, f.d), 'one-part'],
    [frac(f.n, answer.d), 'one-part'],
    [frac(answer.n + 1, answer.d), 'near']
  ];
  const { distractors, errorTags } = fracDistractors(answer, smart, true, rng);
  const join: Action = { kind: 'pizza', d: f.d, n: f.n, join: k };
  return {
    prompt: { text: `איזה שבר מצומצם שווה ל-${fx(f)}?`, math: `${fx(f)} = ?`, visual: { kind: 'pizza', n: f.n, d: f.d }, speech: `איזה שבר מצומצם שווה ל${fracWords(f)}?` },
    answer,
    distractors,
    errorTags,
    hints: [
      { text: `מדביקים כל ${k} חלקים לחלק אחד גדול.`, action: join },
      { for: ['equiv-add', 'near'], text: `מחלקים למעלה ולמטה באותו מספר: ב-${k}.`, action: join },
      { for: ['one-part', 'count-off-by-one'], text: 'מחלקים גם את המונה וגם את המכנה.', action: join }
    ],
    explanation: [
      { text: `זה ${fracWords(f)}.`, action: { kind: 'pizza', d: f.d, n: f.n } },
      { text: `מדביקים כל ${k} חלקים: אותה כמות פיצה, חלקים גדולים יותר.`, action: join },
      { text: `${fx(f)} = ${fx(answer)}.`, math: `${fx(f)} = ${fx(answer)}` }
    ],
    numeric: false,
    key: `fs:${fx(f)}=${fx(answer)}`
  };
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export const fracEquiv: Generator = (level, rng) => {
  for (;;) {
    const d = rng.int(2, level.level === 1 ? 5 : 6);
    const n = rng.int(1, d - 1);
    if (gcd(n, d) !== 1) continue;
    const k = rng.int(2, 3);
    if (d * k > 12) continue;
    return level.level === 1 ? finerQuestion(frac(n, d), k, rng) : simplestQuestion(frac(n * k, d * k), k, rng);
  }
};

/** frac.add: a/d + b/d. Any fraction worth the sum counts (the question says so). */
export function fracAddQuestion(a: number, b: number, d: number, rng: R): Q {
  const answer = frac(a + b, d);
  const smart: [Frac, ErrorTag][] = [
    [frac(a + b, d + d), 'added-denominators'],
    [frac(a, d), 'one-part'],
    [frac(b, d), 'one-part'],
    [frac(a * b, d), 'near']
  ];
  const { distractors, errorTags } = fracDistractors(answer, smart, true, rng);
  const add: Action = { kind: 'pizza', d, n: a, add: b };
  const whole = a + b === d;
  return {
    prompt: { text: 'כמה זה? (אפשר גם שבר ששווה לו)', math: `${fx(frac(a, d))} + ${fx(frac(b, d))} = ?`, speech: `כמה זה ${fracWords(frac(a, d))} ועוד ${fracWords(frac(b, d))}?` },
    answer,
    distractors,
    errorTags,
    hints: [
      { text: `צובעים ${a} חלקים ועוד ${b} חלקים מאותה פיצה.`, action: add },
      { for: ['added-denominators'], text: `הפיצה לא נחתכת מחדש: היא נשארת ב-${d} חלקים.`, action: add },
      { for: ['one-part', 'near', 'count-off-by-one'], text: `מחברים רק את החלקים: ${a} ועוד ${b}.`, action: add }
    ],
    explanation: [
      { text: `צובעים ${fracWords(frac(a, d))}.`, action: { kind: 'pizza', d, n: a } },
      { text: `ועוד ${fracWords(frac(b, d))} מאותה פיצה.`, action: add },
      { text: whole ? `יוצאת פיצה שלמה: ${fx(answer)}.` : `יוצא ${fracWords(answer)}.`, math: `${fx(frac(a, d))} + ${fx(frac(b, d))} = ${fx(answer)}` }
    ],
    numeric: false,
    key: `fa:${a}/${d}+${b}/${d}`,
    equivalent: true,
    prompts: {
      slice: { text: `צובעים ${fx(frac(a, d))} ועוד ${fx(frac(b, d))} מהפיצה.`, math: `${fx(frac(a, d))} + ${fx(frac(b, d))}`, speech: `צובעים ${fracWords(frac(a, d))} ועוד ${fracWords(frac(b, d))} מהפיצה.` }
    }
  };
}

export const fracAdd: Generator = (level, rng) => {
  for (;;) {
    const d = rng.int(3, level.level === 1 ? 8 : 10);
    const a = rng.int(1, d - 1);
    const b = rng.int(1, d - 1);
    const s = a + b;
    if (level.level === 1 ? s >= d : s > d) continue;
    return fracAddQuestion(a, b, d, rng);
  }
};
