// A profile's results per skill (store `skillStates`, key `${profileId}:${skillId}`).
// Phase 2 keeps what a round needs: the level to play next, the best stars, how many rounds;
// phase 3 adds whether the lesson was watched; phase 6 the full SkillState of the mastery engine
// (docs/ARCHITECTURE.md §7.1: mastery, attempts, recent results, time, review dates, mistakes by
// kind – core/mastery). `normalizeSkillState` fills missing fields, so no migration was needed.
// Every answered question is saved at once (`recordAnswer`), in a queue per key so quick
// answers never overwrite each other. (Deleting a profile deletes its records: profiles.ts.)
import {
  DAY,
  MASTERED,
  REVIEW_DAYS,
  emptyMastery,
  normalizeMastery,
  summarize,
  updateMastery,
  type AnswerResult,
  type MasteryFields,
  type PlacementResult,
  type ProfileSummary
} from '../core/mastery/index';
import type { SkillId } from '../core/types';
import { now as clockNow } from '../app/clock';
import { dbGet, dbGetAll, dbPut } from './db';
import { recordDay } from './sessions';

export interface SkillState extends MasteryFields {
  profileId: string;
  skillId: string;
  /** The level the next round starts at. */
  level: number;
  /** The best round so far, 0–3. */
  bestStars: number;
  rounds: number;
  /** ms since 1970 (the last finished round). */
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
    lessonSeen: raw.lessonSeen === true,
    ...normalizeMastery(raw)
  };
}

function fresh(profileId: string, skillId: string, level = 1): SkillState {
  return { profileId, skillId, level, bestStars: 0, rounds: 0, lastPlayed: 0, lessonSeen: false, ...emptyMastery() };
}

/** One write at a time per key: each change reads what the one before it wrote. */
const queues = new Map<string, Promise<unknown>>();
function change(profileId: string, skillId: string, edit: (prev: SkillState | undefined) => SkillState): Promise<SkillState> {
  const k = key(profileId, skillId);
  const run = (queues.get(k) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const next = normalizeSkillState(edit(await getSkillState(profileId, skillId)));
    await dbPut('skillStates', k, next);
    return next;
  });
  queues.set(k, run);
  return run;
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

/**
 * One answered question (a round, the boss, a lesson's "your turn", a review, the placement
 * game): the mastery engine's step, saved at once, and one more question in today's record.
 * A skill never played starts at `startLevel`.
 */
export function recordAnswer(profileId: string, skillId: string, result: AnswerResult, startLevel = 1, now = clockNow()): Promise<SkillState> {
  // Today's practice for parents (storage/sessions.ts), in its own queue.
  void recordDay(profileId, result.ms, result.correct && result.wrongBefore === 0, now);
  return change(profileId, skillId, (prev) => updateMastery(prev ?? fresh(profileId, skillId, startLevel), result, now));
}

/** Record a finished round: the next level, the best stars, one more round. */
export function saveRound(profileId: string, skillId: string, stars: number, nextLevel: number, now = clockNow()): Promise<SkillState> {
  return change(profileId, skillId, (prev) => ({
    ...(prev ?? fresh(profileId, skillId)),
    level: nextLevel,
    bestStars: Math.max(prev?.bestStars ?? 0, stars),
    rounds: (prev?.rounds ?? 0) + 1,
    lastPlayed: now
  }));
}

/**
 * The lesson was watched to the end. A skill never played starts its record at `startLevel`
 * (the level a first round would pick by age), so watching a lesson changes no level.
 */
export function saveLessonSeen(profileId: string, skillId: string, startLevel: number): Promise<SkillState> {
  return change(profileId, skillId, (prev) => ({ ...(prev ?? fresh(profileId, skillId, startLevel)), lessonSeen: true }));
}

/**
 * The placement game's result: mastered skills get high mastery, their top level and a first
 * review in a few days; partly known ones move up to their next level. Only ever raises.
 */
export async function applyPlacement(profileId: string, r: PlacementResult, levelsOf: (id: SkillId) => number, now = clockNow()): Promise<void> {
  const jobs: Promise<SkillState>[] = [];
  for (const id of r.mastered)
    jobs.push(
      change(profileId, id, (prev) => {
        const s = prev ?? fresh(profileId, id);
        const mastered = s.mastery >= MASTERED;
        return {
          ...s,
          level: Math.max(s.level, levelsOf(id)),
          mastery: Math.max(s.mastery, 0.9),
          reviewStep: mastered ? s.reviewStep : Math.max(s.reviewStep, 1),
          nextReview: mastered && s.nextReview ? s.nextReview : now + REVIEW_DAYS[1] * DAY,
          lessonSeen: true
        };
      })
    );
  for (const [id, level] of Object.entries(r.partial) as [SkillId, number][])
    jobs.push(
      change(profileId, id, (prev) => {
        const s = prev ?? fresh(profileId, id);
        return { ...s, level: Math.max(s.level, level), mastery: Math.max(s.mastery, 0.5), lessonSeen: true };
      })
    );
  await Promise.all(jobs);
}

/** For the parents' area (phase 8): what is mastered, where it is hard, time spent. */
export async function getSkillSummary(profileId: string, now = clockNow()): Promise<ProfileSummary> {
  return summarize(await listSkillStates(profileId), now);
}
