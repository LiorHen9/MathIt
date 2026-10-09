// The parents' settings at work (phase 8), pure: which games a round may use, and which skills free
// practice offers when a parent keeps it to what the journey has opened. The stored part is in
// prefs.ts; chapters a parent opens by hand live with the map's progress (`QuestProgress.opened`).
import type { SkillId, TemplateId } from '../types';
import { JOURNEY, chapterNodes, isDone, nextNode, chapterOf, type Journey, type QuestProgress } from '../quest/index';
import { SKILLS } from '../skills/index';

/** The games a skill may be played in for this child (Pop always stays). */
export function allowedTemplates(templates: readonly TemplateId[], blocked: readonly TemplateId[]): TemplateId[] {
  const out = templates.filter((t) => t === 'pop' || !blocked.includes(t));
  return out.length ? out : ['pop'];
}

/** A station's own game, unless a parent turned it off (then Pop). */
export function stationTemplate(t: TemplateId | undefined, blocked: readonly TemplateId[]): TemplateId | undefined {
  return t && blocked.includes(t) ? 'pop' : t;
}

/** The games a parent can turn off, in parents' words. */
export const TEMPLATE_NAMES: Record<Exclude<TemplateId, 'pop'>, string> = {
  jump: '🦘 קפיצות על ציר המספרים',
  build: '🧱 בנייה בעשרות ואחדות',
  match: '🃏 זיכרון (זוגות)',
  clock: '🕒 כיוון שעון',
  shop: '🛒 חנות',
  slice: '🍕 פיצה (צובעים שברים)',
  pattern: '🧩 סדרות (משלימים את החסר)',
  speed: '⏱️ מרוץ לוח הכפל (עם שעון)'
};

/** Chapters reached on the journey: a station done in them, the next station there, or opened by hand. */
export function reachedChapters(p: QuestProgress, j: Journey = JOURNEY): string[] {
  const next = nextNode(p, j);
  const at = next ? chapterOf(next.id, j)?.id : undefined;
  return j.chapters.filter((c) => c.id === at || p.opened?.includes(c.id) || chapterNodes(c).some((n) => isDone(n, p))).map((c) => c.id);
}

/**
 * The skills free practice offers: all of them, or – when a parent locks what is ahead – those
 * taught in the chapters reached (a skill off the map stays, as it has no chapter to wait for).
 */
export function practiceSkills(p: QuestProgress, lockAhead: boolean, j: Journey = JOURNEY): SkillId[] {
  if (!lockAhead) return SKILLS.map((s) => s.id);
  const reached = new Set(reachedChapters(p, j));
  const firstChapter = new Map<SkillId, string>();
  for (const c of j.chapters)
    for (const n of chapterNodes(c)) {
      const ids = n.kind === 'lesson' || n.kind === 'practice' ? [n.skillId] : n.kind === 'boss' ? n.skillIds : [];
      for (const id of ids) if (!firstChapter.has(id)) firstChapter.set(id, c.id);
    }
  return SKILLS.filter((s) => !firstChapter.has(s.id) || reached.has(firstChapter.get(s.id)!)).map((s) => s.id);
}
