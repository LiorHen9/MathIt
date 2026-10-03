// Helpers shared by the generators.
import type { Rng } from '../rng';
import type { Answer, DifficultyLevel, ErrorTag } from '../types';

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
  want = DISTRACTORS
): { distractors: number[]; errorTags: Record<string, ErrorTag> } {
  const out: number[] = [];
  const errorTags: Record<string, ErrorTag> = {};
  const ok = (n: number) => Number.isInteger(n) && n >= level.min && n <= level.max && n !== answer && !out.includes(n);
  for (const [n, tag] of smart) {
    if (out.length >= want) break;
    if (ok(n)) {
      out.push(n);
      errorTags[String(n)] = tag;
    }
  }
  if (out.length < want) {
    const rest: { n: number; d: number; r: number }[] = [];
    for (let n = level.min; n <= level.max; n++) if (ok(n)) rest.push({ n, d: Math.abs(n - answer), r: rng.next() });
    rest.sort((x, y) => x.d - y.d || x.r - y.r);
    for (const { n } of rest.slice(0, want - out.length)) {
      out.push(n);
      errorTags[String(n)] = Math.abs(n - answer) === 1 ? 'count-off-by-one' : 'near';
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
  return String(a);
}
