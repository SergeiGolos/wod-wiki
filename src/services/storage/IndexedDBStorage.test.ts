import { describe, expect, it, beforeEach, afterEach } from 'bun:test';

import { IndexedDBStorage } from './IndexedDBStorage';

/**
 * These tests rely on fake-indexeddb being loaded by tests/unit-setup.ts.
 * That gives the IndexedDBStorage a real (in-memory) backing engine so we
 * can assert that the adapter actually round-trips data — not just that
 * it returns the right object shape. The seam is the IStorage interface;
 * this test exercises one of its adapters end-to-end.
 */
describe('IndexedDBStorage', () => {
    let storage: IndexedDBStorage;

    beforeEach(async () => {
        storage = new IndexedDBStorage(`wodwiki-test-${Math.random().toString(36).slice(2)}`);
        await storage.open();
    });

    afterEach(async () => {
        await storage.close();
    });

    it('round-trips a put/get on the segments store (compound key)', async () => {
        const segment = {
            id: 's1',
            version: 1,
            noteId: 'n1',
            dataType: 'wod' as const,
            data: null,
            rawContent: '',
            createdAt: 1,
        };
        await storage.readwrite('segments').put(segment);
        const got = await storage.readonly('segments').get(['s1', 1]);
        expect(got).toEqual(segment);
    });

    it('round-trips a put/get on the efforts store', async () => {
        const effort = {
            id: 'eff-1',
            slug: 'thruster',
            label: 'Thruster',
            aliases: ['thruster'],
            baseAttributes: { met: 8, discipline: 'strength' },
            registrySource: 'user',
        };
        await storage.readwrite('efforts').put(effort);
        const got = await storage.readonly('efforts').get('thruster');
        expect(got).toEqual(effort);
    });

    it('round-trips a put/get on the notes store with all indexed fields', async () => {
        const note = {
            id: 'n1',
            title: 'Fran',
            rawContent: '21-15-9',
            tags: ['crossfit'],
            createdAt: 1,
            updatedAt: 2,
            targetDate: 3,
            segmentIds: ['s1'],
        };
        await storage.readwrite('notes').put(note);
        const got = await storage.readonly('notes').get('n1');
        expect(got).toEqual(note);
    });

    it('a fresh storage instance throws if used before open()', () => {
        const fresh = new IndexedDBStorage('test-fresh');
        expect(() => fresh.readonly('segments')).toThrow(/open\(\) must be awaited/);
    });

    it('after close(), the cached handle is gone', async () => {
        await storage.close();
        expect(() => storage.readonly('segments')).toThrow(/open\(\) must be awaited/);
    });
});
