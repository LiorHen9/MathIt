// Backup and restore of the whole family to one JSON file (phase 8, adapted from ChessIt; loaded
// lazily with the parents' area).
//
// What is in the file: every profile (with its settings and the parents' settings; a PIN only as
// it is on the phone – a hash with its salt), its results per skill, its way on the map, its coins
// and collectibles in every world, its practice by day, and the parents' PIN (a hash too).
// What is not: the rest of `meta`, which describes this phone rather than the family – the device
// id, the last profile used, the error log, when this phone last made a backup.
//
// Reading a file is strict about its shape: anything that does not look like a MathIt backup is
// refused before a single record is touched, with a message in Hebrew that says why. Each record
// then goes through the same normalize* the app uses when it reads its own stores, so a value from
// an older version is filled and a broken one dropped. A file from a phone on an older schema (3, 4:
// no inventory or no sessions yet) simply lacks those lists. A backup from a newer version of the
// app is refused ("update the app first").
import { dbGet, dbGetAll, dbKeys, dbWrite, SCHEMA_VERSION, type DbOp, type StoreName } from './db';
import { normalizeProfile, PLAY_WORLDS, type PlayWorldId, type Profile } from '../profiles/profiles';
import { normalizeParentLock, type ParentLock } from '../profiles/pin';
import { normalizeSkillState, type SkillState } from './skillStates';
import { normalizeQuestRecord, type QuestRecord } from './questProgress';
import { normalizeInventory, type Inventory } from './inventory';
import { DAY_RE, normalizeDayLog, type DayLog } from '../core/parents/days';
import { getSkill } from '../core/skills/index';
import { APP_VERSION } from '../app/version';

export const BACKUP_FORMAT = 'mathit-backup';
/** The backup format version. Bump it when the file changes, and add a step to MIGRATIONS. */
export const BACKUP_VERSION = 1;
/** Files bigger than this are not a MathIt backup (a family of 10 with 90 days each is ~300KB). */
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const MAX_PROFILES = 50;
const MAX_RECORDS = 20_000;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  /** ISO time of the export. */
  exportedAt: string;
  /** The IndexedDB schema version on the phone that made it. */
  schemaVersion: number;
  /** The app version that made it. */
  app: string;
  profiles: Profile[];
  skillStates: SkillState[];
  questProgress: QuestRecord[];
  inventory: Inventory[];
  sessions: DayLog[];
  /** The parents' PIN (meta `parentLock`), or null. */
  parentLock: ParentLock | null;
}

export type BackupError =
  | { code: 'too-big' }
  | { code: 'not-json' }
  | { code: 'not-backup' }
  | { code: 'chessit' }
  | { code: 'future'; version: number }
  | { code: 'invalid'; detail: string };

export type ParseResult = { ok: true; backup: Backup } | { ok: false; error: BackupError };

/** A line for each error, in plain Hebrew (parents read it). */
export function errorText(e: BackupError): string {
  switch (e.code) {
    case 'too-big':
      return 'הקובץ גדול מדי בשביל גיבוי של MathIt. אולי נבחר קובץ אחר?';
    case 'not-json':
    case 'not-backup':
      return 'זה לא קובץ גיבוי של MathIt. צריך לבחור את הקובץ ששמו מתחיל ב-mathit-backup.';
    case 'chessit':
      return 'זה גיבוי של ChessIt (אפליקציית השחמט), לא של MathIt. כדאי לשחזר אותו שם.';
    case 'future':
      return 'הגיבוי נוצר בגרסה חדשה יותר של MathIt. כדאי לעדכן את האפליקציה (לסגור ולפתוח מחדש) ולנסות שוב.';
    case 'invalid':
      return 'קובץ הגיבוי פגום, ולכן לא שחזרנו ממנו כלום. אולי הוא נחתך או נערך?';
  }
}

// ---------- Converting older backups ----------

/**
 * One step per old version: MIGRATIONS[n] turns a version-n file into version n+1.
 * Version 1 is the first, so there is nothing to convert yet.
 */
const MIGRATIONS: Record<number, (b: Record<string, unknown>) => Record<string, unknown>> = {};

export function migrate(raw: Record<string, unknown>): Record<string, unknown> {
  let b = raw;
  while (typeof b.version === 'number' && b.version < BACKUP_VERSION) {
    const step = MIGRATIONS[b.version];
    if (!step) throw new Invalid(`no conversion from version ${b.version}`);
    b = step(b);
  }
  return b;
}

// ---------- Checking ----------

class Invalid extends Error {}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
function need(cond: unknown, what: string): asserts cond {
  if (!cond) throw new Invalid(what);
}
const isInt = (v: unknown, min: number, max: number): v is number => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;
const ID = /^[A-Za-z0-9_-]{1,40}$/;

/** A list in the file (missing = empty: a phone on an older schema had no such store). */
function list(v: unknown, at: string): unknown[] {
  if (v === undefined) return [];
  need(Array.isArray(v) && v.length <= MAX_RECORDS, at);
  return v;
}

/** No two records with the same key. */
function unique<T>(items: T[], key: (x: T) => string, at: string): T[] {
  need(new Set(items.map(key)).size === items.length, `duplicate ${at}`);
  return items;
}

function checkProfile(v: unknown, i: number): Profile {
  const at = `profiles[${i}]`;
  need(isObj(v), at);
  need(typeof v.id === 'string' && ID.test(v.id), `${at}.id`);
  need(typeof v.name === 'string' && v.name.trim().length > 0 && v.name.length <= 32, `${at}.name`);
  need(v.pinHash === undefined || (typeof v.pinHash === 'string' && /^[0-9a-f]{64}$/.test(v.pinHash)), `${at}.pinHash`);
  need(v.pinSalt === undefined || (typeof v.pinSalt === 'string' && /^[0-9a-f]{8,64}$/.test(v.pinSalt)), `${at}.pinSalt`);
  need(!v.pinHash === !v.pinSalt, `${at}.pin`);
  return normalizeProfile({ ...(v as Partial<Profile>), id: v.id });
}

const owned = (v: unknown, ids: Set<string>, at: string): Obj => {
  need(isObj(v) && typeof v.profileId === 'string' && ids.has(v.profileId), `${at}.profileId`);
  return v;
};

/** Check a parsed file and return a clean copy (only what the app knows), or say what is wrong. */
export function checkBackup(raw: unknown): ParseResult {
  if (isObj(raw) && raw.format === 'chessit-backup') return { ok: false, error: { code: 'chessit' } };
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) return { ok: false, error: { code: 'not-backup' } };
  if (!isInt(raw.version, 1, 1e6)) return { ok: false, error: { code: 'invalid', detail: 'version' } };
  if (raw.version > BACKUP_VERSION) return { ok: false, error: { code: 'future', version: raw.version } };
  try {
    const b = migrate(raw);
    need(typeof b.exportedAt === 'string' && !Number.isNaN(Date.parse(b.exportedAt)), 'exportedAt');
    need(Array.isArray(b.profiles) && b.profiles.length <= MAX_PROFILES, 'profiles');
    const profiles = unique(b.profiles.map(checkProfile), (p) => p.id, 'profile id');
    const ids = new Set(profiles.map((p) => p.id));

    const skillStates = unique(
      list(b.skillStates, 'skillStates').map((x, i) => {
        const v = owned(x, ids, `skillStates[${i}]`);
        need(typeof v.skillId === 'string' && !!getSkill(v.skillId), `skillStates[${i}].skillId`);
        return normalizeSkillState({ ...(v as Partial<SkillState>), profileId: v.profileId as string, skillId: v.skillId });
      }),
      (s) => `${s.profileId}:${s.skillId}`,
      'skillStates'
    );
    const questProgress = unique(
      list(b.questProgress, 'questProgress').map((x, i) => {
        const v = owned(x, ids, `questProgress[${i}]`);
        need(v.stars === undefined || isObj(v.stars), `questProgress[${i}].stars`);
        need(v.chests === undefined || isObj(v.chests), `questProgress[${i}].chests`);
        return normalizeQuestRecord(v as Partial<QuestRecord>, v.profileId as string);
      }),
      (q) => q.profileId,
      'questProgress'
    );
    const inventory = unique(
      list(b.inventory, 'inventory').map((x, i) => {
        const v = owned(x, ids, `inventory[${i}]`);
        need(PLAY_WORLDS.includes(v.worldId as PlayWorldId), `inventory[${i}].worldId`);
        return normalizeInventory(v as Partial<Inventory>, v.profileId as string, v.worldId as string);
      }),
      (r) => `${r.profileId}:${r.worldId}`,
      'inventory'
    );
    const sessions = unique(
      list(b.sessions, 'sessions').map((x, i) => {
        const v = owned(x, ids, `sessions[${i}]`);
        need(typeof v.day === 'string' && DAY_RE.test(v.day), `sessions[${i}].day`);
        return normalizeDayLog(v as Partial<DayLog>, v.profileId as string, v.day);
      }),
      (d) => `${d.profileId}:${d.day}`,
      'sessions'
    );
    let parentLock: ParentLock | null = null;
    if (b.parentLock !== undefined && b.parentLock !== null) {
      parentLock = normalizeParentLock(b.parentLock);
      need(parentLock, 'parentLock');
    }
    return {
      ok: true,
      backup: {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: b.exportedAt,
        schemaVersion: isInt(b.schemaVersion, 1, 1000) ? (b.schemaVersion as number) : 1,
        app: typeof b.app === 'string' ? b.app.slice(0, 40) : '',
        profiles,
        skillStates,
        questProgress,
        inventory,
        sessions,
        parentLock
      }
    };
  } catch (e) {
    if (e instanceof Invalid) return { ok: false, error: { code: 'invalid', detail: e.message } };
    throw e;
  }
}

/** The text of a file (as read from disk) → a checked backup, or why not. */
export function parseBackup(text: string): ParseResult {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, error: { code: 'too-big' } };
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return { ok: false, error: { code: 'not-json' } };
  }
  return checkBackup(raw);
}

// ---------- Reading and writing the phone ----------

export async function makeBackup(now = new Date()): Promise<Backup> {
  const [profiles, skillStates, questProgress, inventory, sessions, lock] = await Promise.all([
    dbGetAll<Profile>('profiles'),
    dbGetAll<SkillState>('skillStates'),
    dbGetAll<QuestRecord>('questProgress'),
    dbGetAll<Inventory>('inventory'),
    dbGetAll<DayLog>('sessions'),
    dbGet<unknown>('meta', 'parentLock')
  ]);
  const ids = new Set(profiles.map((p) => p.id));
  // Leftovers of deleted profiles stay behind.
  const mine = <T extends { profileId?: string }>(xs: T[]) => xs.filter((x) => !!x && typeof x.profileId === 'string' && ids.has(x.profileId));
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    schemaVersion: SCHEMA_VERSION,
    app: APP_VERSION,
    profiles: profiles.map(normalizeProfile).sort((a, b) => a.createdAt - b.createdAt),
    skillStates: mine(skillStates),
    questProgress: mine(questProgress),
    inventory: mine(inventory),
    sessions: mine(sessions),
    parentLock: normalizeParentLock(lock)
  };
}

/** mathit-backup-2026-10-08.json (the local date). */
export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `mathit-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

export function backupJson(b: Backup): string {
  return JSON.stringify(b, null, 1);
}

/** What a profile has done, for the preview ("⭐ 45 · 🪙 30"). */
export function profileSummary(b: Backup, profileId: string): { stars: number; coins: number; questions: number } {
  const q = b.questProgress.find((x) => x.profileId === profileId);
  return {
    stars: q ? Object.values(q.stars).reduce((n, s) => n + s, 0) : 0,
    coins: b.inventory.filter((x) => x.profileId === profileId).reduce((n, x) => n + x.coins, 0),
    questions: b.skillStates.filter((x) => x.profileId === profileId).reduce((n, x) => n + x.attempts, 0)
  };
}

/** In "add" mode, what to do with a profile that is already on the phone (same id). */
export type Conflict = 'keep' | 'replace';

export interface RestorePlan {
  mode: 'add' | 'replace';
  /** For "add": the choice for each profile id on both. Missing = keep the phone's. */
  conflicts?: Record<string, Conflict>;
}

/** Profiles in the backup that are already on the phone (same id). */
export function conflictsWith(backup: Backup, onPhone: Pick<Profile, 'id'>[]): Profile[] {
  const ids = new Set(onPhone.map((p) => p.id));
  return backup.profiles.filter((p) => ids.has(p.id));
}

/** The stores whose records belong to one profile, and each record's key. */
const PER_PROFILE: { store: StoreName; key: (x: never) => string; of: (b: Backup) => { profileId: string }[] }[] = [
  { store: 'skillStates', key: (x: SkillState) => `${x.profileId}:${x.skillId}`, of: (b) => b.skillStates },
  { store: 'questProgress', key: (x: QuestRecord) => x.profileId, of: (b) => b.questProgress },
  { store: 'inventory', key: (x: Inventory) => `${x.profileId}:${x.worldId}`, of: (b) => b.inventory },
  { store: 'sessions', key: (x: DayLog) => `${x.profileId}:${x.day}`, of: (b) => b.sessions }
];

export interface PhoneState {
  profiles: Pick<Profile, 'id'>[];
  /** Every key of every per-profile store. */
  keys: Partial<Record<StoreName, string[]>>;
  lastProfileId?: string;
  hasParentLock: boolean;
}

/**
 * The database changes a restore makes (pure, for tests). "replace" empties the family's stores
 * first; "add" writes new profiles and the conflicts marked "replace" (their old records on the
 * phone are removed first). A profile written always takes all its records from the backup.
 * The parents' PIN: "replace" takes the backup's (if it has one); "add" only when the phone has
 * none. A last profile that is gone is forgotten.
 */
export function restoreOps(backup: Backup, plan: RestorePlan, phone: PhoneState): { ops: DbOp[]; written: string[] } {
  const ops: DbOp[] = [];
  const onPhone = new Set(phone.profiles.map((p) => p.id));
  let write: Profile[];
  if (plan.mode === 'replace') {
    ops.push({ store: 'profiles', op: 'clear' });
    for (const s of PER_PROFILE) ops.push({ store: s.store, op: 'clear' });
    write = backup.profiles;
  } else {
    write = backup.profiles.filter((p) => !onPhone.has(p.id) || plan.conflicts?.[p.id] === 'replace');
    for (const p of write) {
      if (!onPhone.has(p.id)) continue;
      for (const s of PER_PROFILE)
        for (const k of phone.keys[s.store] ?? []) if (k === p.id || k.startsWith(`${p.id}:`)) ops.push({ store: s.store, op: 'delete', key: k });
    }
  }
  const ids = new Set(write.map((p) => p.id));
  for (const p of write) ops.push({ store: 'profiles', op: 'put', key: p.id, value: p });
  for (const s of PER_PROFILE)
    for (const x of s.of(backup)) if (ids.has(x.profileId)) ops.push({ store: s.store, op: 'put', key: s.key(x as never), value: x });
  if (backup.parentLock && (plan.mode === 'replace' || !phone.hasParentLock)) ops.push({ store: 'meta', op: 'put', key: 'parentLock', value: backup.parentLock });

  const after = new Set(plan.mode === 'replace' ? backup.profiles.map((p) => p.id) : [...onPhone, ...ids]);
  if (phone.lastProfileId && !after.has(phone.lastProfileId)) ops.push({ store: 'meta', op: 'delete', key: 'lastProfileId' });
  return { ops, written: write.map((p) => p.id) };
}

/** Restore a checked backup on this phone, all or nothing. Returns the ids of the profiles written. */
export async function restoreBackup(backup: Backup, plan: RestorePlan): Promise<string[]> {
  const [profiles, lastProfileId, lock, ...keys] = await Promise.all([
    dbGetAll<Profile>('profiles'),
    dbGet<string>('meta', 'lastProfileId'),
    dbGet<unknown>('meta', 'parentLock'),
    ...PER_PROFILE.map((s) => dbKeys(s.store))
  ]);
  const phone: PhoneState = {
    profiles,
    lastProfileId,
    hasParentLock: !!normalizeParentLock(lock),
    keys: Object.fromEntries(PER_PROFILE.map((s, i) => [s.store, keys[i]]))
  };
  const { ops, written } = restoreOps(backup, plan, phone);
  await dbWrite(ops);
  return written;
}
