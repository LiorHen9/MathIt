// Word problems with placeholders (docs/ARCHITECTURE.md §5 "vocabulary"): the core writes a story
// once – "{place} יש {a} {items}. מוסיפים עוד {b}." – and the world fills in its own words
// (fairies: magic stones in the garden; football: balls on the pitch…). The numbers and the
// math never change; only the nouns do. Learning Core: no UI, no worlds – the screen hands the
// words in (the world's vocabulary and the hero's name for the child's gender).
//
// The stories are written so no verb agrees with the child or with the noun: impersonal plural
// ("מוסיפים", "לוקחים"), "יש"/"היו", and past plural ("נשארו"), which Hebrew does not mark for gender.
import type { PromptParts, Question } from './types';

/** The placeholders a story may use. */
export const PLACEHOLDERS = ['hero', 'items', 'place', 'thing'] as const;
export type Placeholder = (typeof PLACEHOLDERS)[number];

/**
 * A world's words for stories. `items`: a plural noun of countable things ("אבני קסם", "כדורים");
 * `place`: where, with its preposition ("בגינה הקסומה", "על המגרש"); `thing`: one thing for sale
 * in the world's shop, singular ("שרביט קסם", "כדור"; phase 7, money). Several of each: a question
 * picks one by its seed, so the same question always reads the same.
 */
export type Vocabulary = Record<Exclude<Placeholder, 'hero'>, string[]>;

/** The words a story is filled with: the vocabulary and the hero's name (already by gender). */
export interface StoryWords extends Vocabulary {
  hero: string;
}

/** Used when no world gives words (tests, the base look). */
export const DEFAULT_WORDS: StoryWords = { hero: 'ינשוף החשבון', items: ['כוכבים', 'בלונים'], place: ['בכיתה', 'בחצר'], thing: ['מחברת', 'כדור'] };

const MARK = /\{([a-z]+)\}/g;

/** Does a text still have a {placeholder}? */
export function hasPlaceholders(text: string): boolean {
  return /\{[^}]*\}/.test(text);
}

/** Fill a text's placeholders; `pick` chooses among a word's options (the question's seed). */
export function fillText(text: string, words: StoryWords, pick = 0): string {
  return text.replace(MARK, (whole, key: string) => {
    if (key === 'hero') return words.hero;
    const opts = (words as unknown as Record<string, string[] | undefined>)[key];
    return opts && opts.length ? opts[Math.abs(Math.floor(pick)) % opts.length] : whole;
  });
}

const fillPrompt = (p: PromptParts, words: StoryWords, pick: number): PromptParts => ({ ...p, text: fillText(p.text, words, pick), speech: fillText(p.speech, words, pick) });

/** A question with its story filled in (a question without placeholders comes back as it is). */
export function fillQuestion(q: Question, words: StoryWords): Question {
  const all = [q.prompt, ...Object.values(q.prompts ?? {})];
  if (!all.some((p) => p && (hasPlaceholders(p.text) || hasPlaceholders(p.speech)))) return q;
  const prompts = q.prompts && Object.fromEntries(Object.entries(q.prompts).map(([k, p]) => [k, fillPrompt(p!, words, q.seed)]));
  return { ...q, prompt: fillPrompt(q.prompt, words, q.seed), ...(prompts ? { prompts } : {}) };
}
