// Coins and collectibles (store `inventory`, schema 4, key `${profileId}:${worldId}`): every world
// keeps its own purse and its own shelf, so switching worlds starts a new collection and coming
// back finds the old one. Coins come from right answers (rounds and the boss); collectibles
// from chests and beaten bosses, in the order the world lists them (World.rewards).
// Saved at once (after every coin), through a queue per key so quick answers never overwrite
// each other. Loaded with the map and the games (not in the first load).
import { dbDelete, dbGet, dbGetAll, dbKeys, dbPut } from './db';
import { progressChanged } from './changes';

export interface Inventory {
  profileId: string;
  worldId: string;
  coins: number;
  /** Collectible ids, in the order they were won. */
  items: string[];
  /** ms since 1970. */
  updated: number;
}

const key = (profileId: string, worldId: string) => `${profileId}:${worldId}`;

/** Fill missing fields and drop broken values. */
export function normalizeInventory(raw: Partial<Inventory> | undefined, profileId: string, worldId: string): Inventory {
  const coins = typeof raw?.coins === 'number' && Number.isFinite(raw.coins) && raw.coins > 0 ? Math.floor(raw.coins) : 0;
  const items = Array.isArray(raw?.items) ? [...new Set(raw!.items.filter((x): x is string => typeof x === 'string'))] : [];
  return { profileId, worldId, coins, items, updated: typeof raw?.updated === 'number' ? raw.updated : 0 };
}

export async function getInventory(profileId: string, worldId: string): Promise<Inventory> {
  return normalizeInventory(await dbGet<Inventory>('inventory', key(profileId, worldId)), profileId, worldId);
}

/** Every world's inventory of a profile (the collection screen). */
export async function listInventories(profileId: string): Promise<Inventory[]> {
  const all = await dbGetAll<Inventory>('inventory');
  return all.filter((r) => r?.profileId === profileId).map((r) => normalizeInventory(r, profileId, r.worldId));
}

const queues = new Map<string, Promise<unknown>>();

/** Read, change and save one record, after any change already on its way. */
function change(profileId: string, worldId: string, f: (inv: Inventory) => Inventory): Promise<Inventory> {
  const k = key(profileId, worldId);
  const run = (queues.get(k) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const next = { ...f(await getInventory(profileId, worldId)), updated: Date.now() };
    await dbPut('inventory', k, next);
    progressChanged(profileId);
    return next;
  });
  queues.set(k, run);
  return run;
}

export function addCoins(profileId: string, worldId: string, n: number): Promise<Inventory> {
  return change(profileId, worldId, (inv) => ({ ...inv, coins: inv.coins + Math.max(0, Math.floor(n)) }));
}

export function addItem(profileId: string, worldId: string, itemId: string): Promise<Inventory> {
  return change(profileId, worldId, (inv) => (inv.items.includes(itemId) ? inv : { ...inv, items: [...inv.items, itemId] }));
}

/** The next thing to win in a world: the first of its rewards not yet on the shelf. */
export function nextReward<T extends { id: string }>(rewards: readonly T[] | undefined, inv: Pick<Inventory, 'items'>): T | null {
  return rewards?.find((r) => !inv.items.includes(r.id)) ?? null;
}

/** With the profile. */
export async function deleteInventories(profileId: string): Promise<void> {
  const keys = await dbKeys('inventory');
  await Promise.all(keys.filter((k) => k.startsWith(`${profileId}:`)).map((k) => dbDelete('inventory', k)));
}
