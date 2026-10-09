// Choosing questions by the child's history (docs/ARCHITECTURE.md §7.3), pure and seeded:
// - `invites(q, tag)`: does this question give room for that kind of mistake (a counting slip is
//   invited by +1/−1/+2 and by many things to count; "added instead" by a take-away whose sum
//   fits in the level; phase 7: "forgot the rest after ten" by an exercise that crosses ten,
//   "no carry" / "no borrow" by one that needs it; the rest – phase 9's times, fractions,
//   decimals and shapes too – by the wrong answer being on offer)? A round for a child with a common mistake asks more of these, to
//   practise exactly that.
// - `pickQuestion`: one new question at a level, not repeating the round's exercises, weighted.
// - `sisterOf`: a question that comes back after its answer was shown – a "sister" with the
//   same kind of mistake on offer, or the same exercise if none is found.
// - `makeAdaptiveRound`: a whole round of `n` (the same rules, all at one level).
// Loaded with the game (it needs the generators).
import { makeQuestion } from '../generators/index';
import { createRng, type Rng } from '../rng';
import { answerKey, type ErrorTag, type Question, type SkillId } from '../types';

/** The share of questions picked to invite the child's common mistake. */
export const INVITE_SHARE = 0.5;
const TRIES = 24;

/** The numbers in an exercise: [a, op, b] for + and −, [n] for counting, [a, '?', b] for signs. */
function parts(q: Pick<Question, 'key'>): { a: number; op: string; b: number } | null {
  let m = /(\d+)([+\-?])(\d+)$/.exec(q.key);
  if (m) return { a: Number(m[1]), op: m[2], b: Number(m[3]) };
  m = /^count:(\d+)$/.exec(q.key);
  return m ? { a: Number(m[1]), op: '#', b: 0 } : null;
}

/** Does the question give room for this kind of mistake? */
export function invites(q: Pick<Question, 'key' | 'errorTags' | 'answer'>, tag: ErrorTag): boolean {
  const p = parts(q);
  const offered = Object.values(q.errorTags).includes(tag);
  if (!p) return offered;
  switch (tag) {
    case 'count-off-by-one':
    case 'near':
      // Many to count, counting on by one or two, or numbers next to each other.
      if (p.op === '#') return p.a >= 6;
      if (p.op === '?') return Math.abs(p.a - p.b) === 1;
      return Math.min(p.a, p.b) <= 2 || (p.op === '-' && p.b <= 2);
    case 'reversed-sign':
      return p.op === '?' && p.a !== p.b && (p.a < p.b || Math.abs(p.a - p.b) <= 2);
    case 'not-equal':
      return p.op === '?' && Math.abs(p.a - p.b) <= 1;
    // Phase 7: making ten, carrying, borrowing – the exercises that need them.
    case 'no-bridge':
      return p.op === '+' ? p.a < 10 && p.b < 10 && p.a + p.b > 10 : p.op === '-' && p.a > 10 && p.a < 20 && p.b > p.a % 10 && p.a - p.b < 10;
    // In columns (phase 9) the carry may be in any column: the wrong answer on offer says so.
    case 'no-carry':
      return offered || (p.op === '+' && (p.a % 10) + (p.b % 10) >= 10 && Math.max(p.a, p.b) >= 10);
    case 'no-borrow':
      return offered || (p.op === '-' && p.b % 10 > p.a % 10 && p.a >= 20);
    default:
      // added / subtracted / one-part: that wrong answer is among the choices.
      return offered;
  }
}

/** One new question for a round: not one of `avoid` (keys), not the same answer as `last`. */
export function pickQuestion(skillId: SkillId, level: number, rng: Rng, avoid: ReadonlySet<string>, opts: { last?: Question; common?: ErrorTag } = {}): Question {
  const want = opts.common && rng.next() < INVITE_SHARE ? opts.common : undefined;
  let fallback: Question | null = null;
  for (let t = 0; t < TRIES; t++) {
    const q = makeQuestion(skillId, level, rng.int(0, 0x7fffffff));
    const fresh = !avoid.has(q.key) && (!opts.last || answerKey(opts.last.answer) !== answerKey(q.answer));
    if (fresh && (!want || invites(q, want))) return q;
    if (fresh && !fallback) fallback = q;
  }
  return fallback ?? makeQuestion(skillId, level, rng.int(0, 0x7fffffff));
}

/**
 * The question that comes back later in the round after `q`'s answer was shown: a different
 * exercise of the same skill and level that offers the same kind of mistake (`tag`), or `q`
 * itself when none turns up.
 */
export function sisterOf(q: Question, tag: ErrorTag | undefined, seed: number, avoid: ReadonlySet<string>): Question {
  const rng = createRng(seed);
  for (let t = 0; t < TRIES * 2; t++) {
    const s = makeQuestion(q.skillId, q.level, rng.int(0, 0x7fffffff));
    if (s.key === q.key || avoid.has(s.key)) continue;
    if (!tag || Object.values(s.errorTags).includes(tag)) return s;
  }
  return q;
}

/** A round of `n` questions at one level, weighted toward the child's common mistake. */
export function makeAdaptiveRound(skillId: SkillId, level: number, seed: number, n: number, common?: ErrorTag): Question[] {
  const rng = createRng(seed);
  const out: Question[] = [];
  const seen = new Set<string>();
  while (out.length < n) {
    const q = pickQuestion(skillId, level, rng, seen, { last: out.at(-1), common });
    seen.add(q.key);
    out.push(q);
  }
  return out;
}
