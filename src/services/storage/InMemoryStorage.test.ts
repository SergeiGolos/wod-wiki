import { describe, expect, it, beforeEach } from 'bun:test';

import { InMemoryStorage } from './InMemoryStorage';

interface NoteRow {
    id: string;
    noteId: string;
    version: number;
}

interface EffortRow {
    slug: string;
    registrySource: string;
}

const NOTE: NoteRow = { id: 'a', noteId: 'note-1', version: 1 };
const EFFORT: EffortRow = { slug: 'thruster', registrySource: 'user' };

describe('InMemoryStorage', () => {
    let storage: InMemoryStorage;

    beforeEach(() => {
        storage = new InMemoryStorage();
    });

    it('round-trips a put/get keyed by id', async () => {
        await storage.readwrite('notes').put(NOTE);
        const got = await storage.readonly('notes').get(NOTE.id);
        expect(got).toEqual(NOTE);
    });

    it('round-trips a put/get keyed by slug (efforts store)', async () => {
        await storage.readwrite('efforts').put(EFFORT);
        const got = await storage.readonly('efforts').get(EFFORT.slug);
        expect(got).toEqual(EFFORT);
    });

    it('returns undefined for missing keys', async () => {
        const got = await storage.readonly('notes').get('does-not-exist');
        expect(got).toBeUndefined();
    });

    it('getAll returns every value in store order of insertion', async () => {
        const rw = storage.readwrite('notes');
        await rw.put({ id: 'x', noteId: 'n', version: 1 });
        await rw.put({ id: 'y', noteId: 'n', version: 1 });
        await rw.put({ id: 'z', noteId: 'n', version: 1 });
        const all = await storage.readonly('notes').getAll();
        expect(all.map((row) => (row as NoteRow).id)).toEqual(['x', 'y', 'z']);
    });

    it('getAllFromIndex filters by exact value', async () => {
        const rw = storage.readwrite('segments');
        await rw.put({ id: 's1', noteId: 'note-1', version: 1 });
        await rw.put({ id: 's2', noteId: 'note-2', version: 1 });
        const matches = await storage.readonly('segments').getAllFromIndex('noteId', 'note-1');
        expect(matches).toHaveLength(1);
        expect((matches[0] as NoteRow).id).toBe('s1');
    });

    it('getAllFromIndex with no query returns all rows', async () => {
        const rw = storage.readwrite('segments');
        await rw.put({ id: 's1', noteId: 'note-1', version: 1 });
        await rw.put({ id: 's2', noteId: 'note-2', version: 1 });
        const all = await storage.readonly('segments').getAllFromIndex('noteId');
        expect(all).toHaveLength(2);
    });

    it('delete removes a row', async () => {
        await storage.readwrite('notes').put(NOTE);
        await storage.readwrite('notes').delete(NOTE.id);
        const got = await storage.readonly('notes').get(NOTE.id);
        expect(got).toBeUndefined();
    });

    it('put throws when value has neither id nor slug', async () => {
        const bad = { noteId: 'n', version: 1 } as unknown as NoteRow;
        expect(() => storage.readwrite('notes').put(bad)).toThrow(/must have an "id" or "slug" field/);
    });

    it('a readwrite view and a readonly view share the same backing data', async () => {
        const rw = storage.readwrite('notes');
        const ro = storage.readonly('notes');
        await rw.put(NOTE);
        const got = await ro.get(NOTE.id);
        expect(got).toEqual(NOTE);
    });

    it('two readwrite views share the same backing data', async () => {
        const a = storage.readwrite('notes');
        const b = storage.readwrite('notes');
        await a.put(NOTE);
        const got = await b.get(NOTE.id);
        expect(got).toEqual(NOTE);
    });

    it('transaction view writes are visible to subsequent reads in the same transaction', async () => {
        const tx = storage.transaction(['notes', 'segments']);
        await tx.readwrite('notes').put(NOTE);
        const got = await tx.readonly('notes').get(NOTE.id);
        expect(got).toEqual(NOTE);
    });

    it('transaction view rejects stores not in scope', async () => {
        const tx = storage.transaction(['notes']);
        expect(() => tx.readonly('segments')).toThrow(/not in transaction/);
    });

    it('transaction rejects further operations after done()', async () => {
        const tx = storage.transaction(['notes']);
        await tx.done();
        expect(() => tx.readonly('notes')).toThrow(/done\(\) already called/);
    });

    it('close() empties every store', async () => {
        await storage.readwrite('notes').put(NOTE);
        await storage.close();
        const got = await storage.readonly('notes').get(NOTE.id);
        expect(got).toBeUndefined();
    });

    it('two InMemoryStorage instances do not share state', async () => {
        const a = new InMemoryStorage();
        const b = new InMemoryStorage();
        await a.readwrite('notes').put(NOTE);
        const got = await b.readonly('notes').get(NOTE.id);
        expect(got).toBeUndefined();
    });
});
