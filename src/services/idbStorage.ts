const DB_NAME = 'omnidesk-store';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

export const DEFAULT_LOCAL_MIRROR_LIMIT_BYTES = 128 * 1024;

let dbPromise: Promise<IDBDatabase> | null = null;

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      dbPromise = null;
      reject(request.error || new Error('Failed to open IndexedDB store.'));
    };
  });

  return dbPromise;
}

export async function idbGet(key: string): Promise<string | null> {
  if (!isIndexedDbAvailable()) return null;
  try {
    const db = await openDatabase();
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(typeof req.result === 'string' ? req.result : null);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: string): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(key: string): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // ignore cleanup failures
  }
}

export async function idbKeys(): Promise<string[]> {
  if (!isIndexedDbAvailable()) return [];
  try {
    const db = await openDatabase();
    return await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAllKeys();
      req.onsuccess = () => {
        const keys = Array.isArray(req.result)
          ? req.result.filter((k): k is string => typeof k === 'string')
          : [];
        resolve(keys);
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function idbGetAll(): Promise<Record<string, string>> {
  const keys = await idbKeys();
  const entries: Record<string, string> = {};
  for (const key of keys) {
    const value = await idbGet(key);
    if (typeof value === 'string') {
      entries[key] = value;
    }
  }
  return entries;
}

export async function idbPurgeMatching(predicate: (key: string) => boolean): Promise<number> {
  const keys = await idbKeys();
  let removed = 0;
  for (const key of keys) {
    if (predicate(key)) {
      await idbDelete(key);
      removed += 1;
    }
  }
  return removed;
}

function getUtf8ByteSize(text: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text).byteLength;
  }
  return text.length * 2;
}

/**
 * Loads serialized tool data from IndexedDB first, automatically migrating any
 * pre-existing synchronous localStorage value into IndexedDB.
 */
export async function loadToolData(key: string): Promise<string | null> {
  const fromIdb = await idbGet(key);
  if (typeof fromIdb === 'string') {
    return fromIdb;
  }

  if (typeof localStorage !== 'undefined') {
    try {
      const fromLocal = localStorage.getItem(key);
      if (typeof fromLocal === 'string') {
        await idbSet(key, fromLocal).catch(() => {});
        return fromLocal;
      }
    } catch {
      // ignore localStorage read errors
    }
  }

  return null;
}

/**
 * Saves serialized tool data to IndexedDB without the ~5 MB localStorage ceiling.
 * Small payloads (<= maxLocalMirrorBytes) are mirrored in localStorage so synchronous
 * helpers (e.g. MCP reads) continue working seamlessly; larger payloads automatically
 * shed their localStorage copy instead of throwing QuotaExceededError.
 */
export async function saveToolData(
  key: string,
  serialized: string,
  maxLocalMirrorBytes = DEFAULT_LOCAL_MIRROR_LIMIT_BYTES
): Promise<void> {
  try {
    await idbSet(key, serialized);
  } catch {
    // Fallback to localStorage below if IndexedDB write fails
  }

  if (typeof localStorage !== 'undefined') {
    try {
      if (getUtf8ByteSize(serialized) <= maxLocalMirrorBytes) {
        localStorage.setItem(key, serialized);
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore quota errors completely once stored in IndexedDB
      }
    }
  }
}

export async function loadToolJson<T>(key: string): Promise<T | null> {
  const raw = await loadToolData(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveToolJson(
  key: string,
  value: unknown,
  maxLocalMirrorBytes = DEFAULT_LOCAL_MIRROR_LIMIT_BYTES
): Promise<void> {
  await saveToolData(key, JSON.stringify(value), maxLocalMirrorBytes);
}
