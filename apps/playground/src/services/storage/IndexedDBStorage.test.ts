import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
// Auto shim installs the IDB* globals the `idb` wrapper needs even when this
// file runs standalone (bun test co-loads otherwise).
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import { IndexedDBStorage } from './IndexedDBStorage';

const DB_NAME = 'wodwiki-db';

function openLegacyDb(version: number, stores: string[]): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  const req = indexedDB.open(DB_NAME, version);
  req.onupgradeneeded = () => {
    const db = req.result;
    for (const name of stores) {
      db.createObjectStore(name, { keyPath: 'id' });
    }
  };
  req.onsuccess = () => {
    req.result.close();
    resolve();
  };
  req.onerror = () => reject(req.error);
  return promise;
}

describe('IndexedDBStorage schema upgrades', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'indexedDB');
  });

  it('creates block_index + block_efforts when opening a pre-V24 database', async () => {
    // Simulate a real browser DB from before block_efforts was added: version
    // 23 with block_index but no block_efforts. Commit 1b0442ed added the
    // store without bumping DB_VERSION, so such DBs never re-ran upgrade and
    // every transaction naming block_efforts threw NotFoundError.
    await openLegacyDb(23, ['notes', 'block_index']);

    const storage = new IndexedDBStorage();
    await expect(
      storage.transaction(['block_index', 'block_efforts'], 'readwrite', async () => undefined),
    ).resolves.toBeUndefined();
    await storage.close();
  });

  it('V25 adds the memberships store and by-user indexes on user-owned stores', async () => {
    // Legacy V24 DB: sessions exists without the by-user index.
    await openLegacyDb(24, ['sessions']);

    const storage = new IndexedDBStorage();
    // memberships is usable (store created)…
    const membership = { id: 'default', displayName: 'Me', createdAt: 1 };
    await storage.readwrite('memberships').put(membership);
    await expect(storage.readonly('memberships').get('default')).resolves.toEqual(membership);
    // …and the existing user-owned store gained the index (fresh stores get it too).
    await expect(
      storage.readonly('sessions').getAllFromIndex('by-user', 'user-9'),
    ).resolves.toEqual([]);
    await storage.close();
  });
});
