// When this phone last saved a backup (meta `backup`), and the gentle reminder in the parents'
// area: after REMIND_DAYS without a backup – counted from the last one, or from the first profile
// when there was never one. Small; loaded with the parents' area.
import { dbGet, dbPut } from './db';

export interface BackupState {
  /** The last time a backup file was saved or shared (ms; 0 = never). */
  lastBackupAt: number;
}

const KEY = 'backup';
export const REMIND_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;

export async function loadBackupState(): Promise<BackupState> {
  const raw = await dbGet<Partial<BackupState>>('meta', KEY);
  const t = raw?.lastBackupAt;
  return { lastBackupAt: typeof t === 'number' && Number.isFinite(t) && t > 0 ? t : 0 };
}

export function markBackedUp(at = Date.now()): Promise<void> {
  return dbPut('meta', KEY, { lastBackupAt: at });
}

/** Time for a reminder? Only with profiles, and REMIND_DAYS after the last backup (or the first profile). */
export function backupDue(state: BackupState, profilesCreated: number[], now: number): boolean {
  if (profilesCreated.length === 0) return false;
  const since = state.lastBackupAt || Math.min(...profilesCreated);
  return now - since >= REMIND_DAYS * DAY;
}
