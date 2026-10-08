// What parents see of a child's journey and skills (phase 8), pure: where on the map, stars per
// chapter, bosses beaten, and every skill by chapter as mastered / learning / not yet.
import { JOURNEY, chapterMaxStars, chapterNodes, chapterOf, chapterStars, findNode, isDone, nextNode, type Journey, type QuestProgress } from '../quest/index';
import { MASTERED, type MasteryFields } from '../mastery/engine';
import { SKILLS } from '../skills/index';
import type { SkillId } from '../types';

export interface ChapterLine {
  id: string;
  title: string;
  stars: number;
  maxStars: number;
  bossBeaten: boolean;
  /** Any station open or done (the chapter was reached). */
  reached: boolean;
}

export interface JourneyView {
  /** The chapter and the station to play next (null: the whole journey done). */
  chapter: { index: number; title: string } | null;
  station: string | null;
  chapters: ChapterLine[];
  bossesBeaten: number;
}

export function journeyView(p: QuestProgress, j: Journey = JOURNEY): JourneyView {
  const next = nextNode(p, j);
  const ch = next ? chapterOf(next.id, j) : undefined;
  const chapters = j.chapters.map((c) => {
    const nodes = chapterNodes(c);
    const boss = nodes.find((n) => n.kind === 'boss');
    return {
      id: c.id,
      title: c.title,
      stars: chapterStars(c, p),
      maxStars: chapterMaxStars(c),
      bossBeaten: !!boss && isDone(boss, p),
      reached: nodes.some((n) => isDone(n, p)) || (!!next && chapterOf(next.id, j) === c)
    };
  });
  return {
    chapter: ch ? { index: j.chapters.indexOf(ch), title: ch.title } : null,
    station: next?.title ?? null,
    chapters,
    bossesBeaten: chapters.filter((c) => c.bossBeaten).length
  };
}

export type SkillStatus = 'mastered' | 'learning' | 'new';

export interface SkillLine {
  skillId: SkillId;
  title: string;
  icon: string;
  status: SkillStatus;
  mastery: number;
  /** The level the child plays now, in the skill's words ("עד 10"); null before any play. */
  levelLabel: string | null;
}

export interface ChapterSkills {
  id: string;
  title: string;
  skills: SkillLine[];
}

type State = MasteryFields & { level?: number };

export function skillStatus(s: Pick<MasteryFields, 'mastery' | 'attempts'> | undefined): SkillStatus {
  if (!s) return 'new';
  if (s.mastery >= MASTERED) return 'mastered';
  return s.attempts > 0 || s.mastery > 0 ? 'learning' : 'new';
}

/** Every skill under the first chapter it is taught in (skills off the map at the end). */
export function skillsByChapter(states: Partial<Record<string, State>>, j: Journey = JOURNEY): ChapterSkills[] {
  const placed = new Set<string>();
  const line = (id: SkillId): SkillLine | null => {
    const sk = SKILLS.find((s) => s.id === id);
    if (!sk) return null;
    const st = states[id];
    const status = skillStatus(st);
    const lv = st && status !== 'new' ? sk.levels.find((l) => l.level === st.level) ?? sk.levels[0] : null;
    return { skillId: id, title: sk.title, icon: sk.icon, status, mastery: st?.mastery ?? 0, levelLabel: lv?.label ?? null };
  };
  const out: ChapterSkills[] = j.chapters.map((c) => {
    const ids: SkillId[] = [];
    for (const n of chapterNodes(c)) {
      const own = n.kind === 'lesson' || n.kind === 'practice' ? [n.skillId] : n.kind === 'boss' ? n.skillIds : [];
      for (const id of own) if (!placed.has(id)) (placed.add(id), ids.push(id));
    }
    return { id: c.id, title: c.title, skills: ids.map(line).filter((x): x is SkillLine => !!x) };
  });
  const rest = SKILLS.filter((s) => !placed.has(s.id)).map((s) => line(s.id)!);
  if (rest.length) out.push({ id: 'more', title: 'עוד', skills: rest });
  return out.filter((c) => c.skills.length);
}

/** Counts for the summary line: mastered / learning / not yet. */
export function statusCounts(chapters: ChapterSkills[]): Record<SkillStatus, number> {
  const c = { mastered: 0, learning: 0, new: 0 };
  for (const ch of chapters) for (const s of ch.skills) c[s.status]++;
  return c;
}

/** Is a station id on the journey (for links from the dashboard). */
export const onJourney = (id: string) => !!findNode(id);
