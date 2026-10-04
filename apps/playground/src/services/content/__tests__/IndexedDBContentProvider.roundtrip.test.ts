import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDBStorage } from '../../storage/IndexedDBStorage';
import { StorageService } from '../../storage/StorageService';
import { IndexedDBContentProvider } from '../IndexedDBContentProvider';

const originalIndexedDB = globalThis.indexedDB;
let storage: IndexedDBStorage;
let service: StorageService;
let provider: IndexedDBContentProvider;

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  storage = new IndexedDBStorage();
  service = new StorageService(storage);
  provider = new IndexedDBContentProvider(service);
});

afterEach(async () => {
  await storage.close();
  globalThis.indexedDB = originalIndexedDB;
});

async function reloadAndRead(id: string, expected: string) {
  await storage.close();
  storage = new IndexedDBStorage();
  service = new StorageService(storage);
  provider = new IndexedDBContentProvider(service);
  const writes = spyOn(storage, 'readwrite');
  const transactions = spyOn(storage, 'transaction');
  try {
    expect((await provider.getEntry(id))?.rawContent).toBe(expected);
    expect((await provider.getEntries()).find(entry => entry.id === id)?.rawContent).toBe(expected);
    expect(writes).not.toHaveBeenCalled();
    expect(transactions.mock.calls.every(call => call[1] === 'readonly')).toBe(true);
  } finally {
    writes.mockRestore();
    transactions.mockRestore();
  }
}

describe('IndexedDBContentProvider saved source', () => {
  it('overwrites a recovered identity without retaining removed sections or adding identical revisions', async () => {
    const entry = await provider.saveEntry({
      title: 'Recovered', rawContent: 'Original\n\n```time\n10 Pushups\n```\n',
      tags: [], targetDate: 1, type: 'note',
    });
    const replacement = { ...entry, rawContent: 'Replacement  \r\n\r\n' };
    expect((await provider.saveEntry(replacement)).rawContent).toBe(replacement.rawContent);
    await reloadAndRead(entry.id, replacement.rawContent);
    const beforeIdentical = await service.getAllSegments();
    await provider.saveEntry(replacement);
    expect(await service.getAllSegments()).toEqual(beforeIdentical);
    await reloadAndRead(entry.id, replacement.rawContent);
  });

  it('preserves empty bodies, whitespace and missing final line separators', async () => {
    const entry = await provider.saveEntry({
      title: 'Empty', rawContent: '', tags: ['manual'], targetDate: 1, type: 'note',
    });
    await reloadAndRead(entry.id, '');
    for (const rawContent of [' \t\r\n\r\n', '```TIME extra  \r\n10 Pushups  \r\n```  ', '']) {
      await provider.updateEntry(entry.id, { rawContent });
      await reloadAndRead(entry.id, rawContent);
    }
  });

  it('preserves exact fenced bytes and order through edits and fresh database reads', async () => {
    const prefix = '---\r\ntitle: "Original"  \r\n---\r\n';
    const tail = '\r\n \t\r\n\r\n```TiMe:CrossFit extra-info  \r\n(3 rounds)\r\n  10 Pushups  \r\n```  \r\n\r\nFinal paragraph  \r\n';
    const original = prefix + 'Heading  \r\nFirst line\r\nsecond line' + tail;
    const entry = await provider.saveEntry({
      title: 'Original', rawContent: original, tags: ['manual'], targetDate: 1, type: 'note',
    });
    expect(entry.rawContent).toBe(original);
    await reloadAndRead(entry.id, original);
    const workout = (await service.getLatestSegmentsForNote(entry.id)).find(segment => segment.dataType === 'wod');
    expect(workout?.rawContent).toBe('(3 rounds)\r\n  10 Pushups  \r');
    expect(workout?.sourceContent).toBe('```TiMe:CrossFit extra-info  \r\n(3 rounds)\r\n  10 Pushups  \r\n```  \r\n');

    const split = prefix + 'Heading  \r\nFirst line\r\n' + tail;
    expect((await provider.updateEntry(entry.id, { rawContent: split })).rawContent).toBe(split);
    const splitWorkout = (await service.getLatestSegmentsForNote(entry.id)).find(segment => segment.id === workout?.id);
    expect(splitWorkout?.position).toBe((workout?.position ?? 0) + 1);
    expect(splitWorkout?.version).toBe(workout?.version);
    expect(splitWorkout?.createdAt).toBe(workout?.createdAt);
    await reloadAndRead(entry.id, split);

    for (const edited of [prefix + '\r\nInserted content\r\n\r\nHeading  \r\nFirst line\r\n' + tail, original, split]) {
      await provider.updateEntry(entry.id, { rawContent: edited });
      await reloadAndRead(entry.id, edited);
      const live = await service.getLatestSegmentsForNote(entry.id);
      expect(live.map(segment => segment.position)).toEqual(live.map((_, index) => index));
    }

    const beforeIdentical = await service.getAllSegments();
    await provider.updateEntry(entry.id, { rawContent: split });
    expect(await service.getAllSegments()).toEqual(beforeIdentical);
    await reloadAndRead(entry.id, split);

    const respelled = split.replace('```TiMe:CrossFit extra-info  ', '```time:crossfit other-info\t');
    await provider.updateEntry(entry.id, { rawContent: respelled });
    const respelledWorkout = (await service.getLatestSegmentsForNote(entry.id)).find(segment => segment.id === workout?.id);
    expect(respelledWorkout?.version).toBe((workout?.version ?? 0) + 1);
    expect((await service.getAllSegments()).find(segment => segment.id === workout?.id && segment.version === workout?.version)?.sourceContent).toBe(workout?.sourceContent);
    await reloadAndRead(entry.id, respelled);
  });

  it('reconstructs legacy fragments without writing back and upgrades them on save', async () => {
    await service.saveNote({ id: 'legacy', title: 'Legacy', createdAt: 1 });
    await service.saveSegment({
      id: 'legacy-script', noteId: 'legacy', version: 3, position: 0, dataType: 'wod',
      data: null, rawContent: '10 Pushups', createdAt: 1, isHistory: false,
    });
    await service.setNoteTags('legacy', ['manual']);
    await reloadAndRead('legacy', '---\ntags:\n  - manual\n---\n```time\n10 Pushups\n```');
    const exact = '```TIME custom  \n10 Pushups\n```\n \t\n\n';
    await provider.updateEntry('legacy', { rawContent: exact });
    await reloadAndRead('legacy', exact);
  });

  it('reuses date pages, moves memberships without touching siblings, and clones independently', async () => {
    const day1 = new Date(2026, 9, 15).getTime(); // 2026-10-15 local
    const day2 = new Date(2026, 9, 16).getTime(); // 2026-10-16 local

    // Two distinct notes on one date share a single calendar Page; saveEntry
    // returns the supplied targetDate (not the creation timestamp).
    const a = await provider.saveEntry({ title: 'A', rawContent: '# A\n', tags: [], targetDate: day1, journalDate: '2026-10-15', type: 'journal' });
    const b = await provider.saveEntry({ title: 'B', rawContent: '# B\n', tags: [], targetDate: day1, journalDate: '2026-10-15', type: 'journal' });
    expect(a.id).not.toBe(b.id);
    expect(a.targetDate).toBe(day1);
    const page1 = await service.getPageByDate('2026-10-15');
    expect((await service.getPageNotes(page1!.id)).map(link => link.noteId).sort()).toEqual([a.id, b.id].sort());
    expect(await provider.getEntry(a.id)).toMatchObject({ targetDate: day1, journalDate: '2026-10-15' });

    // Moving A to another date: returned + fresh-read date is current, identity
    // and content survive, B's membership on the old page is untouched.
    const moved = await provider.updateEntry(a.id, { journalDate: '2026-10-16' });
    expect(moved.id).toBe(a.id);
    expect(moved.journalDate).toBe('2026-10-16');
    expect(moved.rawContent).toBe('# A\n');
    expect(await provider.getEntry(a.id)).toMatchObject({ journalDate: '2026-10-16', targetDate: day1 });
    expect((await service.getPageNotes(page1!.id)).map(link => link.noteId)).toEqual([b.id]);
    expect(await provider.getEntry(b.id)).toMatchObject({ journalDate: '2026-10-15' });

    // Shared named page: A joins B on 'gym', then moves on to 'travel' — the
    // 'gym' page keeps its slug and B; journalDate and slug stay independent.
    await provider.updateEntry(b.id, { slug: 'gym' });
    await provider.updateEntry(a.id, { slug: 'gym' });
    const gym = await service.getPageBySlug('gym');
    expect((await service.getPageNotes(gym!.id)).map(link => link.noteId).sort()).toEqual([a.id, b.id].sort());
    const movedSlug = await provider.updateEntry(a.id, { slug: 'travel' });
    expect(movedSlug.slug).toBe('travel');
    expect(movedSlug.journalDate).toBe('2026-10-16');
    const gymAfter = await service.getPageBySlug('gym');
    expect(gymAfter?.id).toBe(gym!.id);
    expect(gymAfter?.slug).toBe('gym');
    expect((await service.getPageNotes(gym!.id)).map(link => link.noteId)).toEqual([b.id]);
    expect(await provider.getEntry(a.id)).toMatchObject({ slug: 'travel', journalDate: '2026-10-16' });

    // Cloning B to another date: independent note (own id/content), journal
    // type, lineage via sourceId, chosen targetDate and its local date page.
    const clone = await provider.cloneEntry(b.id, day2);
    expect(clone.id).not.toBe(b.id);
    expect(clone.type).toBe('journal');
    expect(clone.sourceId).toBe(b.id);
    expect(clone.targetDate).toBe(day2);
    expect(clone.journalDate).toBe('2026-10-16');
    expect(clone.rawContent).toBe('# B\n');
    await provider.updateEntry(clone.id, { rawContent: '# Clone\n' });
    expect((await provider.getEntry(b.id))?.rawContent).toBe('# B\n');
    const page2 = await service.getPageByDate('2026-10-16');
    expect((await service.getPageNotes(page2!.id)).map(link => link.noteId).sort()).toEqual([a.id, clone.id].sort());

    // Plain journalNotes-style create with IDENTICAL content (the same risk as
    // template/creation sources): both notes keep exclusive segment rows — the
    // later save must not overwrite the earlier note's content.
    const d = await provider.saveEntry({ title: 'D', rawContent: '# B\n', tags: [], targetDate: day1, journalDate: '2026-10-15', type: 'journal' });
    expect(d.rawContent).toBe('# B\n');
    expect((await provider.getEntry(b.id))?.rawContent).toBe('# B\n');
    await provider.updateEntry(d.id, { rawContent: '# D\n' });
    expect((await provider.getEntry(b.id))?.rawContent).toBe('# B\n');
    expect((await provider.getEntry(d.id))?.rawContent).toBe('# D\n');
  });
});
