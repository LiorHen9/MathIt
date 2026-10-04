// A profile's way on the quest map (store `questProgress`, schema 3, key = profile id):
// the best stars per station, the chests opened (with their prize), where the hero stands, which
// stations' opening was already celebrated on the map, and the station played last.
// Loaded with the map and the stations (not in the first load).
//
// A profile that played before the map existed (schema 2: skillStates only) gets its record the
// first time it is read: core/quest progressFromSkills turns watched lessons and played rounds into
// done stations, and everything already open counts as celebrated (no burst of old openings).
import { allNodes, findNode, nextNode, nodeStatus, progressFromSkills, withStars, type QuestProgress, type SkillSummary } from '../core/quest/index';
import type { SkillId } from '../core/types';
import { dbGet, dbPut } from './db';
import { listSkillStates } from './skillStates';

export interface QuestRecord extends QuestProgress {
  profileId: string;
  /** The station the hero stands at on the map (null: the first one). */
  at: string | null;
  /** Stations whose opening was shown on the map (a light burst plays once per station). */
  revealed: string[];
  /** The station played last. */
  last: string | null;
  /** ms since 1970. */
  updated: number;
}

/** Fill missing fields and drop broken values (older or hand-edited records). */
export function normalizeQuestRecord(raw: Partial<QuestRecord> | undefined, profileId: string): QuestRecord {
  const stars: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw?.stars ?? {})) if (findNode(k) && Number.isInteger(v) && v >= 0 && v <= 3) stars[k] = v;
  const chests: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw?.chests ?? {})) if (findNode(k)?.kind === 'chest' && typeof v === 'string') chests[k] = v;
  const known = (id: unknown): string | null => (typeof id === 'string' && findNode(id) ? id : null);
  return {
    profileId,
    stars,
    chests,
    at: known(raw?.at),
    revealed: Array.isArray(raw?.revealed) ? raw!.revealed.filter((x) => typeof x === 'string' && !!findNode(x)) : [],
    last: known(raw?.last),
    updated: typeof raw?.updated === 'number' ? raw.updated : 0
  };
}

async function put(r: QuestRecord): Promise<QuestRecord> {
  const next = { ...r, updated: Date.now() };
  await dbPut('questProgress', r.profileId, next);
  return next;
}

/** The profile's record; made on first read (from what it did before the map, if anything). */
export async function getQuestRecord(profileId: string): Promise<QuestRecord> {
  const raw = await dbGet<QuestRecord>('questProgress', profileId);
  if (raw) return normalizeQuestRecord(raw, profileId);
  const skills = await listSkillStates(profileId);
  const summaries: Partial<Record<SkillId, SkillSummary>> = {};
  for (const [id, s] of Object.entries(skills)) summaries[id as SkillId] = { level: s.level, bestStars: s.bestStars, rounds: s.rounds, lessonSeen: s.lessonSeen };
  const p = progressFromSkills(summaries);
  const next = nextNode(p);
  const nodes = allNodes();
  return put({
    profileId,
    ...p,
    at: next?.id ?? nodes.at(-1)!.id,
    revealed: nodes.filter((n) => nodeStatus(n, p) !== 'locked').map((n) => n.id),
    last: null,
    updated: 0
  });
}

/** A station was played: keep its best stars. Returns the new record. */
export async function recordNodeStars(profileId: string, nodeId: string, stars: number): Promise<QuestRecord> {
  const r = await getQuestRecord(profileId);
  return put({ ...r, ...withStars(r, nodeId, stars), last: nodeId });
}

/** A chest was opened, with its prize. */
export async function openChest(profileId: string, nodeId: string, prize: string): Promise<QuestRecord> {
  const r = await getQuestRecord(profileId);
  return put({ ...r, chests: { ...r.chests, [nodeId]: prize }, last: nodeId });
}

/** The map showed a walk and/or openings: where the hero stands now, what was celebrated. */
export async function saveMapState(profileId: string, at: string, revealed: string[]): Promise<QuestRecord> {
  const r = await getQuestRecord(profileId);
  return put({ ...r, at, revealed: [...new Set([...r.revealed, ...revealed])] });
}
