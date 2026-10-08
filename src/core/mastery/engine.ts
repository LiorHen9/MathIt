// The mastery engine (docs/ARCHITECTURE.md §7.1–7.2), pure: no UI, no storage, no clock of its
// own (every function that needs the time takes `now`). Storage (storage/skillStates.ts) keeps
// these fields per profile and skill and calls `updateMastery` after every question.
//
// Mastery is a number 0..1, moved toward 1 by a right answer and toward 0 by a wrong one
// (a short Elo/BKT-like step): right the first time moves it most, and more when quick; right
// after a hint moves it a little; an answer that had to be shown pulls it down. 0.85 = mastered.
// Spaced review: a success when the skill is due pushes the next review 1 → 3 → 7 → 14 → 30
// days away; a mistake shortens it.
import type { ErrorTag, SkillId } from '../types';

export const MASTERED = 0.85;
export const RECENT = 10;
export const DAY = 24 * 60 * 60 * 1000;
/** Days to the next review after each success in a row. */
export const REVIEW_DAYS = [1, 3, 7, 14, 30] as const;
/** An answer slower than this counts as this (the child put the phone down). */
export const MAX_MS = 60_000;
/** Quicker than this (or than 3/4 of the child's own average) is "quick". */
export const QUICK_MS = 5_000;
/** Slower than this is "slow". */
export const SLOW_MS = 20_000;

export interface MasteryFields {
  /** 0..1 */
  mastery: number;
  /** Questions answered. */
  attempts: number;
  /** The last results, oldest first: true = right the first time. */
  recentResults: boolean[];
  /** A running average of the time to answer. */
  avgTimeMs: number;
  /** All the time spent answering (for parents, phase 8). */
  totalMs: number;
  /** ms since 1970; 0 = never. */
  lastPracticed: number;
  /** When to review (ms since 1970); 0 = not scheduled. */
  nextReview: number;
  /** Index in REVIEW_DAYS of the current gap; -1 = no success yet. */
  reviewStep: number;
  /** How many times each kind of mistake was made. */
  errorCounts: Partial<Record<ErrorTag, number>>;
}

export function emptyMastery(): MasteryFields {
  return { mastery: 0, attempts: 0, recentResults: [], avgTimeMs: 0, totalMs: 0, lastPracticed: 0, nextReview: 0, reviewStep: -1, errorCounts: {} };
}

/** One answered question. */
export interface AnswerResult {
  /** Solved by the child (false: the answer had to be shown). */
  correct: boolean;
  /** Mistakes before the right answer (or before it was shown). */
  wrongBefore: number;
  /** Time from the question to the right answer (or to it being shown). */
  ms: number;
  /** The kinds of the mistakes made on it. */
  errorTags?: ErrorTag[];
}

/** How far one answer moves mastery toward its target (0 or 1). */
export function stepSize(r: AnswerResult, avgTimeMs: number): { target: 0 | 1; k: number } {
  if (!r.correct) return { target: 0, k: 0.2 };
  if (r.wrongBefore > 0) return { target: 1, k: 0.06 };
  const ms = Math.min(MAX_MS, Math.max(0, r.ms));
  const quick = ms <= QUICK_MS || (avgTimeMs > 0 && ms <= avgTimeMs * 0.75);
  if (quick) return { target: 1, k: 0.32 };
  if (ms >= SLOW_MS) return { target: 1, k: 0.16 };
  return { target: 1, k: 0.25 };
}

/** The state after one more answer. Pure. */
export function updateMastery<T extends MasteryFields>(s: T, r: AnswerResult, now: number): T {
  const { target, k } = stepSize(r, s.avgTimeMs);
  const mastery = clamp01(s.mastery + k * (target - s.mastery));
  const ms = Math.min(MAX_MS, Math.max(0, Math.round(r.ms)));
  const avgTimeMs = s.attempts === 0 || s.avgTimeMs <= 0 ? ms : Math.round(s.avgTimeMs * 0.8 + ms * 0.2);
  const firstTry = r.correct && r.wrongBefore === 0;
  const errorCounts = { ...s.errorCounts };
  for (const t of r.errorTags ?? []) errorCounts[t] = (errorCounts[t] ?? 0) + 1;
  let { nextReview, reviewStep } = s;
  if (firstTry) {
    // A success counts for review only when the skill is due (or never scheduled).
    if (nextReview <= now) {
      reviewStep = Math.min(REVIEW_DAYS.length - 1, reviewStep + 1);
      nextReview = now + REVIEW_DAYS[reviewStep] * DAY;
    }
  } else {
    // A mistake brings the review closer: one gap back, counted from now.
    reviewStep = Math.max(0, reviewStep - 1);
    const sooner = now + REVIEW_DAYS[reviewStep] * DAY;
    nextReview = nextReview > now ? Math.min(nextReview, sooner) : sooner;
  }
  return {
    ...s,
    mastery,
    attempts: s.attempts + 1,
    recentResults: [...s.recentResults, firstTry].slice(-RECENT),
    avgTimeMs,
    totalMs: s.totalMs + ms,
    lastPracticed: now,
    nextReview,
    reviewStep,
    errorCounts
  };
}

export function isMastered(s: Pick<MasteryFields, 'mastery'> | undefined): boolean {
  return !!s && s.mastery >= MASTERED;
}

/** Scheduled for review (played, or placed by the placement game), and the date has come. */
export function isDue(s: Pick<MasteryFields, 'nextReview'> | undefined, now: number): boolean {
  return !!s && s.nextReview > 0 && s.nextReview <= now;
}

/** The child's most common kind of mistake on a skill (made at least twice), if any. */
export function commonError(counts: Partial<Record<ErrorTag, number>> | undefined, min = 2): ErrorTag | undefined {
  let best: ErrorTag | undefined;
  let n = min - 1;
  for (const [t, c] of Object.entries(counts ?? {}) as [ErrorTag, number][]) {
    if (c > n) {
      best = t;
      n = c;
    }
  }
  return best;
}

/** Skills whose review has come, the most overdue first. */
export function dueSkills(states: Partial<Record<string, MasteryFields>>, now: number): SkillId[] {
  return (Object.entries(states) as [SkillId, MasteryFields][])
    .filter(([, s]) => isDue(s, now))
    .sort((a, b) => a[1].nextReview - b[1].nextReview)
    .map(([id]) => id);
}

function clamp01(x: number): number {
  return Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0;
}

/** Fill missing fields and drop broken ones (older or hand-edited records). */
export function normalizeMastery(raw: Partial<MasteryFields> | undefined): MasteryFields {
  const d = emptyMastery();
  if (!raw) return d;
  const num = (v: unknown, lo: number, hi: number, def: number) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : def);
  const errorCounts: Partial<Record<ErrorTag, number>> = {};
  if (raw.errorCounts && typeof raw.errorCounts === 'object')
    for (const [k, v] of Object.entries(raw.errorCounts)) if (Number.isInteger(v) && (v as number) > 0) errorCounts[k as ErrorTag] = v as number;
  return {
    mastery: num(raw.mastery, 0, 1, 0),
    attempts: Math.floor(num(raw.attempts, 0, 1e9, 0)),
    recentResults: Array.isArray(raw.recentResults) ? raw.recentResults.filter((x) => typeof x === 'boolean').slice(-RECENT) : [],
    avgTimeMs: num(raw.avgTimeMs, 0, MAX_MS, 0),
    totalMs: num(raw.totalMs, 0, 1e12, 0),
    lastPracticed: num(raw.lastPracticed, 0, 1e15, 0),
    nextReview: num(raw.nextReview, 0, 1e15, 0),
    reviewStep: Math.floor(num(raw.reviewStep, -1, REVIEW_DAYS.length - 1, -1)),
    errorCounts
  };
}

