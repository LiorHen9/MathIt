// The achievements record of one profile (store `achievements`, schema 6, key = profile id; phase 10)
// and the one-at-a-time queue that changes it. Kept apart from storage/achievements.ts (which reads
// every other store to compute achievements) so that recordAnswer can count the streak here without
// an import cycle. See storage/achievements.ts for what the record is for.
import { nextStreak, ACHIEVEMENT_IDS } from '../core/achievements/ids';
import { dbGet, dbPut } from './db';

export interface AchievementRecord {
  profileId: string;
  /** Achievement id → when it was celebrated (or marked as shown, ms since 1970). */
  unlocked: Record<string, number>;
  /** First-try right answers in a row, now. */
  streak: number;
  /** The longest such run ever. */
  bestStreak: number;
  /** When the record started counting (the first check; 0 = not yet). */
  since: number;
  /** ms since 1970. */
  updated: number;
}

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

/** Fill missing fields and drop broken values (older or hand-edited records, backups). */
export function normalizeAchievementRecord(raw: Partial<AchievementRecord> | undefined, profileId: string): AchievementRecord {
  const unlocked: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw?.unlocked ?? {})) if ((ACHIEVEMENT_IDS as readonly string[]).includes(k) && n(v) > 0) unlocked[k] = n(v);
  const streak = Math.min(n(raw?.streak), 1e6);
  return { profileId, unlocked, streak, bestStreak: Math.max(streak, Math.min(n(raw?.bestStreak), 1e6)), since: n(raw?.since), updated: n(raw?.updated) };
}

export function emptyAchievementRecord(profileId: string): AchievementRecord {
  return normalizeAchievementRecord(undefined, profileId);
}

export async function getAchievementRecord(profileId: string): Promise<AchievementRecord> {
  return normalizeAchievementRecord(await dbGet<AchievementRecord>('achievements', profileId), profileId);
}

const queues = new Map<string, Promise<unknown>>();
/** One change at a time per profile: each reads what the one before it wrote. */
export function changeAchievements<T>(profileId: string, f: (r: AchievementRecord) => Promise<{ next: AchievementRecord | null; out: T }>): Promise<T> {
  const run = (queues.get(profileId) ?? Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const { next, out } = await f(await getAchievementRecord(profileId));
      if (next) await dbPut('achievements', profileId, { ...next, updated: Date.now() });
      return out;
    });
  queues.set(profileId, run);
  return run;
}

/** One more answered question: a first-try right answer adds to the run, anything else ends it. */
export function noteAnswer(profileId: string, firstTry: boolean): Promise<AchievementRecord> {
  return changeAchievements(profileId, async (r) => {
    const streak = nextStreak(r.streak, firstTry);
    const next = { ...r, streak, bestStreak: Math.max(r.bestStreak, streak) };
    return { next, out: next };
  });
}

