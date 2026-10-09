// The achievement ids (phase 10), on their own so storage can check a saved record without the
// achievements' rules and the map they read (core/achievements/index.ts). Stable: never rename.
export const ACHIEVEMENT_IDS = [
  'first-right',
  'first-lesson',
  'streak-10',
  'streak-25',
  'three-stars',
  'first-chest',
  'first-boss',
  'first-puzzle',
  'answers-100',
  'answers-1000',
  'days-3',
  'week',
  'chapter-puzzles',
  'chapter-perfect',
  'bosses-5',
  'table-master',
  'coins-100',
  'collector',
  'reviews-5',
  'journey-end',
] as const;

export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

/** The best run after one more answer: a first-try right answer adds one, anything else ends it. */
export function nextStreak(run: number, firstTry: boolean): number {
  return firstTry ? run + 1 : 0;
}
