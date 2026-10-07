/**
 * mutateNote atomicity regressions — run against BOTH real backends
 * (fake-indexeddb for true IDB transaction lifetime, InMemoryStorage):
 *  - success path commits content edit, wellness reconcile, session save and
 *    event/detail/summary projection with exact stored values;
 *  - an events-store failure (the real fault a QuotaExceededError hits)
 *    rejects and rolls back EVERY source write — note row, segments, session
 *    row, wellness rows and attachments — verified against post-failure
 *    store contents, not just the rejection. The failure is injected at the
 *    IStorage readwrite('events') seam INSIDE the transaction adapter, so the
 *    scoped service hits it on both the direct and transaction paths;
 *  - lazy note creation for result writes is inside the same scope, so a
 *    failed recording leaves no stub note behind;
 *  - slug-resolved mutations land on the existing note (no duplicates);
 *  - attachment data resolves before the transaction opens.
 */
import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { IDBFactory } from 'fake-indexeddb';

import type { Note, Session } from '@/types/storage';
import type { IReadWriteStore, IStorage, IStorageTransaction, StoreName, StoreType } from '@bitcobblers/wod-wiki-storage';
import type { NoteMutation } from './types';
import { IndexedDBNotePersistence } from './IndexedDBNotePersistence';
import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider';
import { InMemoryStorage, StorageService } from '@/services/storage';
import { IndexedDBStorage } from '@/services/storage/IndexedDBStorage';

const T0 = Date.UTC(2026, 5, 1, 12, 0, 0);

type BackendKind = 'in-memory' | 'indexeddb';
const BACKENDS: BackendKind[] = ['in-memory', 'indexeddb'];

function makePersistence(service: StorageService) {
  return new IndexedDBNotePersistence(service, new IndexedDBContentProvider(service));
}

/** events-store read/write adapter whose `put` always rejects. */
function failingEventsPut<K extends StoreName>(rw: IReadWriteStore<StoreType<K>>): IReadWriteStore<StoreType<K>> {
  return {
    get: key => rw.get(key),
    getAll: (query, count) => rw.getAll(query, count),
    getAllFromIndex: (index, query, count) => rw.getAllFromIndex(index, query, count),
    count: query => rw.count(query),
    put: async () => {
      throw new Error('event store write failed');
    },
    delete: key => rw.delete(key),
    clear: () => rw.clear(),
  };
}

function wrapTx(tx: IStorageTransaction): IStorageTransaction {
  return {
    readonly: store => tx.readonly(store),
    readwrite: store => (store === 'events'
      ? failingEventsPut(tx.readwrite(store))
      : tx.readwrite(store)),
  };
}

/** IStorage decorator: every write to the events store rejects — including
 *  writes issued through transaction-scoped adapters. */
function failingEventsStorage(inner: IStorage): IStorage {
  return {
    readonly: store => inner.readonly(store),
    readwrite: store => (store === 'events'
      ? failingEventsPut(inner.readwrite(store))
      : inner.readwrite(store)),
    transaction: (stores, mode, fn) => inner.transaction(stores, mode, tx => fn(wrapTx(tx))),
    wipe: () => inner.wipe(),
    close: () => inner.close(),
  };
}

/** Fresh backend per case; always closed so the IDB handle never leaks. */
async function withBackend<R>(kind: BackendKind, fn: (inner: IStorage) => Promise<R>): Promise<R> {
  const inner: IStorage = kind === 'in-memory' ? new InMemoryStorage() : new IndexedDBStorage();
  try {
    return await fn(inner);
  } finally {
    await inner.close();
  }
}

const WORKOUT_LOGS = [
  {
    id: 1, outputType: 'segment', timeSpan: { started: 0, ended: 60_000 },
    metrics: [{ type: 'rep', value: 90, origin: 'runtime' }],
    sourceBlockKey: 'block-1', stackLevel: 0,
  },
  {
    id: 2, outputType: 'analytics', timeSpan: { started: 60_000, ended: 60_000 },
    metrics: [
      { type: 'label', value: 'Total Reps', image: 'Total Reps', origin: 'analyzed' },
      { type: 'rep', value: 90, unit: 'reps', origin: 'analyzed' },
    ],
    sourceBlockKey: 'analytics-summary', stackLevel: 0,
  },
];

const RAW_WITH_WELLNESS = [
  '# Fran',
  '',
  '```time',
  '21-15-9',
  'Thrusters 95lb',
  'Pull-ups',
  '```',
  '',
  '```wellness',
  'soreness: 3',
  'sleep: 7.5h',
  '```',
  '',
].join('\n');

async function seedNote(service: StorageService, id = 'note-fran'): Promise<Note> {
  const note: Note = { id, title: 'Fran Seed', createdAt: T0, date: T0, type: 'journal' };
  await service.saveNote(note);
  return note;
}

function workoutMutation(overrides: Partial<NonNullable<NoteMutation['workoutResult']>> = {}) {
  return {
    workoutResult: {
      id: 'result-1',
      blockId: 'sec-wod',
      blockContentId: 'bc-fran',
      segmentId: 'sec-wod',
      origin: 'journal' as const,
      data: {
        startTime: 0, endTime: 60_000, duration: 60_000, completed: true,
        logs: WORKOUT_LOGS,
      } as never,
      createdAt: 60_000,
      ...overrides,
    },
  };
}

const originalIndexedDB = globalThis.indexedDB;

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

afterEach(async () => {
  globalThis.indexedDB = originalIndexedDB;
});

describe('IndexedDBNotePersistence.mutateNote atomicity (real backends)', () => {
  for (const kind of BACKENDS) {
    it(`commits content, wellness, session, events and attachments with exact values (${kind})`, async () => {
      await withBackend(kind, async inner => {
        const service = new StorageService(inner);
        const persistence = makePersistence(service);
        const note = await seedNote(service);

        const entry = await persistence.mutateNote(note.id, {
          rawContent: RAW_WITH_WELLNESS,
          metadata: { title: 'Fran Edited', targetDate: T0 },
          ...workoutMutation(),
          attachments: {
            add: [{ id: 'att-gps', label: 'GPS', mimeType: 'application/gpx+xml', data: '<gpx />', timeSpan: { start: 5, end: 10 } }],
          },
        });

        expect(entry.targetDate).toBe(T0);

        // Content edit committed as live segments.
        const segments = await service.getLatestSegmentsForNote(note.id);
        expect(segments.some(s => s.dataType === 'wod' && s.rawContent.includes('Thrusters 95lb'))).toBe(true);

        // Session row committed with the mutation identity.
        const session: Session | undefined = await service.getSessionById('result-1');
        expect(session).toMatchObject({
          id: 'result-1',
          noteId: note.id,
          blockContentId: 'bc-fran',
          origin: 'journal',
          status: 'completed',
          completed: true,
          duration: 60_000,
        });

        // Event + summary projection committed with block identity. Summary
        // rows are FOLDED: the label becomes the projection name, the metric
        // carries the canonical key — here `totalReps` (no fieldRef).
        const events = await service.getEventsByResult('result-1');
        expect(events.some(r => r.grain === 'event')).toBe(true);
        const summaryRows = events.filter(r => r.grain === 'summary');
        const totalReps = summaryRows.find(r => r.metrics[0]?.type === 'totalReps');
        expect(totalReps?.metrics[0]).toMatchObject({ value: 90, unit: 'reps' });
        for (const row of events) {
          expect(row.blockContentId).toBe('bc-fran');
          expect(row.noteId).toBe(note.id);
        }

        // Wellness rows are keyed `wellness:<noteId>:<key>` with resultId
        // `wellness:<noteId>` — read them note-scoped, anchored to the
        // note's targetDate day.
        const noteEvents = await service.getEventsForNote(note.id);
        const wellness = noteEvents.filter(r => r.id.startsWith(`wellness:${note.id}:`));
        expect(wellness.map(r => r.id).sort()).toEqual([
          `wellness:${note.id}:sleep`,
          `wellness:${note.id}:soreness`,
        ]);
        const soreness = wellness.find(r => r.id === `wellness:${note.id}:soreness`)!;
        const day = new Date(T0);
        expect(soreness.timestamp).toBe(new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime());
        expect(soreness.metrics[0]).toMatchObject({ type: 'soreness', value: 3 });

        // Attachment committed with the descriptor identity (data resolved
        // before the transaction opened).
        const attachments = await service.getAttachmentsForNote(note.id);
        expect(attachments).toHaveLength(1);
        expect(attachments[0]).toMatchObject({ id: 'att-gps', resultId: 'result-1', timeSpan: { start: 5, end: 10 } });
      });
    });

    it(`threads the pinned segment incarnation version into event rows (${kind})`, async () => {
      await withBackend(kind, async inner => {
        const service = new StorageService(inner);
        const persistence = makePersistence(service);
        const note = await seedNote(service);
        await service.saveSegment({
          id: `${note.id}:sec-wod`,
          version: 7,
          noteId: note.id,
          position: 0,
          dataType: 'wod',
          data: null,
          rawContent: '21-15-9',
          createdAt: T0,
          updatedAt: T0,
          isHistory: false,
        });

        await persistence.mutateNote(note.id, workoutMutation());

        for (const row of await service.getEventsByResult('result-1')) {
          expect(row.segmentId).toBe(`${note.id}:sec-wod`);
          expect(row.segmentVersion).toBe(7);
        }
      });
    });

    it(`lazily creates a missing note for result writes and records onto it (${kind})`, async () => {
      await withBackend(kind, async inner => {
        const service = new StorageService(inner);
        const persistence = makePersistence(service);

        await persistence.mutateNote('canvas:home', workoutMutation({ id: 'result-canvas' }));

        const notes = await service.getAllNotes();
        expect(notes.map(n => n.id)).toEqual(['canvas:home']);
        const session = await service.getSessionById('result-canvas');
        expect(session?.noteId).toBe('canvas:home');
      });
    });

    it(`resolves journal route slugs to the existing note, no duplicate (${kind})`, async () => {
      await withBackend(kind, async inner => {
        const service = new StorageService(inner);
        const persistence = makePersistence(service);
        await persistence.createNote({
          id: 'uuid-journal-1',
          title: '2026-06-01',
          rawContent: '# Day',
          targetDate: T0,
          journalDate: '2026-06-01',
          slug: 'journal/2026-06-01',
        });

        await persistence.mutateNote('journal/2026-06-01', workoutMutation({ id: 'result-j1' }));

        const notes = await service.getAllNotes();
        expect(notes.map(n => n.id)).toEqual(['uuid-journal-1']);
        expect((await service.getSessionById('result-j1'))?.noteId).toBe('uuid-journal-1');
      });
    });

    it(`rolls back note, segments, session, events and attachments on event failure (${kind})`, async () => {
      await withBackend(kind, async inner => {
        const failing = new StorageService(failingEventsStorage(inner));
        const verify = new StorageService(inner);
        const persistence = makePersistence(failing);
        const note = await seedNote(failing);
        // structuredClone: updateEntry mutates the fetched row object in place
        // before saving, so raw references here would alias the mutation.
        const beforeNotes = structuredClone(await verify.getAllNotes());
        const beforeSegments = structuredClone(await verify.getAllSegments());

        await expect(persistence.mutateNote(note.id, {
          rawContent: RAW_WITH_WELLNESS,
          metadata: { title: 'Fran Edited' },
          ...workoutMutation(),
          attachments: {
            add: [{ id: 'att-gps', label: 'GPS', mimeType: 'application/gpx+xml', data: '<gpx />', timeSpan: { start: 5, end: 10 } }],
          },
        })).rejects.toThrow('event store write failed');

        // Post-failure store contents — not just the rejection.
        const notes = await verify.getAllNotes();
        expect(notes).toHaveLength(1);
        expect(notes[0]!.title).toBe('Fran Seed'); // metadata edit rolled back
        expect(await verify.getAllSegments()).toEqual(beforeSegments); // no segment writes
        expect(await verify.getSessionsForNote(note.id)).toEqual([]); // session row rolled back
        expect(await verify.scanAll()).toEqual([]); // no event/wellness rows
        expect(await verify.getAttachmentsForNote(note.id)).toEqual([]); // attachment rolled back
        expect(notes).toEqual(beforeNotes);
      });
    });

    it(`rolls back content and wellness writes when wellness reconcile fails (${kind})`, async () => {
      await withBackend(kind, async inner => {
        const failing = new StorageService(failingEventsStorage(inner));
        const verify = new StorageService(inner);
        const persistence = makePersistence(failing);
        const note = await seedNote(failing);
        // structuredClone: the pre-tx capture must not alias rows that
        // updateEntry mutates in place before saving.
        const beforeSegments = structuredClone(await verify.getAllSegments());

        // No workoutResult — the wellness reconcile is the only events writer.
        await expect(persistence.mutateNote(note.id, {
          rawContent: RAW_WITH_WELLNESS,
          metadata: { title: 'Fran Edited' },
        })).rejects.toThrow('event store write failed');

        expect((await verify.getAllNotes())[0]!.title).toBe('Fran Seed');
        expect(await verify.getAllSegments()).toEqual(beforeSegments);
        expect(await verify.scanAll()).toEqual([]);
      });
    });

    it(`rolls back the lazily created note when recording fails (${kind})`, async () => {
      await withBackend(kind, async inner => {
        const failing = new StorageService(failingEventsStorage(inner));
        const verify = new StorageService(inner);
        const persistence = makePersistence(failing);

        await expect(persistence.mutateNote('canvas:home', workoutMutation()))
          .rejects.toThrow('event store write failed');

        expect(await verify.getAllNotes()).toEqual([]);
        expect(await verify.scanAll()).toEqual([]);
      });
    });
  }

  it('still throws NOTE_NOT_FOUND for content mutations on missing notes (no tx opened)', async () => {
    const persistence = makePersistence(new StorageService(new InMemoryStorage()));
    await expect(persistence.mutateNote('ghost', { rawContent: '# hi' }))
      .rejects.toMatchObject({ code: 'NOTE_NOT_FOUND' });
  });
});
