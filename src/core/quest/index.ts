// The quest map's rules, as pure functions over data (docs/ARCHITECTURE.md §4.4):
// which station is locked, open or done, which one is next, how many stars a chapter holds,
// and how progress from before the map (skillStates, phase 2–3) becomes stations on it.
// A station opens when the one before it is done, and – for a chest or the boss – when the
// chapter holds enough stars. Nothing here depends on the order of calls or on the clock.
import { CHAPTER_1 } from './chapter1';
import type { Chapter, Journey, NodeStatus, QuestNode, QuestProgress, Section } from './types';
import type { SkillId } from '../types';

export * from './types';

export const JOURNEY: Journey = { id: 'main', chapters: [CHAPTER_1] };

export function emptyProgress(): QuestProgress {
  return { stars: {}, chests: {} };
}

/** Every station of a chapter, in order. */
export function chapterNodes(ch: Chapter): QuestNode[] {
  return ch.sections.flatMap((s) => s.nodes);
}

/** Every station of the journey, in order (the path on the map). */
export function allNodes(j: Journey = JOURNEY): QuestNode[] {
  return j.chapters.flatMap(chapterNodes);
}

export function findNode(id: string, j: Journey = JOURNEY): QuestNode | undefined {
  return allNodes(j).find((n) => n.id === id);
}

export function chapterOf(nodeId: string, j: Journey = JOURNEY): Chapter | undefined {
  return j.chapters.find((c) => chapterNodes(c).some((n) => n.id === nodeId));
}

export function sectionOf(nodeId: string, j: Journey = JOURNEY): Section | undefined {
  return j.chapters.flatMap((c) => c.sections).find((s) => s.nodes.some((n) => n.id === nodeId));
}

/** The most stars a station can give: a lesson 1, practice and the boss 3, a chest none. */
export function maxStars(n: QuestNode): number {
  return n.kind === 'lesson' ? 1 : n.kind === 'chest' ? 0 : 3;
}

/** Stars a station holds (never more than it can give). */
export function nodeStars(n: QuestNode, p: QuestProgress): number {
  const s = p.stars[n.id];
  return Number.isFinite(s) ? Math.max(0, Math.min(maxStars(n), Math.floor(s))) : 0;
}

export function isDone(n: QuestNode, p: QuestProgress): boolean {
  return n.kind === 'chest' ? typeof p.chests[n.id] === 'string' : nodeStars(n, p) >= 1;
}

/** All the stars in a chapter. */
export function chapterStars(ch: Chapter, p: QuestProgress): number {
  return chapterNodes(ch).reduce((sum, n) => sum + nodeStars(n, p), 0);
}

/** The most stars a chapter can hold. */
export function chapterMaxStars(ch: Chapter): number {
  return chapterNodes(ch).reduce((sum, n) => sum + maxStars(n), 0);
}

/** Why a station is still closed: the station before it, and/or stars still missing. */
export interface LockReason {
  /** The station before, when it is not done yet. */
  before?: QuestNode;
  /** Stars still missing in the chapter. */
  stars?: number;
}

/** What keeps a station closed; `null` when it is open (or done). */
export function lockReason(n: QuestNode, p: QuestProgress, j: Journey = JOURNEY): LockReason | null {
  const nodes = allNodes(j);
  const i = nodes.findIndex((x) => x.id === n.id);
  const r: LockReason = {};
  const before = i > 0 ? nodes[i - 1] : undefined;
  if (before && !isDone(before, p)) r.before = before;
  if (n.needStars) {
    const have = chapterStars(chapterOf(n.id, j)!, p);
    if (have < n.needStars) r.stars = n.needStars - have;
  }
  return r.before || r.stars ? r : null;
}

/**
 * done: finished (stars, an opened chest) – shown as done even if earned before the map existed;
 * open: can be played now; locked: the one before is not done, or the chapter needs more stars.
 */
export function nodeStatus(n: QuestNode, p: QuestProgress, j: Journey = JOURNEY): NodeStatus {
  if (isDone(n, p)) return 'done';
  return lockReason(n, p, j) ? 'locked' : 'open';
}

/** The station to play next: the first open one that is not done; null when everything is done. */
export function nextNode(p: QuestProgress, j: Journey = JOURNEY): QuestNode | null {
  return allNodes(j).find((n) => nodeStatus(n, p, j) === 'open') ?? null;
}

/** Keep the better result: progress after a station was played. Pure (returns a new object). */
export function withStars(p: QuestProgress, nodeId: string, stars: number): QuestProgress {
  const n = findNode(nodeId);
  const s = n ? Math.max(0, Math.min(maxStars(n), Math.floor(stars))) : 0;
  return { ...p, stars: { ...p.stars, [nodeId]: Math.max(p.stars[nodeId] ?? 0, s) } };
}

/** What a profile did before the map, per skill (storage/skillStates.ts). */
export interface SkillSummary {
  level: number;
  bestStars: number;
  rounds: number;
  lessonSeen: boolean;
}

/**
 * Progress for a profile that played before the map existed (schema 2), so nobody loses what
 * they did: a watched lesson → its lesson station; practice at a level below the skill's current
 * level → 3 stars (it took 3 stars to move up, or the age started them higher); at the current
 * level → the best stars so far. Chests and the boss are left to be played.
 */
export function progressFromSkills(skills: Partial<Record<SkillId, SkillSummary>>, j: Journey = JOURNEY): QuestProgress {
  const p = emptyProgress();
  for (const n of allNodes(j)) {
    if (n.kind === 'lesson' && skills[n.skillId]?.lessonSeen) p.stars[n.id] = 1;
    if (n.kind === 'practice') {
      const s = skills[n.skillId];
      if (!s || s.rounds < 1) continue;
      if (n.level < s.level) p.stars[n.id] = 3;
      else if (n.level === s.level && s.bestStars >= 1) p.stars[n.id] = Math.min(3, s.bestStars);
    }
  }
  return p;
}

/** Problems with a journey's data (tests): ids, skills, reachability, opening only forward. */
export function journeyProblems(j: Journey, skillExists: (id: string, level?: number) => boolean): string[] {
  const out: string[] = [];
  const nodes = allNodes(j);
  const ids = new Set<string>();
  for (const id of [...nodes.map((n) => n.id), ...j.chapters.map((c) => c.id), ...j.chapters.flatMap((c) => c.sections.map((s) => s.id))]) {
    if (ids.has(id)) out.push(`duplicate id ${id}`);
    ids.add(id);
  }
  for (const n of nodes) {
    if (!n.title) out.push(`${n.id}: no title`);
    if (n.kind === 'lesson' && !skillExists(n.skillId)) out.push(`${n.id}: unknown skill ${n.skillId}`);
    if (n.kind === 'practice' && !skillExists(n.skillId, n.level)) out.push(`${n.id}: unknown skill/level ${n.skillId} L${n.level}`);
    if (n.kind === 'boss') {
      if (n.skillIds.length < 2) out.push(`${n.id}: a boss mixes skills`);
      for (const s of n.skillIds) if (!skillExists(s, n.level)) out.push(`${n.id}: unknown skill/level ${s} L${n.level}`);
      if (n.hits < 4 || n.hits > 12) out.push(`${n.id}: ${n.hits} hits`);
    }
  }
  // Reachable: playing every station in order with the most stars opens each one in turn.
  let p = emptyProgress();
  for (const n of nodes) {
    if (nodeStatus(n, p, j) !== 'open') {
      out.push(`${n.id}: cannot be reached (${JSON.stringify(lockReason(n, p, j))})`);
      break;
    }
    p = n.kind === 'chest' ? { ...p, chests: { ...p.chests, [n.id]: n.prize.icon } } : withStars(p, n.id, maxStars(n));
  }
  // A star requirement the chapter can actually meet before the station.
  for (const ch of j.chapters) {
    const list = chapterNodes(ch);
    list.forEach((n, i) => {
      const before = list.slice(0, i).reduce((s, x) => s + maxStars(x), 0);
      if (n.needStars && n.needStars > before) out.push(`${n.id}: needs ${n.needStars} stars, only ${before} before it`);
    });
  }
  return out;
}
