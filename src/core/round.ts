// The rules of a practice round, without any UI: how answers turn into stars, and which level
// comes next. (The real mastery engine, with SkillState and spaced review, is phase 6.)

/** Mistakes allowed on one question before the answer is shown. */
export const MAX_WRONG = 2;
export const ROUND_LENGTH = 8;

/** Points for one question: right the first time 1, the second time ½, after being shown 0. */
export function questionPoints(wrongBefore: number, solved: boolean): number {
  if (!solved) return 0;
  return wrongBefore === 0 ? 1 : wrongBefore === 1 ? 0.5 : 0;
}

/**
 * 0–3 stars from the points of a round, as a share of the most possible:
 * ≥ 90% → 3, ≥ 65% → 2, ≥ 35% → 1. Eight questions: 7½+ → 3, 5¼+ → 2, 2¾+ → 1.
 */
export function starsFor(points: number, questions: number): 0 | 1 | 2 | 3 {
  if (questions <= 0) return 0;
  const share = points / questions;
  if (share >= 0.9) return 3;
  if (share >= 0.65) return 2;
  if (share >= 0.35) return 1;
  return 0;
}

/** Three stars → one level up; no stars → one down; otherwise stay. */
export function nextLevel(level: number, stars: number, maxLevel: number): number {
  if (stars === 3) return Math.min(maxLevel, level + 1);
  if (stars === 0) return Math.max(1, level - 1);
  return level;
}
