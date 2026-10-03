// Profiles: one per child on this phone (adapted from ChessIt). Stored in the `profiles` store,
// one record per profile, with the profile's own settings inside (docs/ARCHITECTURE.md §8).
// Records written by an older version may lack newer fields: `normalizeProfile` fills them, so
// adding a field with a default needs no migration (a new store or key does: see storage/db.ts).
import { dbDelete, dbGet, dbGetAll, dbPut } from '../storage/db';
import { deleteSkillStates } from '../storage/skillStates';
import type { AgeBand } from '../core/types';
import type { WorldId } from '../worlds/types';

export type { AgeBand } from '../core/types';

export type Gender = 'boy' | 'girl' | 'other';
/** A world a profile can play in (not the neutral base look). */
export type PlayWorldId = Exclude<WorldId, 'base'>;

export interface ProfileSettings {
  /** Sound effects. */
  sfx: boolean;
  /** Background music (saved now, plays from phase 5). */
  music: boolean;
  /** Read new tasks aloud by themselves (the 🔊 button works either way). */
  narration: boolean;
  /** 0..1, for effects (and music later). */
  volume: number;
  /** Short feedback animations: true / false, or null to follow the phone's setting. */
  reducedMotion: boolean | null;
  /** The "how to add a Hebrew voice" note was shown and dismissed. */
  speechHelpSeen: boolean;
}

export interface Profile {
  id: string;
  name: string;
  /** An emoji. */
  avatar: string;
  /** School year: 0 = kindergarten (גן חובה), 1–6 = א׳–ו׳. Set this or `age`. */
  grade?: number;
  /** Age 4–12, for parents who prefer it to a grade. */
  age?: number;
  /** For addressing the child correctly in Hebrew (byGender) and for the hero. Optional. */
  gender?: Gender;
  worldId: PlayWorldId;
  /** Optional PIN (profiles/pin.ts): SHA-256 of salt + digits, never the digits. */
  pinHash?: string;
  pinSalt?: string;
  settings: ProfileSettings;
  createdAt: number;
}

export const GRADES: { grade: number; label: string }[] = [
  { grade: 0, label: 'גן חובה' },
  { grade: 1, label: 'א׳' },
  { grade: 2, label: 'ב׳' },
  { grade: 3, label: 'ג׳' },
  { grade: 4, label: 'ד׳' },
  { grade: 5, label: 'ה׳' },
  { grade: 6, label: 'ו׳' }
];
export const AGES = [4, 5, 6, 7, 8, 9, 10, 11, 12];

export const GENDERS: { id: Gender; label: string }[] = [
  { id: 'boy', label: 'בן' },
  { id: 'girl', label: 'בת' },
  { id: 'other', label: 'אחר' }
];

export const AVATARS = ['🦁', '🐯', '🐻', '🐼', '🦊', '🐸', '🐵', '🦄', '🐲', '🐙', '🦉', '🐧', '🐶', '🐱', '🐰', '🦖', '🚀', '⭐'];

export const PLAY_WORLDS: PlayWorldId[] = ['fairies', 'football', 'basketball', 'ninja', 'blocks', 'stage'];

export function newProfileId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Pick the Hebrew form that matches the profile ("ניצח" / "ניצחה" / "ניצח/ה").
 * Without a gender (or "other"), `neutral` is used when given, otherwise a combined form.
 */
export function byGender(p: Pick<Profile, 'gender'> | null | undefined, male: string, female: string, neutral?: string): string {
  if (p?.gender === 'boy') return male;
  if (p?.gender === 'girl') return female;
  if (neutral !== undefined) return neutral;
  // "שחקן" / "שחקנית" → "שחקן/ית": a final letter (ן ם ך ף ץ) counts as its regular form.
  const stem = male.replace(/[ןםךףץ]$/, (c) => FINAL_TO_REGULAR[c]);
  if (female.startsWith(stem) && female.length > stem.length) return `${male}/${female.slice(stem.length)}`;
  return `${male}/${female}`;
}

const FINAL_TO_REGULAR: Record<string, string> = { ן: 'נ', ם: 'מ', ך: 'כ', ף: 'פ', ץ: 'צ' };

/** About how old the child is: the age, or the usual age for the grade (א׳ ≈ 6). */
export function approxAge(p: Pick<Profile, 'grade' | 'age'>): number {
  if (p.age !== undefined) return p.age;
  // גן חובה ≈ 5, א׳ ≈ 6 … ו׳ ≈ 11.
  if (p.grade !== undefined) return p.grade + 5;
  return 7;
}

/** The age band of the skill graph (docs/ARCHITECTURE.md §4.1). */
export function ageBand(p: Pick<Profile, 'grade' | 'age'>): AgeBand {
  const a = approxAge(p);
  if (a <= 5) return '4-5';
  if (a <= 7) return '6-7';
  if (a <= 9) return '8-9';
  return '10-12';
}

/** "כיתה ב׳", "גן חובה" or "גיל 6". */
export function stageLabel(p: Pick<Profile, 'grade' | 'age'>): string {
  if (p.grade !== undefined) return p.grade === 0 ? 'גן חובה' : `כיתה ${GRADES[p.grade]?.label ?? p.grade}`;
  if (p.age !== undefined) return `גיל ${p.age}`;
  return '';
}

export function defaultSettings(p: Pick<Profile, 'grade' | 'age'>): ProfileSettings {
  return {
    sfx: true,
    music: true,
    // Young children may not read yet: tasks are read aloud by default up to about 7.
    narration: approxAge(p) <= 7,
    volume: 0.8,
    reducedMotion: null,
    speechHelpSeen: false
  };
}

/** A stored record as a full Profile: missing fields get their defaults, bad values are fixed. */
export function normalizeProfile(raw: Partial<Profile> & { id: string }): Profile {
  const grade = Number.isInteger(raw.grade) && raw.grade! >= 0 && raw.grade! <= 6 ? raw.grade : undefined;
  const age = grade === undefined && Number.isInteger(raw.age) && raw.age! >= 4 && raw.age! <= 12 ? raw.age : undefined;
  const stage = grade === undefined && age === undefined ? { grade: 1 } : { grade, age };
  const s: Partial<ProfileSettings> = raw.settings ?? {};
  const d = defaultSettings(stage);
  const p: Profile = {
    id: raw.id,
    name: (raw.name ?? '').trim() || 'שחקן',
    avatar: raw.avatar || AVATARS[0],
    worldId: PLAY_WORLDS.includes(raw.worldId as PlayWorldId) ? raw.worldId! : 'fairies',
    settings: {
      sfx: typeof s.sfx === 'boolean' ? s.sfx : d.sfx,
      music: typeof s.music === 'boolean' ? s.music : d.music,
      narration: typeof s.narration === 'boolean' ? s.narration : d.narration,
      volume: typeof s.volume === 'number' && s.volume >= 0 && s.volume <= 1 ? s.volume : d.volume,
      reducedMotion: typeof s.reducedMotion === 'boolean' ? s.reducedMotion : null,
      speechHelpSeen: s.speechHelpSeen === true
    },
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : 0
  };
  if (stage.grade !== undefined) p.grade = stage.grade;
  if (stage.age !== undefined) p.age = stage.age;
  if (raw.gender === 'boy' || raw.gender === 'girl' || raw.gender === 'other') p.gender = raw.gender;
  if (raw.pinHash && raw.pinSalt) {
    p.pinHash = raw.pinHash;
    p.pinSalt = raw.pinSalt;
  }
  return p;
}

export async function listProfiles(): Promise<Profile[]> {
  const all = await dbGetAll<Profile>('profiles');
  return all.map(normalizeProfile).sort((a, b) => a.createdAt - b.createdAt);
}

export function saveProfile(p: Profile): Promise<void> {
  return dbPut('profiles', p.id, p);
}

export async function deleteProfile(id: string): Promise<void> {
  await dbDelete('profiles', id);
  await deleteSkillStates(id);
  if ((await getLastProfileId()) === id) await dbDelete('meta', 'lastProfileId');
}

/** The profile that played last on this phone (shown first in "who is playing?"). */
export function getLastProfileId(): Promise<string | undefined> {
  return dbGet<string>('meta', 'lastProfileId');
}

export function setLastProfileId(id: string): Promise<void> {
  return dbPut('meta', 'lastProfileId', id);
}
