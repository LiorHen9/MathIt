// Backup checks that need no browser: `bun tests/storage/check.ts`
// A full family round-trips through the file with every field of every store (a new field must
// be added to the sample below – it fails here otherwise); broken, foreign, future and older
// files; what "add" and "replace" write; the backup reminder.
import { BACKUP_FORMAT, BACKUP_VERSION, backupFileName, backupJson, checkBackup, conflictsWith, errorText, parseBackup, profileSummary, restoreOps, type Backup } from '../../src/storage/backup';
import { backupDue, REMIND_DAYS } from '../../src/storage/backupState';
import { normalizeProfile, type Profile } from '../../src/profiles/profiles';
import { normalizeSkillState, type SkillState } from '../../src/storage/skillStates';
import { normalizeQuestRecord, type QuestRecord } from '../../src/storage/questProgress';
import { normalizeInventory, type Inventory } from '../../src/storage/inventory';
import { normalizeDayLog, type DayLog } from '../../src/core/parents/days';
import { normalizeAchievementRecord, type AchievementRecord } from '../../src/storage/achievementRecord';

let failures = 0;
const fail = (msg: string) => {
  failures++;
  console.log('✗', msg);
};
const ok = (msg: string) => console.log('✓', msg);
/** Deep equality, whatever the order of keys. */
const canon = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])])) : v;
const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const DAY = 24 * 60 * 60 * 1000;
const T = Date.UTC(2026, 9, 8, 12);

// A family where every field has a value that is not its default.
const profile: Profile = {
  id: 'kid1',
  name: 'נועה',
  avatar: '🦄',
  age: 6,
  gender: 'girl',
  worldId: 'stage',
  pinHash: 'a'.repeat(64),
  pinSalt: 'b'.repeat(32),
  settings: { sfx: false, music: false, narration: false, volume: 0.3, reducedMotion: true, speechHelpSeen: true },
  parent: { goal: { kind: 'minutes', amount: 15 }, breakAfter: 20, blocked: ['match', 'jump'], lockAhead: true },
  createdAt: T - 30 * DAY
};
const brother: Profile = { ...normalizeProfile({ id: 'kid2', name: 'עומר', grade: 2, worldId: 'football' }), createdAt: T - 20 * DAY };
const skill: SkillState = {
  profileId: 'kid1',
  skillId: 'add.within10',
  level: 2,
  bestStars: 3,
  rounds: 4,
  lastPlayed: T - DAY,
  lessonSeen: true,
  mastery: 0.7,
  attempts: 30,
  recentResults: [true, false, true],
  avgTimeMs: 4200,
  totalMs: 120000,
  lastPracticed: T - DAY,
  nextReview: T + 3 * DAY,
  reviewStep: 2,
  errorCounts: { 'count-off-by-one': 3, added: 1 }
};
const quest: QuestRecord = {
  profileId: 'kid1',
  stars: { 'c1-count-lesson': 1, 'c1-count-5': 3 },
  chests: { 'c1-chest': '🌈' },
  at: 'c1-count-5',
  revealed: ['c1-count-lesson', 'c1-count-5'],
  last: 'c1-count-5',
  updated: T - DAY,
  reviewedAt: T - 2 * DAY,
  reviews: 2,
  reviewRevealed: T - 2 * DAY,
  placedAt: T - 29 * DAY,
  opened: ['c3']
};
const inv: Inventory = { profileId: 'kid1', worldId: 'stage', coins: 42, items: ['mic', 'star'], updated: T - DAY };
const day: DayLog = { profileId: 'kid1', day: '2026-10-07', ms: 600000, questions: 25, right: 20, goalAt: T - DAY };
const ach: AchievementRecord = { profileId: 'kid1', unlocked: { 'first-right': T - 9 * DAY, 'streak-10': T - DAY }, streak: 4, bestStreak: 12, since: T - 10 * DAY, updated: T - DAY };
const lock = { salt: 'c'.repeat(32), hash: 'd'.repeat(64) };
const family: Backup = {
  format: BACKUP_FORMAT,
  version: BACKUP_VERSION,
  exportedAt: new Date(T).toISOString(),
  schemaVersion: 6,
  app: '1.0.0',
  profiles: [profile, brother],
  skillStates: [skill],
  questProgress: [quest],
  inventory: [inv],
  sessions: [day],
  achievements: [ach],
  parentLock: lock
};

// Every field of the sample is what the app itself keeps (normalize* leaves it alone): a field
// added to a store must be added here, or this fails.
{
  const pairs: [string, unknown, unknown][] = [
    ['profile', profile, normalizeProfile(profile)],
    ['skillState', skill, normalizeSkillState(skill)],
    ['questProgress', quest, normalizeQuestRecord(quest, 'kid1')],
    ['inventory', inv, normalizeInventory(inv, 'kid1', 'stage')],
    ['sessions', day, normalizeDayLog(day, 'kid1', day.day)],
    ['achievements', ach, normalizeAchievementRecord(ach, 'kid1')]
  ];
  for (const [what, sample, norm] of pairs) {
    const missing = Object.keys(norm as object).filter((k) => !(k in (sample as object)));
    if (missing.length) fail(`${what}: the backup sample lacks ${missing.join(', ')}`);
    if (!same(norm, sample)) fail(`${what}: the sample is not a normalized record ${JSON.stringify(norm)}`);
  }
  ok('the sample family covers every field of every store (profiles with settings and parents’ settings, skillStates, questProgress, inventory, sessions, achievements, the parents’ PIN)');
}

// Round trip.
{
  const text = backupJson(family);
  const r = parseBackup('﻿' + text);
  if (!r.ok) fail('round trip: ' + JSON.stringify(r.error));
  else if (!same(r.backup, family)) fail('round trip changed something:\n' + JSON.stringify(r.backup) + '\n' + JSON.stringify(family));
  if (!/^mathit-backup-\d{4}-\d{2}-\d{2}\.json$/.test(backupFileName(new Date(T)))) fail('file name');
  const s = profileSummary(family, 'kid1');
  if (s.stars !== 4 || s.coins !== 42 || s.questions !== 30) fail('profileSummary ' + JSON.stringify(s));
  ok('round trip: every store and field comes back as it was (a BOM is fine); file name; summary');
}

// Broken, foreign, future and older files.
{
  const code = (text: string) => {
    const r = parseBackup(text);
    return r.ok ? 'ok' : r.error.code;
  };
  const j = (o: unknown) => JSON.stringify(o);
  const cases: [string, string, string][] = [
    ['not JSON', '{"format": "mathit-ba', 'not-json'],
    ['another file', j({ hello: 1 }), 'not-backup'],
    ['ChessIt', j({ format: 'chessit-backup', version: 1 }), 'chessit'],
    ['future', j({ ...family, version: BACKUP_VERSION + 1 }), 'future'],
    ['too big', 'x'.repeat(5 * 1024 * 1024 + 1), 'too-big'],
    ['no profiles list', j({ ...family, profiles: 'x' }), 'invalid'],
    ['a record of nobody', j({ ...family, skillStates: [{ ...skill, profileId: 'ghost' }] }), 'invalid'],
    ['an unknown skill', j({ ...family, skillStates: [{ ...skill, skillId: 'fly' }] }), 'invalid'],
    ['an unknown world', j({ ...family, inventory: [{ ...inv, worldId: 'moon' }] }), 'invalid'],
    ['a bad day', j({ ...family, sessions: [{ ...day, day: 'yesterday' }] }), 'invalid'],
    ['achievements of nobody', j({ ...family, achievements: [{ ...ach, profileId: 'ghost' }] }), 'invalid'],
    ['twice the same achievements', j({ ...family, achievements: [ach, ach] }), 'invalid'],
    ['achievements not a map', j({ ...family, achievements: [{ ...ach, unlocked: ['first-right'] }] }), 'invalid'],
    ['twice the same profile', j({ ...family, profiles: [profile, profile] }), 'invalid'],
    ['twice the same day', j({ ...family, sessions: [day, day] }), 'invalid'],
    ['a PIN without its salt', j({ ...family, profiles: [{ ...profile, pinSalt: undefined }] }), 'invalid'],
    ['a broken parents PIN', j({ ...family, parentLock: { salt: 'x' } }), 'invalid'],
    ['a cut file', backupJson(family).slice(0, 300), 'not-json']
  ];
  for (const [what, text, want] of cases) if (code(text) !== want) fail(`${what}: ${code(text)} (expected ${want})`);
  for (const c of ['too-big', 'not-json', 'not-backup', 'chessit', 'future', 'invalid'] as const) if (!/[א-ת]/.test(errorText({ code: c, version: 9, detail: '' } as never))) fail('error text ' + c);
  // A phone on schema 3 (no inventory, no sessions) and fields an older app did not have.
  const old = { ...family, schemaVersion: 3, inventory: undefined, sessions: undefined, parentLock: undefined, profiles: [{ ...profile, parent: undefined }], questProgress: [{ ...quest, opened: undefined, placedAt: undefined }] };
  const r = parseBackup(j(old));
  if (!r.ok) fail('an older phone: ' + JSON.stringify(r.error));
  else if (r.backup.inventory.length || r.backup.sessions.length || r.backup.parentLock || r.backup.profiles[0].parent.goal !== null || r.backup.questProgress[0].opened.length || r.backup.questProgress[0].placedAt !== 0) fail('older phone: defaults');
  // Junk inside a record is dropped, the rest kept.
  const junk = parseBackup(j({ ...family, questProgress: [{ ...quest, stars: { ...quest.stars, nowhere: 3 }, extra: 'x' }], achievements: [{ ...ach, unlocked: { ...ach.unlocked, 'fly-to-moon': T } }] }));
  if (!junk.ok || 'nowhere' in junk.backup.questProgress[0].stars || 'extra' in junk.backup.questProgress[0] || 'fly-to-moon' in junk.backup.achievements[0].unlocked) fail('unknown stations, achievements and fields are dropped');
  // A phone on schema 5 (phase 9, before achievements): everything else restores, no achievements –
  // the app marks what was already earned as shown at the first check (storage/achievements.ts).
  const five = parseBackup(j({ ...family, schemaVersion: 5, app: '0.10.0', achievements: undefined }));
  if (!five.ok) fail('a schema 5 backup: ' + JSON.stringify(five.error));
  else if (five.backup.achievements.length || five.backup.sessions.length !== 1 || five.backup.inventory.length !== 1 || five.backup.profiles.length !== 2) fail('a schema 5 backup restores everything it has, and no achievements');
  ok(`refused with a reason (in Hebrew): ${cases.length} broken or foreign files, ChessIt's, a newer app's; an older phone (schema 3) restores with defaults, one on schema 5 without achievements; junk dropped`);
}

// What a restore writes.
{
  const phone = { profiles: [{ id: 'kid1' }, { id: 'other' }], keys: { skillStates: ['kid1:add.within10', 'kid1:count.to10', 'other:add.within10'], questProgress: ['kid1', 'other'], inventory: ['kid1:fairies'], sessions: ['kid1:2026-10-01'], achievements: ['kid1', 'other'] }, lastProfileId: 'other', hasParentLock: true };
  const rep = restoreOps(family, { mode: 'replace' }, phone);
  const clears = rep.ops.filter((o) => o.op === 'clear').map((o) => o.store);
  if (clears.sort().join() !== 'achievements,inventory,profiles,questProgress,sessions,skillStates') fail('replace clears the family stores: ' + clears);
  if (!rep.ops.some((o) => o.store === 'meta' && o.op === 'put' && o.key === 'parentLock')) fail('replace takes the parents PIN');
  if (!rep.ops.some((o) => o.store === 'meta' && o.op === 'delete' && o.key === 'lastProfileId')) fail('replace forgets a last profile that is gone');
  if (rep.written.join() !== 'kid1,kid2') fail('replace writes everyone');
  // Add, keeping the phone's kid1: only kid2 is written, nothing of kid1 is touched.
  const keep = restoreOps(family, { mode: 'add' }, phone);
  if (keep.written.join() !== 'kid2' || keep.ops.some((o) => 'key' in o && o.key.startsWith('kid1')) || keep.ops.some((o) => o.op === 'clear')) fail('add keeps a profile on both: ' + JSON.stringify(keep.ops));
  if (keep.ops.some((o) => o.store === 'meta')) fail('add keeps the phone’s parents PIN and last profile');
  // Add, taking kid1 from the backup: its old records go first, then the backup's.
  const take = restoreOps(family, { mode: 'add', conflicts: { kid1: 'replace' } }, phone);
  const del = take.ops.filter((o) => o.op === 'delete').map((o) => `${o.store}/${'key' in o ? o.key : ''}`);
  if (del.sort().join() !== 'achievements/kid1,inventory/kid1:fairies,questProgress/kid1,sessions/kid1:2026-10-01,skillStates/kid1:add.within10,skillStates/kid1:count.to10') fail('add + replace removes the old records of that child only: ' + del);
  const firstPut = take.ops.findIndex((o) => o.op === 'put');
  if (take.ops.slice(0, firstPut).some((o) => o.op !== 'delete') || take.ops.slice(firstPut).some((o) => o.op === 'delete')) fail('deletes before puts');
  const puts = take.ops.filter((o) => o.op === 'put').map((o) => `${o.store}/${'key' in o ? o.key : ''}`);
  for (const k of ['profiles/kid1', 'profiles/kid2', 'skillStates/kid1:add.within10', 'questProgress/kid1', 'inventory/kid1:stage', 'sessions/kid1:2026-10-07', 'achievements/kid1']) if (!puts.includes(k)) fail('add + replace writes ' + k);
  if (conflictsWith(family, phone.profiles).map((p) => p.id).join() !== 'kid1') fail('conflictsWith');
  const fresh = restoreOps(family, { mode: 'add' }, { profiles: [], keys: {}, hasParentLock: false });
  if (!fresh.ops.some((o) => o.store === 'meta' && o.key === 'parentLock')) fail('add on a phone without a parents PIN takes the backup’s');
  ok('restore: "replace" empties and writes all (with the parents PIN); "add" keeps or replaces a child on both (old records removed first), takes the PIN only when the phone has none');
}

// The reminder.
{
  if (backupDue({ lastBackupAt: 0 }, [], T)) fail('no profiles, no reminder');
  if (backupDue({ lastBackupAt: 0 }, [T - 3 * DAY], T) || !backupDue({ lastBackupAt: 0 }, [T - REMIND_DAYS * DAY], T)) fail('never backed up: 14 days after the first profile');
  if (backupDue({ lastBackupAt: T - 13 * DAY }, [T - 90 * DAY], T) || !backupDue({ lastBackupAt: T - 15 * DAY }, [T - 90 * DAY], T)) fail('14 days after the last backup');
  ok(`the reminder: ${REMIND_DAYS} days after the last backup (or the first profile), never without profiles`);
}

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log('\nall storage checks passed');
