/**
 * Where the studio keeps work between visits.
 *
 * `localStorage` was the obvious first home — synchronous, three lines — but it
 * is one shared pot per origin, historically about 5MB for everything the page
 * keeps and still that on Safari. A label carrying an uploaded logo holds that
 * image inline as a data URL, so the store kept its own 2MB ceiling to stay
 * clear of it — two or three logo-bearing labels — and past the ceiling a
 * record is refused. Work that saves itself right up until the day it quietly
 * does not is worse than work that never claimed to.
 *
 * IndexedDB is the browser's answer to that: same machine, same privacy
 * properties, but sized against free disk rather than a fixed handful of
 * megabytes.
 *
 * Two things this deliberately does, because storage that loses work is the
 * whole failure this exists to avoid:
 *
 * - **Lifts what `localStorage` already holds.** Somebody who used the studio
 *   before this change has their list there and nowhere else. The first read
 *   copies it across. The original is left alone rather than deleted: it costs
 *   nothing that was not already spent, and an older build of the app — or a
 *   browser that turns IndexedDB off — still finds it.
 * - **Falls back to `localStorage` whole.** Private windows and locked-down
 *   browsers can refuse IndexedDB outright. Cramped storage still beats none.
 */
import type { StateStorage } from 'zustand/middleware';

const DB_NAME = 'tagmade';
const DB_VERSION = 1;
const STORE_NAME = 'kv';

/** Opened once and shared; every store using this storage wants the same handle. */
let opening: Promise<IDBDatabase | null> | null = null;

function localStore(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Reading the property itself throws where storage is blocked by policy.
    return null;
  }
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);

      return;
    }

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    // Every failure resolves rather than rejects: the caller's answer to "no
    // database" is the same as its answer to "database broke", and it is not
    // an error worth surfacing to somebody drawing a label.
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
}

function database(): Promise<IDBDatabase | null> {
  opening ??= openDatabase();

  return opening;
}

function request<T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const pending = work(transaction.objectStore(STORE_NAME));

    pending.onsuccess = () => resolve(pending.result);
    pending.onerror = () => reject(pending.error ?? new Error('idb request failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('idb transaction aborted'));
  });
}

export const idbStorage: StateStorage = {
  getItem: async (name) => {
    const db = await database();
    const fallback = localStore()?.getItem(name) ?? null;

    if (!db) {
      return fallback;
    }

    try {
      const stored = await request<unknown>(db, 'readonly', store => store.get(name));

      if (typeof stored === 'string') {
        return stored;
      }

      if (fallback !== null) {
        await request(db, 'readwrite', store => store.put(fallback, name));
      }

      return fallback;
    } catch {
      return fallback;
    }
  },

  setItem: async (name, value) => {
    const db = await database();

    if (db) {
      try {
        await request(db, 'readwrite', store => store.put(value, name));

        return;
      } catch {
        // Out of quota, or the database went away mid-session. Whatever fits
        // in the small pot is still better than dropping the write.
      }
    }

    localStore()?.setItem(name, value);
  },

  removeItem: async (name) => {
    const db = await database();

    if (db) {
      try {
        await request(db, 'readwrite', store => store.delete(name));
      } catch {
        // Nothing to do: the copy below is the one that would come back.
      }
    }

    localStore()?.removeItem(name);
  },
};
