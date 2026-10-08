// Helpers shared by the generators.
import type { Rng } from '../rng';
import { answerKey, type Answer, type DifficultyLevel, type ErrorTag } from '../types';

/** How many wrong choices a question offers next to the answer (4 bubbles). */
export const DISTRACTORS = 3;

/**
 * Pick `want` wrong numbers: first the "smart" ones (common mistakes, in the order given) that are
 * inside the level's range, then the nearest other numbers in range (ties broken by the rng).
 * Never the answer, never twice, never outside [min, max].
 */
export function numberDistractors(
  answer: number,
  smart: [number, ErrorTag][],
  level: DifficultyLevel,
  rng: Rng,
  want = DISTRACTORS,
  /** The grid of possible answers: 1 (whole numbers), 0.5 (money with fifty agorot). */
  step = 1
): { distractors: number[]; errorTags: Record<string, ErrorTag> } {
  const out: number[] = [];
  const errorTags: Record<string, ErrorTag> = {};
  const ok = (n: number) => Number.isInteger(n / step) && n >= level.min && n <= level.max && n !== answer && !out.includes(n);
  for (const [n, tag] of smart) {
    if (out.length >= want) break;
    if (ok(n)) {
      out.push(n);
      errorTags[String(n)] = tag;
    }
  }
  if (out.length < want) {
    const rest: { n: number; d: number; r: number }[] = [];
    for (let n = level.min; n <= level.max; n += step) if (ok(n)) rest.push({ n, d: Math.abs(n - answer), r: rng.next() });
    rest.sort((x, y) => x.d - y.d || x.r - y.r);
    for (const { n } of rest.slice(0, want - out.length)) {
      out.push(n);
      errorTags[String(n)] = Math.abs(n - answer) === step ? 'count-off-by-one' : 'near';
    }
  }
  return { distractors: out, errorTags };
}

/** "1, 2, 3" – counting aloud, for explanations. */
export function countList(from: number, to: number): string {
  const xs: number[] = [];
  for (let i = from; i <= to; i++) xs.push(i);
  return xs.join(', ');
}

export function asAnswer(a: Answer): string {
  return answerKey(a);
}

/**
 * Hops on a number line for adding `by` (negative: taking away): tens first, then the ones – split
 * at the next ten, so the line shows "making ten" (38 + 25: +10 +10 +2 +3).
 */
export function hopsFor(from: number, by: number): number[] {
  const s = Math.sign(by);
  const mag = Math.abs(by);
  const hops: number[] = [];
  for (let i = 0; i < Math.floor(mag / 10); i++) hops.push(10 * s);
  const ones = mag % 10;
  if (ones) {
    const pos = from + s * 10 * Math.floor(mag / 10);
    const d = s > 0 ? (10 - (pos % 10)) % 10 : pos % 10;
    if (d > 0 && d < ones) hops.push(s * d, s * (ones - d));
    else hops.push(s * ones);
  }
  return hops;
}

/** "קפיצה אחת" / "3 קפיצות". */
export function hopsWord(n: number): string {
  return n === 1 ? 'קפיצה אחת' : `${n} קפיצות`;
}

/** Tens and ones of a number. */
export function digits(n: number): { t: number; o: number } {
  return { t: Math.floor(n / 10), o: n % 10 };
}
