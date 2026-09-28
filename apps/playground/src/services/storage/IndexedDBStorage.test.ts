import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
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
});
