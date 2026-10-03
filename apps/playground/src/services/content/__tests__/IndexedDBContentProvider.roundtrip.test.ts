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
});
