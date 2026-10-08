// The placement game (docs/ARCHITECTURE.md §7.4), pure: up to 10 questions on a ladder of
// (skill, level) rungs from "count to 5" to "take away within 10". It starts by age, climbs two
// rungs after a right answer (one after the first mistake), and steps down after a wrong one; it
// stops early when it finds the edge (right on one rung, wrong on the next), when the child is
// right on the top rung, or wrong on the bottom one.
// The result: the highest rung the child knows (and nothing failed below it), which skills are
// mastered (every level of them known), which ones are partly known, and from it the stations on
// the quest map that count as done.
import type { AgeBand, SkillId } from '../types';
import { AGE_BANDS } from '../types';

export interface Rung {
  skillId: SkillId;
  level: number;
}

/** Easiest first, in the order of the quest map's chapter 1. */
export const LADDER: readonly Rung[] = [
  { skillId: 'count.to10', level: 1 },
  { skillId: 'count.to10', level: 3 },
  { skillId: 'compare.to10', level: 1 },
  { skillId: 'compare.to10', level: 2 },
  { skillId: 'add.within10', level: 1 },
  { skillId: 'add.within10', level: 2 },
  { skillId: 'sub.within10', level: 1 },
  { skillId: 'sub.within10', level: 2 },
  { skillId: 'add.within10', level: 3 },
  { skillId: 'sub.within10', level: 3 }
];

export const PLACEMENT_MAX = 10;

export interface PlacementState {
  /** The rung asked next (index in LADDER). */
  at: number;
  /** How far a right answer climbs (2 until the first mistake). */
  jump: number;
  /** Rungs answered right / wrong. */
  passed: number[];
  failed: number[];
  asked: number;
  done: boolean;
}

/** Where a child starts: kindergarten at the bottom, first grade at comparing, older at adding. */
export function placementStart(band: AgeBand): number {
  const i = AGE_BANDS.indexOf(band);
  return i <= 0 ? 0 : i === 1 ? 2 : 4;
}

export function startPlacement(band: AgeBand, ladder: readonly Rung[] = LADDER): PlacementState {
  return { at: Math.min(placementStart(band), ladder.length - 1), jump: 2, passed: [], failed: [], asked: 0, done: false };
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
  if (right) {
    if (s.at >= top || failed.includes(s.at + 1)) done = true;
    else at = Math.min(top, s.at + jump);
    // Never jump over a rung that was failed.
    const wall = failed.filter((f) => f > s.at).sort((a, b) => a - b)[0];
    if (wall !== undefined && at >= wall) at = wall - 1 > s.at ? wall - 1 : s.at + 1;
  } else {
    jump = 1;
    if (s.at <= 0 || passed.includes(s.at - 1) || failed.filter((f) => f === s.at).length >= 2) done = true;
    else at = s.at - 1;
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
  return ladder.some((r, i) => i <= known && r.skillId === skillId && r.level >= level);
}
