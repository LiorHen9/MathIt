// Learning Core types (docs/ARCHITECTURE.md §4.1–4.2).
// Learning Core knows nothing about UI, worlds, sounds or animations: it takes "which skill, at
// which difficulty" and gives back a question that can check its own answer.
import type { Rng } from './rng';

/** The age bands of the skill graph. */
export type AgeBand = '4-5' | '6-7' | '8-9' | '10-12';
export const AGE_BANDS: readonly AgeBand[] = ['4-5', '6-7', '8-9', '10-12'];

export type SkillId =
  | 'count.to10'
  | 'compare.to10'
  | 'add.within10'
  | 'sub.within10'
  | 'story.within10'
  // Phase 7: grades 1–2.
  | 'add.within20'
  | 'sub.within20'
  | 'add.bridge10'
  | 'sub.bridge10'
  | 'story.within20'
  | 'numbers.to100'
  | 'place.value'
  | 'pattern'
  | 'money'
  | 'clock'
  | 'add.within100'
  | 'sub.within100'
  // Phase 9: grades 3–6.
  | 'mul.table'
  | 'div'
  | 'mul.big'
  | 'story.muldiv'
  | 'col.add'
  | 'col.sub'
  | 'frac.part'
  | 'frac.compare'
  | 'frac.equiv'
  | 'frac.add'
  | 'dec.read'
  | 'dec.compare'
  | 'dec.add'
  | 'geo.area'
  | 'geo.perimeter';

/**
 * The game templates (docs/ARCHITECTURE.md §4.3): how a question is played. Data only – games/
 * draws them. Pop works for every question; the others where `templateFits` says so.
 */
export type TemplateId = 'pop' | 'jump' | 'build' | 'match' | 'clock' | 'shop' | 'slice' | 'pattern' | 'speed';
export const TEMPLATE_IDS: readonly TemplateId[] = ['pop', 'jump', 'build', 'match', 'clock', 'shop', 'slice', 'pattern', 'speed'];

/** A difficulty level: every number in the question and its choices stays in [min, max]. */
export interface DifficultyLevel {
  /** 1, 2, 3… */
  level: number;
  /** For parents (phase 8): "עד 5". */
  label: string;
  min: number;
  max: number;
}

export interface Skill {
  id: SkillId;
  /** "חיבור עד 10" */
  title: string;
  /** An emoji for the skill button. */
  icon: string;
  band: AgeBand;
  prerequisites: SkillId[];
  generatorId: GeneratorId;
  levels: DifficultyLevel[];
  /** The game templates this skill is played in (Pop first: the default, always there). */
  templates: TemplateId[];
}

export type GeneratorId =
  | 'count'
  | 'compare'
  | 'add'
  | 'sub'
  | 'story'
  | 'add20'
  | 'sub20'
  | 'bridgeAdd'
  | 'bridgeSub'
  | 'story20'
  | 'numbers100'
  | 'place'
  | 'pattern'
  | 'money'
  | 'clock'
  | 'add100'
  | 'sub100'
  | 'mulTable'
  | 'div'
  | 'mulBig'
  | 'storyMulDiv'
  | 'colAdd'
  | 'colSub'
  | 'fracPart'
  | 'fracCompare'
  | 'fracEquiv'
  | 'fracAdd'
  | 'decRead'
  | 'decCompare'
  | 'decAdd'
  | 'area'
  | 'perimeter';

/** A comparison sign. */
export type Sign = '<' | '>' | '=';
/** A time on an analog clock: `h` 1–12, `m` 0–55 (phase 7, the clock skill). */
export interface Time {
  h: number;
  m: number;
}
/** A fraction `n`/`d` (phase 9): 3/4 is { n: 3, d: 4 }. Never reduced on its own – 2/4 stays 2/4. */
export interface Frac {
  n: number;
  d: number;
}
/**
 * A number (money in shekels may end in .5 – fifty agorot; decimals in hundredths, phase 9), a
 * sign for comparisons, a time, or a fraction. Compare and key answers with `answerKey` /
 * `sameAnswer`, never with `===` (a time and a fraction are objects).
 */
export type Answer = number | Sign | Time | Frac;

export function isTime(a: unknown): a is Time {
  return typeof a === 'object' && a !== null && typeof (a as Time).h === 'number' && typeof (a as Time).m === 'number';
}

export function isFrac(a: unknown): a is Frac {
  return typeof a === 'object' && a !== null && typeof (a as Frac).n === 'number' && typeof (a as Frac).d === 'number';
}

/** The same amount: 2/4 and 1/2 (cross-multiplied, whole numbers only). */
export function sameValue(a: Frac, b: Frac): boolean {
  return a.d > 0 && b.d > 0 && a.n * b.d === b.n * a.d;
}

/** The answer as a stable string: "7", "<", "3:05", "3/4" – keys `errorTags`, choices and the DOM. */
export function answerKey(a: Answer): string {
  if (isFrac(a)) return `${a.n}/${a.d}`;
  return isTime(a) ? `${a.h}:${String(a.m).padStart(2, '0')}` : String(a);
}

export function sameAnswer(a: Answer, b: Answer): boolean {
  return answerKey(a) === answerKey(b);
}

/** Money as a child reads it: 7 → "7 ₪", 7.5 → "7.50 ₪". */
export function moneyText(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(2)} ₪`;
}

/** How an answer is shown: a number (with the question's unit), a sign, "3:30" or "3/4". */
export function answerText(a: Answer, unit?: string): string {
  if (typeof a === 'number') return unit === '₪' ? moneyText(a) : String(a);
  return answerKey(a);
}

/**
 * Something to look at, drawn by the UI (ui/Dots.tsx, ui/Picture.tsx) – plain data, no pictures here.
 * - dots: `groups` of items side by side (one group = counting; two = adding or comparing);
 *   `crossed` items at the end of the last group are crossed out (taken away).
 * - blocks: tens rods and ones cubes (place value, numbers to 100).
 * - coins: coins by value in shekels (0.5, 1, 2, 5, 10).
 * - clock: an analog clock showing h:m.
 */
export type Visual =
  | {
      kind: 'dots';
      groups: number[];
      crossed?: number;
      /** Put a sign between the groups ("+" when adding, "?" when comparing). */
      between?: string;
      /** Show 1, 2, 3… under the items (a counting hint). */
      numbered?: boolean;
    }
  | { kind: 'blocks'; tens: number; ones: number }
  | { kind: 'coins'; coins: number[] }
  | { kind: 'clock'; h: number; m: number }
  // Phase 9.
  /** A round pizza cut into `d` equal slices, `n` of them coloured. */
  | { kind: 'pizza'; n: number; d: number }
  /**
   * A rectangle `w` × `h` on a grid of squares (`sides`: drawn without the squares, the side
   * lengths written on it); `cut`: a corner of `cut.w` × `cut.h` missing (an L shape).
   */
  | { kind: 'grid'; w: number; h: number; cut?: { w: number; h: number }; sides?: boolean }
  /** An exercise written in columns ("במאונך"): the numbers one under the other, ones under ones. */
  | { kind: 'column'; rows: number[]; op: '+' | '−' }
  /** A square of 100: `n` hundredths coloured (a full column is a tenth). */
  | { kind: 'hundred'; n: number };

/** The coins (in shekels) a child meets: 50 agorot, 1, 2, 5 and 10 shekels. */
export const COIN_VALUES: readonly number[] = [10, 5, 2, 1, 0.5];

export interface PromptParts {
  /**
   * One short sentence for the child: "כמה כוכבים יש?" (neutral Hebrew – no gender here).
   * A word problem may hold placeholders ({hero}, {items}, {place}) that the world fills in
   * (core/story.ts); text and speech both.
   */
  text: string;
  /** The exercise, left to right: "3 + 4 = ?", "8 ? 3". `?` is the slot for the answer. */
  math?: string;
  visual?: Visual;
  /** What to read aloud (one sentence; audio/speech.ts reads the signs in Hebrew). */
  speech: string;
}

/** Why a wrong answer is wrong: chooses the hint, and (counted per skill, phase 6) the questions. */
export type ErrorTag =
  | 'count-off-by-one' // one too many or too few: a counting slip
  | 'added' // added instead of subtracting
  | 'subtracted' // subtracted instead of adding
  | 'one-part' // answered with one of the numbers in the exercise
  | 'reversed-sign' // the opposite comparison sign
  | 'not-equal' // "=" for different numbers, or a sign for equal ones
  | 'near' // a nearby number, no known pattern
  // Phase 7.
  | 'no-bridge' // making ten: stopped at 10 and forgot what was left (8 + 5 → 10)
  | 'swapped-digits' // read the tens as ones and the ones as tens (27 ↔ 72)
  | 'tens-as-ones' // counted the tens as ones (2 tens and 7 → 9; 30 + 40 → 7)
  | 'no-carry' // ten ones were not turned into a ten (38 + 25 → 53)
  | 'no-borrow' // took the small ones from the big ones instead of breaking a ten (52 − 17 → 45)
  | 'wrong-step' // a sequence continued with the wrong step (2, 4, 6 → 7)
  | 'hands-swapped' // read the clock's hands the other way round (3:00 → 12:15)
  // Phase 9.
  | 'times-as-plus' // added instead of multiplying (3 × 4 → 7), or took away instead of dividing
  | 'table-neighbor' // one group too many or too few (3 × 4 → 8 or 16)
  | 'remainder-dropped' // forgot what is left over (17 : 5 – the remainder is 0)
  | 'misaligned' // the numbers not lined up by place (345 + 27 → 615)
  | 'part-to-part' // the coloured part over the rest, not over the whole (3 of 4 → 3/1)
  | 'flipped-fraction' // the parts and the whole the other way round (3/4 → 4/3)
  | 'bigger-denominator' // a bigger denominator taken for a bigger fraction (1/8 > 1/4)
  | 'added-denominators' // added the denominators too (1/4 + 2/4 → 3/8)
  | 'equiv-add' // added the same number on top and below instead of multiplying (1/2 → 3/4)
  | 'decimal-as-whole' // the digits after the point read as a whole number (0.5 + 0.7 → 0.12)
  | 'longer-is-bigger' // more digits after the point taken for bigger (0.25 > 0.3)
  | 'area-perimeter' // the area for the perimeter, or the other way round
  | 'half-perimeter'; // the two sides once, not all four (a 5 × 3 rectangle → 8)

export const ERROR_TAGS: readonly ErrorTag[] = [
  'count-off-by-one',
  'added',
  'subtracted',
  'one-part',
  'reversed-sign',
  'not-equal',
  'near',
  'no-bridge',
  'swapped-digits',
  'tens-as-ones',
  'no-carry',
  'no-borrow',
  'wrong-step',
  'hands-swapped',
  'times-as-plus',
  'table-neighbor',
  'remainder-dropped',
  'misaligned',
  'part-to-part',
  'flipped-fraction',
  'bigger-denominator',
  'added-denominators',
  'equiv-add',
  'decimal-as-whole',
  'longer-is-bigger',
  'area-perimeter',
  'half-perimeter'
];

/**
 * An animated teaching action (docs/ARCHITECTURE.md §6.1): plain data that says *what* to show;
 * manipulatives/ turns it into motion and sound. Every action ends on a value (`actionResult`).
 * - count: `n` items appear one by one, each with its number (from 1).
 * - tenFrame: a 2×5 frame fills with `n` counters (a full ten is a chord).
 * - combine: a group of `a` and a group of `b` come together and are counted on from the bigger.
 * - takeAway: `a` items, `b` of them fly away, what is left is counted.
 * - jump: on a 0–10 number line, from `from`, `by` hops of one (negative = backwards).
 * - compare: a group of `a` and a group of `b` line up in pairs; the extra ones stand out
 *   (above ten: tens rods and ones cubes, the tens compared first).
 * Phase 7:
 * - tens: `tens` rods and `ones` cubes (ten cubes snap into a rod); then `add` more (rods and
 *   cubes arrive, ten loose cubes snap) or `take` some away (a rod breaks into ten cubes when the
 *   ones are not enough). `ask` = the answer is the number of tens / ones, not the value.
 * - doubleFrame: two ten frames: `a` counters, then `b` more fill the first frame to ten and the
 *   rest go to the second (making ten); a negative `b` takes away – the second frame empties first.
 * - line: a number line up to `max` (20 or 100), from `from`, hops of any size (tens and ones).
 * - clock: the hands turn from 12:00 to h:m, the minutes counted in fives.
 * - coins: coins (in shekels) land on a stack one by one, the total counted up.
 * Phase 9:
 * - array: `rows` rows of `cols` appear row by row, counted on by `cols` (multiplying is adding
 *   again and again); `turn` turns it round (3 × 4 = 4 × 3); `unit` 10: every dot is a ten.
 * - share: `total` things fly to `groups` plates one round at a time; what does not fill a
 *   round stays aside. `ask`: what each plate got, or what was left.
 * - pizza: a pizza is cut into `d` slices and `n` are coloured; then `add` more are coloured, or
 *   every slice is cut into `split` (2/4 → 4/8), or every `join` slices are glued (4/8 → 1/2);
 *   `vs`: a second pizza beside it, and the sign between them.
 * - column: `a` and `b` written in columns; column by column from the ones, a carried ten flies to
 *   the next column (or a ten is broken from it when taking away).
 * - grid: the squares of a `w` × `h` rectangle (minus a `cut` corner) fill row by row (the area),
 *   or the line around it stretches side by side (the perimeter).
 * - decimal: a square of 100 fills with `a` hundredths (a column = a tenth), then `b` more, or a
 *   second square of `vs` beside it and the sign between them.
 */
export type Action =
  | { kind: 'count'; n: number }
  | { kind: 'tenFrame'; n: number }
  | { kind: 'combine'; a: number; b: number }
  | { kind: 'takeAway'; a: number; b: number }
  | { kind: 'jump'; from: number; by: number }
  | { kind: 'compare'; a: number; b: number }
  | { kind: 'tens'; tens: number; ones: number; add?: number; take?: number; ask?: 'tens' | 'ones' }
  | { kind: 'doubleFrame'; a: number; b: number }
  | { kind: 'line'; from: number; hops: number[]; max: 20 | 100 }
  | { kind: 'clock'; h: number; m: number }
  | { kind: 'coins'; coins: number[] }
  | { kind: 'array'; rows: number; cols: number; turn?: boolean; unit?: 10 }
  | { kind: 'share'; total: number; groups: number; ask: 'each' | 'left' }
  | { kind: 'pizza'; d: number; n: number; add?: number; split?: number; join?: number; vs?: Frac }
  | { kind: 'column'; a: number; b: number; op: '+' | '-' }
  | { kind: 'grid'; w: number; h: number; cut?: { w: number; h: number }; ask: 'area' | 'perimeter' }
  | { kind: 'decimal'; a: number; b?: number; vs?: number };

export type ActionKind = Action['kind'];
export const ACTION_KINDS: readonly ActionKind[] = [
  'count',
  'tenFrame',
  'combine',
  'takeAway',
  'jump',
  'compare',
  'tens',
  'doubleFrame',
  'line',
  'clock',
  'coins',
  'array',
  'share',
  'pizza',
  'column',
  'grid',
  'decimal'
];

const sign = (x: number, y: number): Sign => (x > y ? '>' : x < y ? '<' : '=');

/** The area and the perimeter of a `w` × `h` rectangle with a corner `cut` off (an L shape). */
export function gridMeasures(w: number, h: number, cut?: { w: number; h: number }): { area: number; perimeter: number } {
  // Cutting a corner off moves two sides in and keeps the perimeter (a surprise worth showing).
  return { area: w * h - (cut ? cut.w * cut.h : 0), perimeter: 2 * (w + h) };
}

/** The value an action ends on: the count, the sum, what is left, where the hops land, the sign, the time. */
export function actionResult(a: Action): Answer {
  switch (a.kind) {
    case 'count':
    case 'tenFrame':
      return a.n;
    case 'combine':
      return a.a + a.b;
    case 'takeAway':
      return a.a - a.b;
    case 'jump':
      return a.from + a.by;
    case 'compare':
      return a.a > a.b ? '>' : a.a < a.b ? '<' : '=';
    case 'tens': {
      if (a.ask === 'tens') return a.tens;
      if (a.ask === 'ones') return a.ones;
      return a.tens * 10 + a.ones + (a.add ?? 0) - (a.take ?? 0);
    }
    case 'doubleFrame':
      return a.a + a.b;
    case 'line':
      return a.hops.reduce((x, h) => x + h, a.from);
    case 'clock':
      return { h: a.h, m: a.m };
    case 'coins':
      return Math.round(a.coins.reduce((x, c) => x + c, 0) * 100) / 100;
    case 'array':
      return a.rows * a.cols * (a.unit ?? 1);
    case 'share':
      return a.ask === 'each' ? Math.floor(a.total / a.groups) : a.total % a.groups;
    case 'pizza': {
      if (a.vs) return sign(a.n * a.vs.d, a.vs.n * a.d);
      if (a.split) return { n: a.n * a.split, d: a.d * a.split };
      if (a.join) return { n: a.n / a.join, d: a.d / a.join };
      return { n: a.n + (a.add ?? 0), d: a.d };
    }
    case 'column':
      return a.op === '+' ? a.a + a.b : a.a - a.b;
    case 'grid': {
      const m = gridMeasures(a.w, a.h, a.cut);
      return a.ask === 'area' ? m.area : m.perimeter;
    }
    case 'decimal':
      // Hundredths are whole numbers: no floating-point slips (0.1 + 0.2).
      return a.vs !== undefined ? sign(a.a, a.vs) : (a.a + (a.b ?? 0)) / 100;
  }
}

/**
 * The biggest number each animation can draw (ACTION_MAX for the phase 1 ones: one ten frame,
 * a 0–10 number line). Comparing goes to 100 (with tens rods), two frames to 20.
 */
export const ACTION_MAX = 10;
export const ACTION_LIMITS: Record<ActionKind, number> = {
  count: 10,
  tenFrame: 10,
  combine: 10,
  takeAway: 10,
  jump: 10,
  compare: 100,
  tens: 100,
  doubleFrame: 20,
  line: 100,
  clock: 12,
  coins: 100,
  // Phase 9: rows × cols (a ten per dot to 1,000), things shared, slices of a pizza, numbers in
  // columns (four columns), the side of a grid, hundredths (two squares).
  array: 1000,
  share: 100,
  pizza: 12,
  column: 9999,
  grid: 12,
  decimal: 200
};
/** At most this many hops on a line, coins on a stack (an animation a child can follow). */
export const MAX_HOPS = 12;
export const MAX_COINS = 10;

/** Is an action drawable: whole numbers in its range, at least something to show. */
export function actionValid(a: Action): boolean {
  const max = ACTION_LIMITS[a.kind];
  const n = (x: number, lo = 0, hi = max) => Number.isInteger(x) && x >= lo && x <= hi;
  switch (a.kind) {
    case 'count':
    case 'tenFrame':
      return n(a.n, 1);
    case 'combine':
      return n(a.a, 1) && n(a.b, 1) && a.a + a.b <= max;
    case 'takeAway':
      return n(a.a, 1) && n(a.b, 1) && a.b <= a.a;
    case 'jump':
      return n(a.from) && Number.isInteger(a.by) && a.by !== 0 && n(a.from + a.by);
    case 'compare':
      return n(a.a) && n(a.b) && a.a + a.b > 0;
    case 'tens': {
      if (!n(a.tens, 0, 10) || !n(a.ones, 0, 19) || (a.add !== undefined && a.take !== undefined)) return false;
      const v = a.tens * 10 + a.ones;
      if (v < 1 || v > max) return false;
      if (a.ask && (a.add !== undefined || a.take !== undefined || a.ones > 9)) return false;
      if (a.add !== undefined && (!n(a.add, 1) || v + a.add > max)) return false;
      if (a.take !== undefined && (!n(a.take, 1) || a.take > v || a.ones > 9)) return false;
      return true;
    }
    case 'doubleFrame':
      return n(a.a, 1) && Number.isInteger(a.b) && a.b !== 0 && n(a.a + a.b) && (a.b > 0 ? a.a <= 10 : true);
    case 'line': {
      if ((a.max !== 20 && a.max !== 100) || !n(a.from, 0, a.max) || !a.hops.length || a.hops.length > MAX_HOPS) return false;
      let at = a.from;
      for (const h of a.hops) {
        if (!Number.isInteger(h) || h === 0 || Math.abs(h) > 10) return false;
        at += h;
        if (at < 0 || at > a.max) return false;
      }
      return true;
    }
    case 'clock':
      return n(a.h, 1, 12) && Number.isInteger(a.m) && a.m >= 0 && a.m <= 55 && a.m % 5 === 0;
    case 'coins':
      return (
        a.coins.length >= 1 &&
        a.coins.length <= MAX_COINS &&
        a.coins.every((c) => COIN_VALUES.includes(c)) &&
        (actionResult(a) as number) <= max
      );
    case 'array':
      return n(a.rows, 1, 10) && n(a.cols, 1, 10) && (a.unit === undefined || a.unit === 10);
    case 'share':
      return n(a.total, 1) && n(a.groups, 2, 10) && a.total >= a.groups && Math.ceil(a.total / a.groups) <= 10 && (a.ask === 'each' || a.ask === 'left');
    case 'pizza': {
      if (!n(a.d, 1) || !n(a.n, 0, a.d)) return false;
      const extras = [a.add, a.split, a.join, a.vs].filter((x) => x !== undefined).length;
      if (extras > 1) return false;
      if (a.add !== undefined && !(n(a.add, 1) && a.n + a.add <= a.d)) return false;
      if (a.split !== undefined && !(n(a.split, 2, 4) && a.d * a.split <= max)) return false;
      if (a.join !== undefined && !(n(a.join, 2, 6) && a.d % a.join === 0 && a.n % a.join === 0)) return false;
      if (a.vs !== undefined && !(n(a.vs.d, 1) && n(a.vs.n, 0, a.vs.d))) return false;
      return true;
    }
    case 'column':
      return n(a.a, 1) && n(a.b, 1) && (a.op === '+' ? a.a + a.b <= max : a.op === '-' && a.b <= a.a);
    case 'grid':
      return (
        n(a.w, 1) &&
        n(a.h, 1) &&
        (a.ask === 'area' || a.ask === 'perimeter') &&
        (!a.cut || (n(a.cut.w, 1, a.w - 1) && n(a.cut.h, 1, a.h - 1)))
      );
    case 'decimal':
      return n(a.a, 0, 100) && (a.b === undefined || (n(a.b, 1, 100) && a.a + a.b <= max)) && (a.vs === undefined || (n(a.vs, 0, 100) && a.b === undefined));
  }
}

export interface Hint {
  /** One sentence (neutral Hebrew). */
  text: string;
  /** A static picture (the fallback when nothing animates). */
  visual?: Visual;
  /** The animation that shows the idea (manipulatives/). */
  action?: Action;
  /** Show this hint after these kinds of mistakes (`pickHint`); no `for` = the default hint. */
  for?: ErrorTag[];
}

/**
 * One step of an explanation: a sentence the hero says, optionally an exercise, and optionally
 * an animation that runs while it is said. A step without an action keeps the last one on screen.
 */
export interface Step {
  text: string;
  math?: string;
  visual?: Visual;
  action?: Action;
}

/**
 * The hint for a mistake: one made for that kind of mistake; else one for the child's most
 * common mistake on this skill (`common`, from the mastery engine – also for a hint shown before
 * any mistake); else the default (the first).
 */
export function pickHint(q: Pick<Question, 'hints' | 'errorTags'>, wrong?: Answer, common?: ErrorTag): Hint {
  const tag = wrong === undefined ? undefined : q.errorTags[answerKey(wrong)];
  const forTag = (t: ErrorTag | undefined) => (t ? q.hints.find((h) => h.for?.includes(t)) : undefined);
  return forTag(tag) || forTag(common) || q.hints.find((h) => !h.for) || q.hints[0];
}

export interface Question {
  /** `${skillId}:${level}:${seed}` – the same id always means the same question. */
  id: string;
  skillId: SkillId;
  level: number;
  seed: number;
  prompt: PromptParts;
  answer: Answer;
  /** Wrong answers worth offering (smart ones first), all different from the answer. */
  distractors: Answer[];
  /** The answer and the distractors in a fixed shuffled order (for bubbles). */
  choices: Answer[];
  /** answerKey(wrong answer) → the kind of mistake. */
  errorTags: Record<string, ErrorTag>;
  /** Hints: the default one first, then ones for particular mistakes (`pickHint`). */
  hints: Hint[];
  /** Step by step, animated, after the second mistake; the last action ends on the answer. */
  explanation: Step[];
  /** The answer can be typed on the number pad (a number, not a sign). */
  numeric: boolean;
  /** Same exercise = same key (to avoid repeats in a round): "3+4". */
  key: string;
  /** A unit shown after number answers ("₪" for money). */
  unit?: string;
  /**
   * Phase 9: a fraction that is worth the same counts as right too (2/4 for 1/2) – only when the
   * question says so (adding fractions, colouring a pizza); the choices never hold such a fraction.
   */
  equivalent?: boolean;
  /**
   * The same question asked another way in some templates: the clock template says "set the
   * hands to 3:30" where Pop asks "what time is it?"; the shop asks to pay. Same answer.
   */
  prompts?: Partial<Record<TemplateId, PromptParts>>;
}

export type Generator = (level: DifficultyLevel, rng: Rng) => Omit<Question, 'id' | 'skillId' | 'level' | 'seed' | 'choices'>;

/**
 * Is this the right answer? By kind: numbers, signs and times are compared by value; a fraction
 * as written (2/4 is not 1/2), unless the question accepts one worth the same (`equivalent`).
 */
export function isCorrect(q: Pick<Question, 'answer' | 'equivalent'>, a: Answer): boolean {
  if (q.equivalent && isFrac(q.answer) && isFrac(a)) return sameValue(q.answer, a);
  return sameAnswer(q.answer, a);
}

/** The question as a template asks it (its own prompt, if it has one). */
export function promptFor(q: Question, t: TemplateId): Question {
  const p = q.prompts?.[t];
  return p ? { ...q, prompt: p } : q;
}

/** Can this template play this question? (Pop plays everything.) */
export function templateFits(t: TemplateId, q: Pick<Question, 'answer' | 'unit' | 'prompt' | 'numeric' | 'prompts'>): boolean {
  const a = q.answer;
  switch (t) {
    case 'pop':
      return true;
    case 'jump':
      // A number on a number line.
      return typeof a === 'number' && Number.isInteger(a) && a >= 0 && a <= 100 && q.unit === undefined;
    case 'build':
      // Built from rods and cubes, or from coins – asked its own way ("בונים את המספר 47").
      return typeof a === 'number' && a > 0 && a <= 100 && (q.unit === '₪' || Number.isInteger(a)) && !!q.prompts?.build;
    case 'match':
      // An exercise card and its result card.
      return typeof a === 'number' && !!q.prompt.math && q.unit === undefined;
    case 'clock':
      return isTime(a);
    case 'shop':
      return q.unit === '₪' && typeof a === 'number' && a > 0 && !!q.prompts?.shop;
    // Phase 9.
    case 'slice':
      // A fraction coloured on a pizza – asked its own way ("צובעים 3/4 מהפיצה").
      return isFrac(a) && a.d <= 12 && !!q.prompts?.slice;
    case 'pattern':
      // A sequence with a gap, completed by placing a tile.
      return typeof a === 'number' && Number.isInteger(a) && !!q.prompts?.pattern?.math && q.prompts.pattern.math.includes('?');
    case 'speed':
      // Quick facts against a gentle clock (the times table).
      return typeof a === 'number' && Number.isInteger(a) && !!q.prompts?.speed;
  }
}
