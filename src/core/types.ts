// Learning Core types (docs/ARCHITECTURE.md §4.1–4.2).
// Learning Core knows nothing about UI, worlds, sounds or animations: it takes "which skill, at
// which difficulty" and gives back a question that can check its own answer.
import type { Rng } from './rng';

/** The age bands of the skill graph. */
export type AgeBand = '4-5' | '6-7' | '8-9' | '10-12';
export const AGE_BANDS: readonly AgeBand[] = ['4-5', '6-7', '8-9', '10-12'];

export type SkillId = 'count.to10' | 'compare.to10' | 'add.within10' | 'sub.within10';

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

export type GeneratorId = 'count' | 'compare' | 'add' | 'sub';

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
  /** One short sentence for the child: "כמה כוכבים יש?" (neutral Hebrew – no gender here). */
  text: string;
  /** The exercise, left to right: "3 + 4 = ?", "8 ? 3". `?` is the slot for the answer. */
  math?: string;
  visual?: Visual;
  /** What to read aloud (one sentence; audio/speech.ts reads the signs in Hebrew). */
  speech: string;
}

/** Why a wrong answer is wrong, for hints now and for choosing explanations later (phase 6). */
export type ErrorTag =
  | 'count-off-by-one' // one too many or too few: a counting slip
  | 'added' // added instead of subtracting
  | 'subtracted' // subtracted instead of adding
  | 'one-part' // answered with one of the numbers in the exercise
  | 'reversed-sign' // the opposite comparison sign
  | 'not-equal' // "=" for different numbers, or a sign for equal ones
  | 'near'; // a nearby number, no known pattern

export interface Hint {
  /** One sentence (neutral Hebrew). */
  text: string;
  visual?: Visual;
}

export interface Step {
  text: string;
  math?: string;
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
  /** Graded hints: the first after one mistake, more in phase 3. */
  hints: Hint[];
  /** Step by step, after the second mistake (animated in phase 3). */
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
