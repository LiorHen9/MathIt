// Decimals (phase 9): dec.read – a square of 100 as a decimal (level 1 tenths, level 2
// hundredths); dec.compare – which is bigger (level 1 tenths, level 2 tenths against hundredths:
// 0.3 ? 0.25); dec.add – adding (level 1 tenths, level 2 hundredths).
// Everything is worked in whole hundredths and turned into a number only at the end (h / 100),
// so there is never a floating-point slip (0.1 + 0.2 is 0.3 here).
// Smart wrong answers: 'decimal-as-whole' (the digits after the point as a whole number: 0.5 + 0.7
// → 0.12, three tenths → 0.03), 'longer-is-bigger' (0.25 > 0.3), 'swapped-digits', one off.
// The pictures and explanations are squares of 100: a column is a tenth, a square a hundredth.
import { answerKey, type Action, type ErrorTag, type Generator, type Hint } from '../types';
import type { Rng } from '../rng';

type Q = ReturnType<Generator>;
type Lv = Parameters<Generator>[0];

/** Hundredths as the number a child reads: 30 → 0.3, 125 → 1.25. */
export const dec = (h: number): number => Math.round(h) / 100;
/** The written form (the same as the number's own). */
export const decText = (h: number): string => String(dec(h));

/**
 * Wrong decimals: the smart ones (in hundredths) first, then neighbours a tenth or a hundredth
 * away; never the answer, never twice, inside the level's range, never negative.
 */
export function decDistractors(answer: number, smart: [number, ErrorTag][], level: Lv, rng: Rng, fine: boolean): { distractors: number[]; errorTags: Record<string, ErrorTag> } {
  const out: number[] = [];
  const errorTags: Record<string, ErrorTag> = {};
  const ok = (h: number) => Number.isInteger(h) && h >= 0 && dec(h) >= level.min && dec(h) <= level.max && h !== answer && !out.includes(h);
  for (const [h, tag] of smart) {
    if (out.length >= 3) break;
    if (ok(h)) {
      out.push(h);
      errorTags[answerKey(dec(h))] = tag;
    }
  }
  const step = fine ? 1 : 10;
  for (const h of rng.shuffle([answer + step, answer - step, answer + 2 * step, answer - 2 * step, answer + 10 * step])) {
    if (out.length >= 3) break;
    if (ok(h)) {
      out.push(h);
      errorTags[answerKey(dec(h))] = Math.abs(h - answer) === step ? 'count-off-by-one' : 'near';
    }
  }
  return { distractors: out.map(dec), errorTags };
}

/** dec.read: `h` hundredths coloured in a square of 100. */
export function decReadQuestion(h: number, level: Lv, rng: Rng): Q {
  const tenths = h % 10 === 0;
  const smart: [number, ErrorTag][] = tenths
    ? [
        [h / 10, 'decimal-as-whole'],
        [h * 10, 'decimal-as-whole']
      ]
    : [
        [h * 10, 'decimal-as-whole'],
        [(h % 10) * 10 + Math.floor(h / 10), 'swapped-digits'],
        [h * 100, 'decimal-as-whole']
      ];
  const { distractors, errorTags } = decDistractors(h, smart, level, rng, !tenths);
  const pic: Action = { kind: 'decimal', a: h };
  const t = Math.floor(h / 10);
  const o = h % 10;
  const hints: Hint[] = [
    { text: tenths ? `כל טור מלא הוא עשירית: יש ${t} טורים.` : `${t} טורים מלאים הם ${t} עשיריות, ועוד ${o} משבצות.`, action: pic },
    { for: ['decimal-as-whole'], text: tenths ? 'עשירית אחת היא טור אחד, הספרה הראשונה אחרי הנקודה.' : 'משבצת היא מאית: הספרה השנייה אחרי הנקודה.', action: pic },
    { for: ['count-off-by-one', 'near', 'swapped-digits'], text: 'סופרים קודם טורים מלאים, ואז משבצות.', action: pic }
  ];
  return {
    prompt: { text: 'איזה מספר עשרוני מראה הריבוע?', visual: { kind: 'hundred', n: h }, speech: 'איזה מספר עשרוני מראה הריבוע?' },
    answer: dec(h),
    distractors,
    errorTags,
    hints,
    explanation: [
      { text: 'הריבוע כולו הוא שלם אחד, ויש בו 100 משבצות.', action: { kind: 'decimal', a: 0 } },
      { text: tenths ? `צובעים ${t} טורים: ${t} עשיריות.` : `צובעים ${t} טורים ועוד ${o}: ${h} מאיות.`, action: pic },
      { text: `כותבים ${decText(h)}.`, math: decText(h) }
    ],
    numeric: false,
    key: `dr:${h}`
  };
}

export const decRead: Generator = (level, rng) => {
  if (level.level === 1) return decReadQuestion(rng.int(1, 9) * 10, level, rng);
  let h = rng.int(11, 99);
  while (h % 10 === 0) h = rng.int(11, 99);
  return decReadQuestion(h, level, rng);
};

/** dec.compare: two decimals (in hundredths). */
export function decCompareQuestion(a: number, b: number): Q {
  const answer = a > b ? '>' : a < b ? '<' : '=';
  const longer = (h: number) => h % 10 !== 0;
  // The trap: the one with more digits is the smaller (0.25 < 0.3).
  const trap = a !== b && longer(a) !== longer(b) && (longer(a) ? a < b : b < a);
  const errorTags: Record<string, ErrorTag> = {};
  const others = (['<', '>', '='] as const).filter((s) => s !== answer);
  for (const s of others) errorTags[s] = s === '=' || answer === '=' ? 'not-equal' : trap ? 'longer-is-bigger' : 'reversed-sign';
  const vs: Action = { kind: 'decimal', a, vs: b };
  return {
    prompt: { text: 'איזה סימן חסר?', math: `${decText(a)} ? ${decText(b)}`, speech: `מה גדול יותר: ${decText(a)} או ${decText(b)}?` },
    answer,
    distractors: others,
    errorTags,
    hints: [
      { text: 'משווים קודם את העשיריות – הטורים המלאים.', action: vs },
      { for: ['reversed-sign', 'not-equal'], text: 'הפה של הסימן פתוח אל המספר הגדול.', action: vs },
      { for: ['longer-is-bigger'], text: 'יותר ספרות זה לא יותר גדול: משווים עשיריות לעשיריות.', action: vs }
    ],
    explanation: [
      { text: `${decText(a)} בריבוע אחד.`, action: { kind: 'decimal', a } },
      { text: `${decText(b)} בריבוע השני, ומשווים כמה צבוע.`, action: vs },
      { text: answer === '=' ? 'הם שווים.' : `${decText(a)} ${answer} ${decText(b)}.`, math: `${decText(a)} ${answer} ${decText(b)}` }
    ],
    numeric: false,
    key: `dc:${a}?${b}`
  };
}

export const decCompare: Generator = (level, rng) => {
  if (level.level === 1) {
    const a = rng.int(1, 9) * 10;
    const b = rng.next() < 0.1 ? a : rng.int(1, 9) * 10;
    return decCompareQuestion(a, b);
  }
  // Tenths against hundredths, often the trap; sometimes 0.4 = 0.40 (written the same here: equal).
  const t = rng.int(1, 9) * 10;
  const hh = rng.int(1, 99);
  return rng.next() < 0.5 ? decCompareQuestion(t, hh) : decCompareQuestion(hh, t);
};

/** dec.add: a + b (in hundredths). */
export function decAddQuestion(a: number, b: number, level: Lv, rng: Rng): Q {
  const s = a + b;
  const fine = a % 10 !== 0 || b % 10 !== 0;
  const smart: [number, ErrorTag][] = [];
  // The digits after the point added as whole numbers: 0.5 + 0.7 → 0.12; 0.35 + 0.4 → 0.39.
  if (!fine) smart.push([a / 10 + b / 10, 'decimal-as-whole']);
  else {
    if (a % 10 === 0) smart.push([a / 10 + b, 'decimal-as-whole']);
    else if (b % 10 === 0) smart.push([a + b / 10, 'decimal-as-whole']);
    else smart.push([(a % 10) + (b % 10) > 9 ? s - 10 : s + 10, 'near']);
  }
  smart.push([s + 10, 'near'], [s - 10, 'near']);
  const { distractors, errorTags } = decDistractors(s, smart, level, rng, fine);
  const add: Action = { kind: 'decimal', a, b };
  return {
    prompt: { text: 'כמה זה?', math: `${decText(a)} + ${decText(b)} = ?`, speech: `כמה זה ${decText(a)} ועוד ${decText(b)}?` },
    answer: dec(s),
    distractors,
    errorTags,
    hints: [
      { text: 'מחברים עשיריות לעשיריות ומאיות למאיות.', action: add },
      { for: ['decimal-as-whole'], text: 'הנקודה מתחת לנקודה: עשר עשיריות הן שלם.', action: add },
      { for: ['near', 'count-off-by-one'], text: 'סופרים את הטורים המלאים, ואז את המשבצות.', action: add }
    ],
    explanation: [
      { text: `צובעים ${decText(a)}.`, action: { kind: 'decimal', a } },
      { text: `ועוד ${decText(b)}${s > 100 ? ': ריבוע מלא הוא שלם אחד' : ''}.`, action: add },
      { text: `יוצא ${decText(s)}.`, math: `${decText(a)} + ${decText(b)} = ${decText(s)}` }
    ],
    numeric: false,
    key: `da:${a}+${b}`
  };
}

export const decAdd: Generator = (level, rng) => {
  if (level.level === 1) {
    const a = rng.int(1, 9) * 10;
    const b = rng.int(1, 9) * 10;
    return decAddQuestion(a, b, level, rng);
  }
  for (;;) {
    const a = rng.int(1, 99);
    const b = rng.next() < 0.4 ? rng.int(1, 9) * 10 : rng.int(1, 99);
    if (a % 10 === 0 && b % 10 === 0) continue;
    return rng.next() < 0.5 ? decAddQuestion(a, b, level, rng) : decAddQuestion(b, a, level, rng);
  }
};
