/** user stamping: put() stamps user-owned rows with the injected identity;
 *  seed rows and non-user-owned stores pass through untouched. */
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

import type { Session } from '@/types/storage';
import { IndexedDBStorage } from './IndexedDBStorage';
import { InMemoryStorage } from './InMemoryStorage';

const getUserId = (): string => 'user-1';
const row = { id: 'n1', title: 'note' } as unknown as Session;
const seedRow = { id: 'n2', title: 'seed', seedOrigin: 'seed' } as unknown as Session;

describe('InMemoryStorage user stamping', () => {
  it('stamps user-owned rows on put and skips seed + non-user-owned rows', async () => {
    const storage = new InMemoryStorage({ getUserId });

    await storage.readwrite('sessions').put(row);
    expect(await storage.readonly('sessions').get('n1')).toEqual({ ...row, userId: 'user-1' });

    await storage.readwrite('sessions').put(seedRow);
    expect(await storage.readonly('sessions').get('n2')).toEqual(seedRow);

    const membership = { id: 'default', displayName: 'Me', createdAt: 1 };
    await storage.readwrite('memberships').put(membership);
    expect(await storage.readonly('memberships').get('default')).toEqual(membership);
  });

  it('is idempotent on re-put and inert without a getter', async () => {
    const storage = new InMemoryStorage({ getUserId });
    await storage.readwrite('sessions').put(row);
    await storage.readwrite('sessions').put(await storage.readonly('sessions').get('n1') as Session);
    expect(await storage.readonly('sessions').get('n1')).toEqual({ ...row, userId: 'user-1' });

    const unstamped = new InMemoryStorage();
    await unstamped.readwrite('sessions').put(row);
    expect(await unstamped.readonly('sessions').get('n1')).toEqual(row);
  });
});

describe('IndexedDBStorage user stamping', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  afterEach(() => {
    Reflect.deleteProperty(globalThis, 'indexedDB');
  });

  it('stamps through standalone and transaction read-write stores', async () => {
    const storage = new IndexedDBStorage({ getUserId });

    await storage.readwrite('sessions').put(row);
    await storage.transaction(['sessions'], 'readwrite', async (tx) => {
      await tx.readwrite('sessions').put(seedRow);
    });

    expect(await storage.readonly('sessions').get('n1')).toEqual({ ...row, userId: 'user-1' });
    expect(await storage.readonly('sessions').get('n2')).toEqual(seedRow);
    await storage.close();
  });

  it('queries stamped rows through the V25 by-user index', async () => {
    const storage = new IndexedDBStorage({ getUserId });
    await storage.readwrite('sessions').put(row);
    await storage.readwrite('sessions').put(seedRow);

    const owned = await storage.readonly('sessions').getAllFromIndex('by-user', 'user-1');
    expect(owned).toEqual([{ ...row, userId: 'user-1' }]);
    await storage.close();
  });
});
