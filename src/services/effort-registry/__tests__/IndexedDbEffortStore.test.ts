import { afterEach, describe, expect, it, mock } from 'bun:test';

import type { EffortRecord } from '../types';

const savedEfforts: EffortRecord[] = [];
const deletedSlugs: string[] = [];
const storedEfforts: EffortRecord[] = [];

mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService: {
    getAllEfforts: async () => [...storedEfforts],
    saveEffort: async (effort: EffortRecord) => {
      savedEfforts.push(effort);
      return effort.slug;
    },
    deleteEffort: async (slug: string) => {
      deletedSlugs.push(slug);
    },
  },
}));

const storeModule = import('../IndexedDbEffortStore');

const timestamp = '2026-05-20T00:00:00.000Z';
const bundledEffort: EffortRecord = {
  id: 'bundled-rowing',
  slug: 'rowing',
  label: 'Rowing',
  aliases: ['row'],
  discipline: 'rowing',
  modality: 'cardio',
  baseAttributes: { met: 7 },
  visibility: 'bundled',
  registrySource: 'bundled',
  createdAt: timestamp,
  updatedAt: timestamp,
};

afterEach(() => {
  savedEfforts.length = 0;
  deletedSlugs.length = 0;
  storedEfforts.length = 0;
});

describe('IndexedDbEffortStore', () => {
  it('returns the bundled seed catalog', async () => {
    const { IndexedDbEffortStore } = await storeModule;
    const store = new IndexedDbEffortStore(undefined as any, [bundledEffort]);

    await expect(store.loadBundled()).resolves.toEqual([bundledEffort]);
  });

  it('loads user efforts from IndexedDB storage', async () => {
    storedEfforts.push({
      ...bundledEffort,
      id: 'user-rowing',
      label: 'My Rowing',
      registrySource: 'user',
      visibility: 'private',
      slug: 'my-rowing',
    });

    const { IndexedDbEffortStore } = await storeModule;
    const store = new IndexedDbEffortStore(undefined as any, [bundledEffort]);

    const loaded = await store.loadUser();

    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.slug).toBe('my-rowing');
  });

  it('persists and removes user efforts through the storage adapter', async () => {
    const { IndexedDbEffortStore } = await storeModule;
    const store = new IndexedDbEffortStore(undefined as any, [bundledEffort]);
    const userEffort: EffortRecord = {
      ...bundledEffort,
      id: 'user-rowing',
      slug: 'my-rowing',
      label: 'My Rowing',
      registrySource: 'user',
      visibility: 'private',
    };

    await store.writeUser(userEffort);
    await store.removeUser('my-rowing');

    expect(savedEfforts).toEqual([userEffort]);
    expect(deletedSlugs).toEqual(['my-rowing']);
  });
});
