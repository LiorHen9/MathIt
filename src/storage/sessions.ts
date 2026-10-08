// Practice per profile and local day (store `sessions`, key `${profileId}:${yyyy-mm-dd}`, phase 8):
// time spent answering, questions, right the first time, and when the daily goal was celebrated.
// The parents' dashboard reads it (core/parents/days.ts). Every answer adds to today's record
// (recordAnswer in storage/skillStates.ts), one write at a time per key as there. Records older
// than KEEP_DAYS are dropped when a new day starts. (Deleting a profile deletes its days: profiles.ts.)
import { addAnswer, dayKey, emptyDayLog, normalizeDayLog, staleDays, DAY_RE, type DayLog } from '../core/parents/days';
import { now as clockNow } from '../app/clock';
import { dbDelete, dbGet, dbGetAll, dbKeys, dbPut } from './db';

const key = (profileId: string, day: string) => `${profileId}:${day}`;

/** One write at a time per key: each change reads what the one before it wrote. */
const queues = new Map<string, Promise<unknown>>();
function change(profileId: string, day: string, edit: (prev: DayLog | undefined) => DayLog): Promise<DayLog> {
  const k = key(profileId, day);
  const run = (queues.get(k) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const raw = await dbGet<DayLog>('sessions', k);
    const prev = raw ? normalizeDayLog(raw, profileId, day) : undefined;
    const next = normalizeDayLog(edit(prev), profileId, day);
    await dbPut('sessions', k, next);
    if (!prev) await dropStale(profileId, next.day);
    return next;
  });
  queues.set(k, run);
  return run;
}

/** Days older than KEEP_DAYS, for one profile. */
async function dropStale(profileId: string, today: string): Promise<void> {
  const [y, m, d] = today.split('-').map(Number);
  const mine = (await dbKeys('sessions')).filter((k) => k.startsWith(`${profileId}:`));
  const days = mine.map((k) => k.slice(profileId.length + 1)).filter((x) => DAY_RE.test(x));
  const old = staleDays(days, new Date(y, m - 1, d, 12).getTime());
  await Promise.all(old.map((x) => dbDelete('sessions', key(profileId, x))));
}

/** One more answered question today. */
export function recordDay(profileId: string, ms: number, firstTry: boolean, now = clockNow()): Promise<DayLog> {
  const day = dayKey(now);
  return change(profileId, day, (prev) => addAnswer(prev ?? emptyDayLog(profileId, day), ms, firstTry));
}

/** The daily goal was celebrated today (once a day). */
export function markGoal(profileId: string, now = clockNow()): Promise<DayLog> {
  const day = dayKey(now);
  return change(profileId, day, (prev) => ({ ...(prev ?? emptyDayLog(profileId, day)), goalAt: prev?.goalAt || now }));
}

export async function getDayLog(profileId: string, now = clockNow()): Promise<DayLog> {
  const day = dayKey(now);
  const raw = await dbGet<DayLog>('sessions', key(profileId, day));
  return raw ? normalizeDayLog(raw, profileId, day) : emptyDayLog(profileId, day);
}

/** Every day a profile has on record. */
export async function listDayLogs(profileId: string): Promise<DayLog[]> {
  const all = await dbGetAll<DayLog>('sessions');
  return all.filter((l) => l && l.profileId === profileId && DAY_RE.test(l.day)).map((l) => normalizeDayLog(l, profileId, l.day));
}

export async function deleteDayLogs(profileId: string): Promise<void> {
  const keys = await dbKeys('sessions');
  await Promise.all(keys.filter((k) => k.startsWith(`${profileId}:`)).map((k) => dbDelete('sessions', k)));
}
