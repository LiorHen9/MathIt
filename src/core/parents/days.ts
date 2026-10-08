// Practice time by day (phase 8), pure: the `sessions` store keeps one small record per profile and
// local day (storage/sessions.ts); these turn it into "today, this week, all time" for parents.
// No clock of its own: every function takes `now`.
import { DAY } from '../mastery/engine';

/** How long day records are kept. */
export const KEEP_DAYS = 90;

/** One profile's practice on one day (local date). */
export interface DayLog {
  profileId: string;
  /** yyyy-mm-dd, the phone's local date. */
  day: string;
  /** Time spent answering (each answer at most a minute, as in the mastery engine). */
  ms: number;
  /** Questions answered. */
  questions: number;
  /** Of those, right the first time. */
  right: number;
  /** When the daily goal was celebrated that day (0 = not yet). */
  goalAt: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The local date of a moment: "2026-10-08". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Fill missing fields and drop broken values. */
export function normalizeDayLog(raw: Partial<DayLog> | undefined, profileId: string, day: string): DayLog {
  const n = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.min(max, Math.floor(v)) : 0);
  const questions = n(raw?.questions, 1e6);
  return { profileId, day, ms: n(raw?.ms, DAY), questions, right: Math.min(questions, n(raw?.right, 1e6)), goalAt: n(raw?.goalAt, 1e15) };
}

export function emptyDayLog(profileId: string, day: string): DayLog {
  return { profileId, day, ms: 0, questions: 0, right: 0, goalAt: 0 };
}

/** The record after one more answer. Pure. */
export function addAnswer(log: DayLog, ms: number, firstTry: boolean): DayLog {
  return { ...log, ms: log.ms + Math.max(0, Math.min(60_000, Math.round(ms))), questions: log.questions + 1, right: log.right + (firstTry ? 1 : 0) };
}

/** The `n` local days up to today, oldest first ("…", today). */
export function lastDays(now: number, n: number): string[] {
  const out: string[] = [];
  const d = new Date(now);
  for (let k = n - 1; k >= 0; k--) {
    // Noon steps over daylight-saving changes safely.
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() - k, 12);
    out.push(dayKey(x.getTime()));
  }
  return out;
}

/** Days older than KEEP_DAYS (to delete). */
export function staleDays(days: string[], now: number, keep = KEEP_DAYS): string[] {
  const oldest = lastDays(now, keep)[0];
  return days.filter((d) => d < oldest);
}

const WEEKDAYS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

/** "ב׳" for a yyyy-mm-dd day. */
export function weekdayLabel(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d, 12).getDay()];
}

export interface TimeStats {
  today: DayLog;
  /** The last 7 days, oldest first (today last), with empty days filled. */
  week: DayLog[];
  weekMs: number;
  weekQuestions: number;
  /** Days with any practice in the last 7. */
  weekDays: number;
}

export function timeStats(logs: DayLog[], profileId: string, now: number): TimeStats {
  const by = new Map(logs.filter((l) => l.profileId === profileId).map((l) => [l.day, l]));
  const week = lastDays(now, 7).map((d) => by.get(d) ?? emptyDayLog(profileId, d));
  return {
    today: week[6],
    week,
    weekMs: week.reduce((t, l) => t + l.ms, 0),
    weekQuestions: week.reduce((t, l) => t + l.questions, 0),
    weekDays: week.filter((l) => l.questions > 0).length
  };
}

/** "12 דק׳", "1 שע׳ 5 דק׳", "פחות מדקה" (parents read it). */
export function durationText(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (ms > 0 && min === 0) return 'פחות מדקה';
  if (min < 60) return `${min} דק׳`;
  const h = Math.floor(min / 60);
  return min % 60 ? `${h} שע׳ ${min % 60} דק׳` : `${h} שע׳`;
}
