// What a parent sets for each child (phase 8), the stored part: the daily goal, a gentle break
// reminder, the games a round may use, and whether free practice stays with what the journey has
// opened. Kept in the profile (`Profile.parent`, filled by normalizeProfile – no migration), so
// this file stays light: profiles are read on the first screen.
import { TEMPLATE_IDS, type TemplateId } from '../types';
import { normalizeGoal, type DailyGoal } from './goal';

export interface ParentSettings {
  /** null: no daily goal. */
  goal: DailyGoal | null;
  /** Offer a break after this many minutes of play; null: never. */
  breakAfter: number | null;
  /** Games a round may not use (never Pop: every skill plays in it). */
  blocked: TemplateId[];
  /** Free practice only has the skills of chapters reached on the journey (or opened by hand). */
  lockAhead: boolean;
}

export function defaultParentSettings(): ParentSettings {
  return { goal: null, breakAfter: null, blocked: [], lockAhead: false };
}

export function normalizeParentSettings(raw: unknown): ParentSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<ParentSettings>;
  return {
    goal: normalizeGoal(r.goal),
    breakAfter: Number.isInteger(r.breakAfter) && r.breakAfter! >= 5 && r.breakAfter! <= 120 ? r.breakAfter! : null,
    blocked: Array.isArray(r.blocked) ? [...new Set(r.blocked.filter((t): t is TemplateId => TEMPLATE_IDS.includes(t as TemplateId) && t !== 'pop'))] : [],
    lockAhead: r.lockAhead === true
  };
}
