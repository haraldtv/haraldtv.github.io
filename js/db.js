/**
 * db.js — tiny promise wrapper around IndexedDB.
 *
 * Object stores
 *   players     keyPath "id"   — the central roster, reused across tournaments
 *   tournaments keyPath "id"   — one record per tournament, rounds embedded
 *   settings    keyPath "key"  — remembered defaults (last used config)
 */

const DB_NAME = 'padel-tournaments';
const DB_VERSION = 1;

let dbPromise = null;

export function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (!db.objectStoreNames.contains('players')) {
        const s = db.createObjectStore('players', { keyPath: 'id' });
        s.createIndex('name', 'name', { unique: false });
      }
      if (!db.objectStoreNames.contains('tournaments')) {
        const s = db.createObjectStore('tournaments', { keyPath: 'id' });
        s.createIndex('createdAt', 'createdAt', { unique: false });
        s.createIndex('status', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
      void event;
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Database upgrade blocked — close other tabs of this app.'));
  });
  return dbPromise;
}

function tx(storeName, mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(storeName, mode);
    const store = t.objectStore(storeName);
    let result;
    try {
      result = fn(store);
    } catch (err) {
      reject(err);
      return;
    }
    t.oncomplete = () => resolve(result && result.__req ? result.__req.result : result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Transaction aborted'));
  }));
}

const wrap = (req) => ({ __req: req });

export const get      = (store, key)   => tx(store, 'readonly',  (s) => wrap(s.get(key)));
export const getAll   = (store)        => tx(store, 'readonly',  (s) => wrap(s.getAll()));
export const put      = (store, value) => tx(store, 'readwrite', (s) => { s.put(value); return value; });
export const putMany  = (store, values) => tx(store, 'readwrite', (s) => { values.forEach((v) => s.put(v)); return values; });
export const remove   = (store, key)   => tx(store, 'readwrite', (s) => { s.delete(key); return key; });
export const clear    = (store)        => tx(store, 'readwrite', (s) => { s.clear(); return true; });

/** Crypto-strong-enough unique id, sortable-ish by creation time. */
export function uid(prefix = '') {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}${t}${r}`;
}
