// A profile's results per skill (store `skillStates`, key `${profileId}:${skillId}`).
// Phase 2 keeps what a round needs: the level to play next, the best stars, how many rounds;
// phase 3 adds whether the lesson was watched.
// Phase 6 grows this into the full SkillState (mastery, recent results, review dates –
// docs/ARCHITECTURE.md §7.1); `normalizeSkillState` fills missing fields, so it needs no migration.
import { dbDelete, dbGet, dbGetAll, dbKeys, dbPut } from './db';

export interface SkillState {
  profileId: string;
  skillId: string;
  /** The level the next round starts at. */
  level: number;
  /** The best round so far, 0–3. */
  bestStars: number;
  rounds: number;
  /** ms since 1970. */
  lastPlayed: number;
  /** The skill's lesson was watched to the end (phase 3; older records: false). */
  lessonSeen: boolean;
}

const key = (profileId: string, skillId: string) => `${profileId}:${skillId}`;

export function normalizeSkillState(raw: Partial<SkillState> & Pick<SkillState, 'profileId' | 'skillId'>): SkillState {
  const int = (v: unknown, lo: number, hi: number, d: number) => (Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : d);
  return {
    profileId: raw.profileId,
    skillId: raw.skillId,
    level: int(raw.level, 1, 20, 1),
    bestStars: int(raw.bestStars, 0, 3, 0),
    rounds: int(raw.rounds, 0, 1e9, 0),
    lastPlayed: typeof raw.lastPlayed === 'number' ? raw.lastPlayed : 0,
    lessonSeen: raw.lessonSeen === true
  };
}

export async function getSkillState(profileId: string, skillId: string): Promise<SkillState | undefined> {
  const raw = await dbGet<SkillState>('skillStates', key(profileId, skillId));
  return raw ? normalizeSkillState({ ...raw, profileId, skillId }) : undefined;
}

/** Every skill a profile has played, by skill id. */
export async function listSkillStates(profileId: string): Promise<Record<string, SkillState>> {
  const all = await dbGetAll<SkillState>('skillStates');
  const out: Record<string, SkillState> = {};
  for (const s of all) if (s && s.profileId === profileId && s.skillId) out[s.skillId] = normalizeSkillState(s);
  return out;
}

/** Record a finished round: the next level, the best stars, one more round. */
export async function saveRound(profileId: string, skillId: string, stars: number, nextLevel: number): Promise<SkillState> {
  const prev = await getSkillState(profileId, skillId);
  const next: SkillState = normalizeSkillState({
    profileId,
    skillId,
    level: nextLevel,
    bestStars: Math.max(prev?.bestStars ?? 0, stars),
    rounds: (prev?.rounds ?? 0) + 1,
    lastPlayed: Date.now(),
    lessonSeen: prev?.lessonSeen ?? false
  });
  await dbPut('skillStates', key(profileId, skillId), next);
  return next;
}

/**
 * The lesson was watched to the end. A skill never played starts its record at `startLevel`
 * (the level a first round would pick by age), so watching a lesson changes no level.
 */
export async function saveLessonSeen(profileId: string, skillId: string, startLevel: number): Promise<SkillState> {
  const prev = await getSkillState(profileId, skillId);
  const next = normalizeSkillState({
    ...(prev ?? { profileId, skillId, level: startLevel, bestStars: 0, rounds: 0, lastPlayed: 0 }),
    profileId,
    skillId,
    lessonSeen: true
  });
  await dbPut('skillStates', key(profileId, skillId), next);
  return next;
}

/** When a profile is deleted, its results go too. */
export async function deleteSkillStates(profileId: string): Promise<void> {
  const keys = await dbKeys('skillStates');
  await Promise.all(keys.filter((k) => k.startsWith(`${profileId}:`)).map((k) => dbDelete('skillStates', k)));
}
