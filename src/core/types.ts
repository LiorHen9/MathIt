// Learning Core types (docs/ARCHITECTURE.md §4.1–4.2).
// Learning Core knows nothing about UI, worlds, sounds or animations: it takes "which skill, at
// which difficulty" and gives back a question that can check its own answer.
import type { Rng } from './rng';

/** The age bands of the skill graph. */
export type AgeBand = '4-5' | '6-7' | '8-9' | '10-12';
export const AGE_BANDS: readonly AgeBand[] = ['4-5', '6-7', '8-9', '10-12'];

export type SkillId = 'count.to10' | 'compare.to10' | 'add.within10' | 'sub.within10' | 'story.within10';

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
}

export type GeneratorId = 'count' | 'compare' | 'add' | 'sub' | 'story';

/** A comparison sign. */
export type Sign = '<' | '>' | '=';
/** A number, or a sign for comparisons. More kinds (fraction, time…) come with later skills. */
export type Answer = number | Sign;

/**
 * Something to look at, drawn by the UI (ui/Dots.tsx) – plain data, no pictures here.
 * - dots: `groups` of items side by side (one group = counting; two = adding or comparing);
 *   `crossed` items at the end of the last group are crossed out (taken away).
 */
export interface Visual {
  kind: 'dots';
  groups: number[];
  crossed?: number;
  /** Put a sign between the groups ("+" when adding, "?" when comparing). */
  between?: string;
  /** Show 1, 2, 3… under the items (a counting hint). */
  numbered?: boolean;
}

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
  | 'near'; // a nearby number, no known pattern

/**
 * An animated teaching action (docs/ARCHITECTURE.md §6.1): plain data that says *what* to show;
 * manipulatives/ turns it into motion and sound. Every action ends on a value (`actionResult`).
 * - count: `n` items appear one by one, each with its number (from 1).
 * - tenFrame: a 2×5 frame fills with `n` counters (a full ten is a chord).
 * - combine: a group of `a` and a group of `b` come together and are counted on from the bigger.
 * - takeAway: `a` items, `b` of them fly away, what is left is counted.
 * - jump: on a 0–10 number line, from `from`, `by` hops of one (negative = backwards).
 * - compare: a group of `a` and a group of `b` line up in pairs; the extra ones stand out.
 */
export type Action =
  | { kind: 'count'; n: number }
  | { kind: 'tenFrame'; n: number }
  | { kind: 'combine'; a: number; b: number }
  | { kind: 'takeAway'; a: number; b: number }
  | { kind: 'jump'; from: number; by: number }
  | { kind: 'compare'; a: number; b: number };

export type ActionKind = Action['kind'];
export const ACTION_KINDS: readonly ActionKind[] = ['count', 'tenFrame', 'combine', 'takeAway', 'jump', 'compare'];

/** The value an action ends on: the count, the sum, what is left, where the hops land, the sign. */
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
  }
}

/** The biggest number the animations can draw (one ten frame, a 0–10 number line). */
export const ACTION_MAX = 10;

/** Is an action drawable: whole numbers, nothing below 0 or above ten, at least something to show. */
export function actionValid(a: Action): boolean {
  const n = (x: number, lo = 0) => Number.isInteger(x) && x >= lo && x <= ACTION_MAX;
  switch (a.kind) {
    case 'count':
    case 'tenFrame':
      return n(a.n, 1);
    case 'combine':
      return n(a.a, 1) && n(a.b, 1) && a.a + a.b <= ACTION_MAX;
    case 'takeAway':
      return n(a.a, 1) && n(a.b, 1) && a.b <= a.a;
    case 'jump':
      return n(a.from) && Number.isInteger(a.by) && a.by !== 0 && n(a.from + a.by);
    case 'compare':
      return n(a.a) && n(a.b) && a.a + a.b > 0;
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
  const tag = wrong === undefined ? undefined : q.errorTags[String(wrong)];
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
  /** String(wrong answer) → the kind of mistake. */
  errorTags: Record<string, ErrorTag>;
  /** Hints: the default one first, then ones for particular mistakes (`pickHint`). */
  hints: Hint[];
  /** Step by step, animated, after the second mistake; the last action ends on the answer. */
  explanation: Step[];
  /** The answer can be typed on the number pad (a number, not a sign). */
  numeric: boolean;
  /** Same exercise = same key (to avoid repeats in a round): "3+4". */
  key: string;
}

export type Generator = (level: DifficultyLevel, rng: Rng) => Omit<Question, 'id' | 'skillId' | 'level' | 'seed' | 'choices'>;

/** Is this the right answer? (Typed answers arrive as numbers.) */
export function isCorrect(q: Pick<Question, 'answer'>, a: Answer): boolean {
  return q.answer === a;
}
