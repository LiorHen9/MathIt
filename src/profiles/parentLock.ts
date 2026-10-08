// The parents' PIN on this phone (meta `parentLock`, profiles/pin.ts): read, set, removed.
// Loaded with the parents' area only.
import { dbDelete, dbGet, dbPut } from '../storage/db';
import { makeParentLock, normalizeParentLock, type ParentLock } from './pin';

const KEY = 'parentLock';

export async function getParentLock(): Promise<ParentLock | null> {
  return normalizeParentLock(await dbGet<unknown>('meta', KEY));
}

export async function setParentPin(pin: string): Promise<ParentLock> {
  const lock = await makeParentLock(pin);
  await dbPut('meta', KEY, lock);
  return lock;
}

export function clearParentPin(): Promise<void> {
  return dbDelete('meta', KEY);
}
