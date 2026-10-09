// Local storage on the device, in IndexedDB (adapted from ChessIt).
// Every store uses explicit keys, so records stay plain objects.
// If IndexedDB is unavailable (some private-browsing modes), data lives in memory
// for the session and the app still works.
//
// Stores today: meta (schemaVersion, deviceId, errorLog…), profiles, skillStates (version 2:
// a profile's results per skill – level, best stars, rounds; storage/skillStates.ts) and
// questProgress (version 3: a profile's way on the quest map; storage/questProgress.ts) and
// inventory (version 4: coins and collectibles per profile and world; storage/inventory.ts) and
// sessions (version 5: practice per profile and day, for parents; storage/sessions.ts) and
// achievements (version 6: celebrated achievements and the best streak per profile; storage/achievements.ts).
// Each addition bumps SCHEMA_VERSION and adds a step to MIGRATIONS.

export type StoreName = 'meta' | 'profiles' | 'skillStates' | 'questProgress' | 'inventory' | 'sessions' | 'achievements';

const DB_NAME = 'mathit';
/** Bump when stores change, and add a migration step below. */
export const SCHEMA_VERSION = 6;
const STORES: StoreName[] = ['meta', 'profiles', 'skillStates', 'questProgress', 'inventory', 'sessions', 'achievements'];

/**
 * Migration steps, by the version they upgrade TO. Each runs inside the upgrade transaction,
 * in order, from the phone's old version up to SCHEMA_VERSION. Version 1 creates the stores.
 */
const MIGRATIONS: Record<number, (db: IDBDatabase, tx: IDBTransaction) => void> = {
  1: (db) => {
    for (const name of ['meta', 'profiles']) {
      if (!db.objectStoreNames.contains(name)) db.createObjectStore(name);
    }
  },
  // Phase 2: results per profile and skill, key `${profileId}:${skillId}`. Nothing to convert.
  2: (db) => {
    if (!db.objectStoreNames.contains('skillStates')) db.createObjectStore('skillStates');
  },
  // Phase 4: the quest map, one record per profile (key = profile id). What a profile did before
  // (skillStates) becomes stations on the map the first time its map is read
  // (storage/questProgress.ts), so the migration from 1 or 2 only adds the store.
  3: (db) => {
    if (!db.objectStoreNames.contains('questProgress')) db.createObjectStore('questProgress');
  },
  // Phase 5: coins and collectibles, key `${profileId}:${worldId}` (each world keeps its own).
  // Nothing to convert: a sticker from a chest opened before (phase 4) stays in questProgress
  // (chests[nodeId]) and the collection shows it.
  4: (db) => {
    if (!db.objectStoreNames.contains('inventory')) db.createObjectStore('inventory');
  },
  // Phase 8: practice time per profile and local day, key `${profileId}:${yyyy-mm-dd}`, for the
  // parents' dashboard. Starts empty: days before it were not logged (all-time totals come from
  // skillStates).
  5: (db) => {
    if (!db.objectStoreNames.contains('sessions')) db.createObjectStore('sessions');
  },
  // Phase 10: achievements, one record per profile (key = profile id). Nothing to convert: what a
  // child already earned is computed from the other stores and marked as shown quietly at the
  // first check (storage/achievements.ts), so an upgrade never bursts with old achievements.
  6: (db) => {
    if (!db.objectStoreNames.contains('achievements')) db.createObjectStore('achievements');
  }
};

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memory = new Map<StoreName, Map<string, unknown>>(STORES.map((s) => [s, new Map()]));

function openDb(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      let req: IDBOpenDBRequest;
      try {
        req = indexedDB.open(DB_NAME, SCHEMA_VERSION);
      } catch {
        resolve(null);
        return;
      }
      req.onupgradeneeded = (e) => {
        const db = req.result;
        const tx = req.transaction!;
        for (let v = e.oldVersion + 1; v <= SCHEMA_VERSION; v++) MIGRATIONS[v]?.(db, tx);
        tx.objectStore('meta').put(SCHEMA_VERSION, 'schemaVersion');
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn('IndexedDB unavailable, keeping data in memory only', req.error);
        resolve(null);
      };
      req.onblocked = () => resolve(null);
    });
  }
  return dbPromise;
}

function run<T>(store: StoreName, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        if (!db) {
          reject(new Error('no-db'));
          return;
        }
        const tx = db.transaction(store, mode);
        const req = op(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result as T);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export async function dbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  try {
    return await run<T | undefined>(store, 'readonly', (s) => s.get(key));
  } catch {
    return memory.get(store)!.get(key) as T | undefined;
  }
}

export async function dbGetAll<T>(store: StoreName): Promise<T[]> {
  try {
    return await run<T[]>(store, 'readonly', (s) => s.getAll());
  } catch {
    return [...memory.get(store)!.values()] as T[];
  }
}

export async function dbPut<T>(store: StoreName, key: string, value: T): Promise<void> {
  try {
    await run(store, 'readwrite', (s) => s.put(value, key));
  } catch {
    memory.get(store)!.set(key, value);
  }
}

export async function dbDelete(store: StoreName, key: string): Promise<void> {
  try {
    await run(store, 'readwrite', (s) => s.delete(key));
  } catch {
    memory.get(store)!.delete(key);
  }
}

export async function dbKeys(store: StoreName): Promise<string[]> {
  try {
    return (await run<IDBValidKey[]>(store, 'readonly', (s) => s.getAllKeys())).map(String);
  } catch {
    return [...memory.get(store)!.keys()];
  }
}

/** One change in a `dbWrite` batch. `clear` empties the whole store. */
export type DbOp =
  | { store: StoreName; op: 'put'; key: string; value: unknown }
  | { store: StoreName; op: 'delete'; key: string }
  | { store: StoreName; op: 'clear' };

/**
 * Several changes over several stores, all or nothing (one IndexedDB transaction).
 * Used by restoring a backup and by "delete all data": a failure halfway leaves the old data as it was.
 */
export async function dbWrite(ops: DbOp[]): Promise<void> {
  const stores = [...new Set(ops.map((o) => o.store))];
  if (stores.length === 0) return;
  const db = await openDb();
  if (!db) {
    for (const o of ops) {
      const m = memory.get(o.store)!;
      if (o.op === 'clear') m.clear();
      else if (o.op === 'delete') m.delete(o.key);
      else m.set(o.key, o.value);
    }
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(stores, 'readwrite');
    for (const o of ops) {
      const s = tx.objectStore(o.store);
      if (o.op === 'clear') s.clear();
      else if (o.op === 'delete') s.delete(o.key);
      else s.put(o.value, o.key);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('aborted'));
  });
}

export const ALL_STORES: readonly StoreName[] = STORES;

/** A random id for this phone, kept in meta. Used later to tell backups from different phones apart. */
export async function deviceId(): Promise<string> {
  const have = await dbGet<string>('meta', 'deviceId');
  if (have) return have;
  const id = crypto.randomUUID?.() ?? `d${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  await dbPut('meta', 'deviceId', id);
  return id;
}

/** Ask the browser not to evict our data under storage pressure. Best effort. */
export async function requestPersistence(): Promise<void> {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) {
      await navigator.storage.persist?.();
    }
  } catch {
    // Not supported: nothing to do.
  }
}
