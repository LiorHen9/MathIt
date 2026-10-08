// What the engine says about a child, pure: which skills to recommend in free practice (due for
// review first, then the next ones to learn, by mastery – not only by age), and a summary for the
// parents' area (phase 8): what is mastered, where it is hard (the common mistakes), time spent.
import type { ErrorTag, Skill, SkillId } from '../types';
import { MASTERED, commonError, isDue, type MasteryFields } from './engine';

type States = Partial<Record<string, MasteryFields>>;

/**
 * Up to `max` skills to recommend: due for review first; then skills not yet mastered whose
 * prerequisites are mastered (or practised a while), easiest band first. A child who has not
 * played yet gets the age's own list.
 */
export function recommendByMastery(skills: readonly Skill[], states: States, byAge: SkillId[], now: number, max = 2): SkillId[] {
  const out: SkillId[] = [];
  const add = (id: SkillId) => out.length < max && !out.includes(id) && out.push(id);
  for (const s of skills) if (isDue(states[s.id], now)) add(s.id);
  const played = skills.some((s) => (states[s.id]?.attempts ?? 0) > 0);
  // A child who has not played yet: the age's whole list (and anything due, placed by the placement game).
  if (!played) return [...new Set([...out, ...byAge])];
  const ready = (id: SkillId) => {
    const p = states[id];
    return !!p && (p.mastery >= MASTERED || (p.attempts >= 16 && p.mastery >= 0.6));
  };
  // Started but not mastered yet, then new ones that are ready.
  for (const s of skills) if ((states[s.id]?.attempts ?? 0) > 0 && (states[s.id]?.mastery ?? 0) < MASTERED) add(s.id);
  for (const s of skills) if (!states[s.id]?.attempts && s.prerequisites.every(ready)) add(s.id);
  byAge.forEach((id) => (states[id]?.mastery ?? 0) < MASTERED && add(id));
  return out;
}

export interface SkillSummaryLine {
  skillId: SkillId;
  mastery: number;
  mastered: boolean;
  attempts: number;
  /** Share right the first time in the recent answers (0..1), null before any. */
  recent: number | null;
  /** The most common mistake, when there is one. */
  hard?: { tag: ErrorTag; count: number };
  due: boolean;
}

export interface ProfileSummary {
  mastered: SkillId[];
  /** Skills with a common mistake, the most mistakes first. */
  hard: { skillId: SkillId; tag: ErrorTag; count: number }[];
  /** All the time spent answering. */
  practiceMs: number;
  attempts: number;
  lastPracticed: number;
  skills: SkillSummaryLine[];
}

export function summarize(states: States, now: number): ProfileSummary {
  const skills: SkillSummaryLine[] = [];
  for (const [id, s] of Object.entries(states) as [SkillId, MasteryFields][]) {
    if (!s) continue;
    const tag = commonError(s.errorCounts);
    skills.push({
      skillId: id,
      mastery: s.mastery,
      mastered: s.mastery >= MASTERED,
      attempts: s.attempts,
      recent: s.recentResults.length ? s.recentResults.filter(Boolean).length / s.recentResults.length : null,
      hard: tag ? { tag, count: s.errorCounts[tag] ?? 0 } : undefined,
      due: isDue(s, now)
    });
  }
  return {
    mastered: skills.filter((s) => s.mastered).map((s) => s.skillId),
    hard: skills
      .filter((s) => s.hard)
      .map((s) => ({ skillId: s.skillId, tag: s.hard!.tag, count: s.hard!.count }))
      .sort((a, b) => b.count - a.count),
    practiceMs: skills.reduce((t, s) => t + (states[s.skillId]?.totalMs ?? 0), 0),
    attempts: skills.reduce((t, s) => t + s.attempts, 0),
    lastPracticed: Math.max(0, ...skills.map((s) => states[s.skillId]?.lastPracticed ?? 0)),
    skills
  };
}

