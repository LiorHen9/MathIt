// The placement game (docs/ARCHITECTURE.md §7.4), pure: up to 10 questions on a ladder of
// (skill, level) rungs from "count to 5" to "perimeter of a compound shape" (phase 9: all ten
// chapters). It starts by age and climbs five rungs after every right answer; after the first
// mistake it halves the gap between the highest rung known and the lowest one failed (a beginner
// goes down fast instead); it stops when it finds the edge (right on one rung, wrong on the next),
// when the child is right on the top rung, or wrong on the bottom one.
// The result: the highest rung the child knows (and nothing failed below it), which skills are
// mastered (every level of them known), which ones are partly known, and from it the stations on
// the quest map that count as done.
import type { AgeBand, SkillId } from '../types';
import { AGE_BANDS } from '../types';

export interface Rung {
  skillId: SkillId;
  level: number;
}

/**
 * Easiest first, in the order of the quest map: chapter 1 (rungs 0–6), chapter 2 (7–12),
 * chapter 3 (13–14), chapter 4 (15–17), chapter 5 (18–21); phase 9 chapters 6–10 (22–33). A
 * level between two rungs of a skill is known when a higher rung is, so most skills need one or two.
 */
export const LADDER: readonly Rung[] = [
  { skillId: 'count.to10', level: 1 },
  { skillId: 'count.to10', level: 3 },
  { skillId: 'compare.to10', level: 2 },
  { skillId: 'add.within10', level: 2 },
  { skillId: 'sub.within10', level: 2 },
  { skillId: 'add.within10', level: 3 },
  { skillId: 'sub.within10', level: 3 },
  { skillId: 'add.within20', level: 1 },
  { skillId: 'sub.within20', level: 1 },
  { skillId: 'add.bridge10', level: 2 },
  { skillId: 'sub.bridge10', level: 2 },
  { skillId: 'add.within20', level: 2 },
  { skillId: 'sub.within20', level: 2 },
  { skillId: 'numbers.to100', level: 3 },
  { skillId: 'place.value', level: 3 },
  { skillId: 'pattern', level: 3 },
  { skillId: 'money', level: 3 },
  { skillId: 'clock', level: 3 },
  { skillId: 'add.within100', level: 2 },
  { skillId: 'sub.within100', level: 2 },
  { skillId: 'add.within100', level: 3 },
  { skillId: 'sub.within100', level: 3 },
  // Phase 9: chapter 6 (22–25), 7 (26–27), 8 (28–29), 9 (30–31), 10 (32–33).
  { skillId: 'mul.table', level: 2 },
  { skillId: 'mul.table', level: 3 },
  { skillId: 'div', level: 3 },
  { skillId: 'mul.big', level: 3 },
  { skillId: 'col.add', level: 3 },
  { skillId: 'col.sub', level: 3 },
  { skillId: 'frac.compare', level: 2 },
  { skillId: 'frac.add', level: 2 },
  { skillId: 'dec.compare', level: 2 },
  { skillId: 'dec.add', level: 2 },
  { skillId: 'geo.area', level: 3 },
  { skillId: 'geo.perimeter', level: 3 }
];

/**
 * Skills the ladder does not ask, known with another: word problems are the same sums told as a
 * story (to 10 with taking away to 10; to 20 with crossing ten backwards).
 */
export const IMPLIED: Partial<Record<SkillId, SkillId>> = {
  'story.within10': 'sub.within10',
  'story.within20': 'sub.bridge10',
  // Phase 9: times and sharing stories with division; a part of a whole with comparing fractions;
  // fractions worth the same with adding them; reading decimals with comparing them.
  'story.muldiv': 'div',
  'frac.part': 'frac.compare',
  'frac.equiv': 'frac.add',
  'dec.read': 'dec.compare'
};

/** The first rung of each chapter after the first (where a chapter starts on the ladder). */
export const CHAPTER_RUNGS = [7, 13, 15, 18, 22, 26, 28, 30, 32];

export const PLACEMENT_MAX = 10;

export interface PlacementState {
  /** The rung asked next (index in LADDER). */
  at: number;
  /** How far a right answer climbs (FIRST_JUMP until the first mistake). */
  jump: number;
  /** Rungs answered right / wrong. */
  passed: number[];
  failed: number[];
  asked: number;
  done: boolean;
}

/**
 * Where a child starts, by age (or an age band): kindergarten (≤ 5) at the bottom, first grade
 * (6) at adding to 10, second grade (7) at the start of chapter 2; phase 9: third grade (8) at
 * chapter 3, fourth (9) at chapter 5, fifth (10) at the times table (chapter 6), older ones at
 * columns (chapter 7). The bands: 8–9 as eight, 10–12 as ten.
 */
export function placementStart(age: number | AgeBand): number {
  const a = typeof age === 'number' ? age : [5, 6, 8, 10][AGE_BANDS.indexOf(age)] ?? 6;
  return a <= 5 ? 0 : a === 6 ? 3 : a === 7 ? 7 : a === 8 ? 13 : a === 9 ? 18 : a === 10 ? 22 : 26;
}

/** How far a right answer climbs before the first mistake (bigger steps on the long ladder). */
export const FIRST_JUMP = 5;

export function startPlacement(age: number | AgeBand, ladder: readonly Rung[] = LADDER): PlacementState {
  return { at: Math.min(placementStart(age), ladder.length - 1), jump: FIRST_JUMP, passed: [], failed: [], asked: 0, done: false };
}

/** After one answer (right the first time or not). Pure. */
export function placementStep(s: PlacementState, right: boolean, ladder: readonly Rung[] = LADDER): PlacementState {
  if (s.done) return s;
  const top = ladder.length - 1;
  const asked = s.asked + 1;
  const passed = right ? [...s.passed, s.at] : s.passed;
  const failed = right ? s.failed : [...s.failed, s.at];
  let at = s.at;
  let jump = s.jump;
  let done = asked >= PLACEMENT_MAX;
  if (!failed.length) {
    // Climbing: big steps while everything is right.
    if (s.at >= top) done = true;
    else at = Math.min(top, s.at + jump);
  } else if (!passed.length) {
    // Nothing right yet: down fast – half the way, at least a first jump (a beginner is not asked ten times).
    jump = 1;
    if (s.at <= 0) done = true;
    else at = Math.max(0, s.at - Math.max(FIRST_JUMP, Math.ceil(s.at / 2)));
  } else {
    // The edge is between the highest rung known and the lowest one failed above it: halve the gap.
    jump = 1;
    const lo = knownRung({ passed, failed });
    const above = failed.filter((f) => f > lo);
    const hi = above.length ? Math.min(...above) : top + 1;
    if (hi - lo <= 1 || lo >= top) done = true;
    else at = hi > top ? Math.min(top, lo + FIRST_JUMP) : Math.floor((lo + hi) / 2);
  }
  return { at, jump, passed, failed, asked, done };
}

/** The highest rung known: answered right, and no rung at or below it failed without a pass. */
export function knownRung(s: Pick<PlacementState, 'passed' | 'failed'>): number {
  const open = s.failed.filter((f) => !s.passed.includes(f));
  const lowestOpen = open.length ? Math.min(...open) : Infinity;
  const ok = s.passed.filter((p) => p < lowestOpen);
  return ok.length ? Math.max(...ok) : -1;
}

export interface PlacementResult {
  known: number;
  /** Every level of these is known. */
  mastered: SkillId[];
  /** The level to play next, for skills partly known. */
  partial: Partial<Record<SkillId, number>>;
}

export function placementResult(s: Pick<PlacementState, 'passed' | 'failed'>, levelsOf: (id: SkillId) => number, ladder: readonly Rung[] = LADDER): PlacementResult {
  const known = knownRung(s);
  const mastered: SkillId[] = [];
  const partial: Partial<Record<SkillId, number>> = {};
  const skills = [...new Set(ladder.map((r) => r.skillId))];
  for (const id of skills) {
    const rungs = ladder.map((r, i) => ({ ...r, i })).filter((r) => r.skillId === id);
    const knownLevels = rungs.filter((r) => r.i <= known).map((r) => r.level);
    if (!knownLevels.length) continue;
    const top = Math.max(...knownLevels);
    if (top >= levelsOf(id)) mastered.push(id);
    else partial[id] = top + 1;
  }
  return { known, mastered, partial };
}

/** Is this (skill, level) at or below what the child knows? */
export function rungKnown(skillId: SkillId, level: number, known: number, ladder: readonly Rung[] = LADDER): boolean {
  // A level between two rungs (count level 2) is known when a higher rung of the skill is.
  if (ladder.some((r, i) => i <= known && r.skillId === skillId && r.level >= level)) return true;
  // A skill the ladder does not ask: known when the one it goes with is known all the way.
  const via = IMPLIED[skillId];
  if (!via) return false;
  const top = Math.max(0, ...ladder.filter((r) => r.skillId === via).map((r) => r.level));
  return top > 0 && rungKnown(via, top, known, ladder);
}
