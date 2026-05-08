/**
 * ContentProviderNotePersistence — unit tests
 *
 * Tests the adapter that wraps IContentProvider for static/mock/demo
 * persistence contexts. This is the path exercised by StorybookWorkbench
 * (mode="static") and any non-IndexedDB provider.
 */
import { describe, expect, it } from 'bun:test';

import type { HistoryEntry } from '@/types/history';
import type { WorkoutResult } from '@/types/storage';
import { ContentProviderNotePersistence } from './ContentProviderNotePersistence';
import { NotePersistenceError } from './types';

// ── Shared test data ──────────────────────────────────────────────────────────

const BASE_ENTRY: HistoryEntry = {
  id: 'note-abc123',
  title: 'Annie',
  rawContent: '# Annie\n\n```wod\n50-40-30-20-10\nDouble Unders\nSit-ups\n```',
  tags: ['crossfit', 'benchmark'],
  createdAt: 1000,
  updatedAt: 2000,
  targetDate: 3000,
  schemaVersion: 1,
};

const WORKOUT_RESULT: WorkoutResult = {
  id: 'result-001',
  noteId: BASE_ENTRY.id,
  sectionId: 'wod-a',
  segmentId: 'wod-a',
  data: { startTime: 1000, endTime: 1430, duration: 430, metrics: [], logs: [], completed: true },
  completedAt: 1430,
};

const OLDER_RESULT: WorkoutResult = {
  id: 'result-000',
  noteId: BASE_ENTRY.id,
  sectionId: 'wod-a',
  segmentId: 'wod-a',
  data: { startTime: 500, endTime: 1000, duration: 500, metrics: [], logs: [], completed: true },
  completedAt: 1000,
};

// ── Mock provider builder ─────────────────────────────────────────────────────

function makeMockProvider(overrides: Partial<{
  entry: HistoryEntry | null;
  entries: HistoryEntry[];
  results: WorkoutResult[];
  canWrite: boolean;
}> = {}) {
  const entries = overrides.entries ?? (overrides.entry ? [overrides.entry] : [BASE_ENTRY]);
  const results = overrides.results ?? [OLDER_RESULT, WORKOUT_RESULT];
  const canWrite = overrides.canWrite ?? true;

  const savedAttachments: Array<{ noteId: string; attachment: unknown }> = [];
  const deletedAttachmentIds: string[] = [];
  const updateCalls: Array<{ id: string; patch: unknown }> = [];

  const provider = {
    mode: 'history' as const,
    capabilities: { canWrite, canFilter: true },
    getEntry: async (id: string) => {
      const e = entries.find(e => e.id === id);
      if (!e) return null;
      return { ...e, extendedResults: results.filter(r => r.noteId === id) };
    },
    getEntries: async () => entries,
    saveEntry: async (data: unknown) => ({ ...BASE_ENTRY, ...(data as object) } as HistoryEntry),
    updateEntry: async (id: string, patch: unknown) => {
      updateCalls.push({ id, patch });
      const entry = entries.find(e => e.id === id) ?? BASE_ENTRY;
      // Attach extendedResults so callers can verify result round-trip
      return {
        ...entry,
        ...(patch as object),
        extendedResults: results.filter(r => r.noteId === id),
      } as HistoryEntry;
    },
    cloneEntry: async (id: string) => ({ ...BASE_ENTRY, id: `clone-of-${id}` }),
    deleteEntry: async () => undefined,
    getAttachments: async (id: string) => {
      return entries.find(e => e.id === id)?.attachments ?? [];
    },
    saveAttachment: async (noteId: string, attachment: unknown) => {
      savedAttachments.push({ noteId, attachment });
      return { id: 'att-new', noteId, label: '', mimeType: '', data: new ArrayBuffer(0), createdAt: 0, timeSpan: { start: 0, end: 0 } };
    },
    deleteAttachment: async (id: string) => {
      deletedAttachmentIds.push(id);
    },
    searchExercises: async () => [],
    loadIndex: async () => {},
  };

  return { provider, savedAttachments, deletedAttachmentIds, updateCalls };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ContentProviderNotePersistence > getNote', () => {
  it('returns entry by id with default projection', async () => {
    const { provider } = makeMockProvider();
    const persistence = new ContentProviderNotePersistence(provider as any);

    const entry = await persistence.getNote(BASE_ENTRY.id);

    expect(entry.id).toBe(BASE_ENTRY.id);
    expect(entry.title).toBe('Annie');
    expect(entry.rawContent).toContain('Double Unders');
  });

  it('throws NOTE_NOT_FOUND for an unknown id', async () => {
    const { provider } = makeMockProvider({ entries: [] });
    const persistence = new ContentProviderNotePersistence(provider as any);

    await expect(persistence.getNote('does-not-exist')).rejects.toMatchObject({
      code: 'NOTE_NOT_FOUND',
    });
  });

  it('summary projection omits section results', async () => {
    const { provider } = makeMockProvider({
      entry: { ...BASE_ENTRY, extendedResults: [WORKOUT_RESULT] },
    });
    const persistence = new ContentProviderNotePersistence(provider as any);

    const entry = await persistence.getNote(BASE_ENTRY.id, { projection: 'summary' });

    expect(entry.results).toBeUndefined();
    expect(entry.extendedResults).toBeUndefined();
  });

  it('review projection resolves the latest result for the note', async () => {
    const { provider } = makeMockProvider({
      entry: {
        ...BASE_ENTRY,
        extendedResults: [OLDER_RESULT, WORKOUT_RESULT],
      },
    });
    const persistence = new ContentProviderNotePersistence(provider as any);

    const entry = await persistence.getNote(BASE_ENTRY.id, {
      projection: 'review',
      resultSelection: { mode: 'latest' },
    });

    // WORKOUT_RESULT.completedAt=1430 > OLDER_RESULT.completedAt=1000 → latest wins
    expect(entry.results?.duration).toBe(430);
  });

  it('review projection by result-id selects exact result', async () => {
    const { provider } = makeMockProvider({
      entry: {
        ...BASE_ENTRY,
        extendedResults: [OLDER_RESULT, WORKOUT_RESULT],
      },
    });
    const persistence = new ContentProviderNotePersistence(provider as any);

    const entry = await persistence.getNote(BASE_ENTRY.id, {
      projection: 'review',
      resultSelection: { mode: 'by-result-id', resultId: 'result-000' },
    });

    expect(entry.results?.duration).toBe(500);
  });

  it('throws RESULT_NOT_FOUND for unknown result id', async () => {
    const { provider } = makeMockProvider({
      entry: { ...BASE_ENTRY, extendedResults: [WORKOUT_RESULT] },
    });
    const persistence = new ContentProviderNotePersistence(provider as any);

    await expect(
      persistence.getNote(BASE_ENTRY.id, {
        projection: 'review',
        resultSelection: { mode: 'by-result-id', resultId: 'ghost-result' },
      })
    ).rejects.toMatchObject({ code: 'RESULT_NOT_FOUND' });
  });

  it('history-detail all-for-section returns results sorted newest first', async () => {
    const { provider } = makeMockProvider({
      entry: {
        ...BASE_ENTRY,
        extendedResults: [OLDER_RESULT, WORKOUT_RESULT],
      },
    });
    const persistence = new ContentProviderNotePersistence(provider as any);

    const entry = await persistence.getNote(BASE_ENTRY.id, {
      projection: 'history-detail',
      resultSelection: { mode: 'all-for-section', sectionId: 'wod-a' },
    });

    expect(entry.extendedResults?.map(r => r.id)).toEqual(['result-001', 'result-000']);
  });

  it('includes attachments when includeAttachments=true', async () => {
    const attachment = {
      id: 'att-1', noteId: BASE_ENTRY.id, label: 'Garmin',
      mimeType: 'application/fit', data: new ArrayBuffer(0),
      createdAt: 0, timeSpan: { start: 0, end: 60_000 },
    };
    const { provider } = makeMockProvider({
      entry: { ...BASE_ENTRY, attachments: [attachment] },
    });
    const persistence = new ContentProviderNotePersistence(provider as any);

    const entry = await persistence.getNote(BASE_ENTRY.id, { includeAttachments: true });

    expect(entry.attachments).toHaveLength(1);
    expect(entry.attachments![0].id).toBe('att-1');
  });

  it('omits attachments when includeAttachments is not set', async () => {
    const attachment = {
      id: 'att-1', noteId: BASE_ENTRY.id, label: 'Garmin',
      mimeType: 'application/fit', data: new ArrayBuffer(0),
      createdAt: 0, timeSpan: { start: 0, end: 60_000 },
    };
    const { provider } = makeMockProvider({
      entry: { ...BASE_ENTRY, attachments: [attachment] },
    });
    const persistence = new ContentProviderNotePersistence(provider as any);

    const entry = await persistence.getNote(BASE_ENTRY.id);

    expect(entry.attachments).toBeUndefined();
  });
});

describe('ContentProviderNotePersistence > listNotes', () => {
  it('returns all entries when called with no query', async () => {
    const second = { ...BASE_ENTRY, id: 'note-bbb', title: 'Fran' };
    const { provider } = makeMockProvider({ entries: [BASE_ENTRY, second] });
    const persistence = new ContentProviderNotePersistence(provider as any);

    const results = await persistence.listNotes();

    expect(results).toHaveLength(2);
    expect(results.map(e => e.title)).toContain('Fran');
  });

  it('filters by specific ids', async () => {
    const second = { ...BASE_ENTRY, id: 'note-bbb', title: 'Fran' };
    const { provider } = makeMockProvider({ entries: [BASE_ENTRY, second] });
    const persistence = new ContentProviderNotePersistence(provider as any);

    const results = await persistence.listNotes({ ids: ['note-abc123'] });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Annie');
  });

  it('applies search filter on title and content', async () => {
    const second = { ...BASE_ENTRY, id: 'note-bbb', title: 'Fran', rawContent: '# Fran' };
    const { provider } = makeMockProvider({ entries: [BASE_ENTRY, second] });
    const persistence = new ContentProviderNotePersistence(provider as any);

    const results = await persistence.listNotes({ search: 'Double Unders' });

    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Annie');
  });

  it('applies offset and limit pagination', async () => {
    const entries = Array.from({ length: 5 }, (_, i) => ({
      ...BASE_ENTRY, id: `note-${i}`, title: `Note ${i}`,
    }));
    const { provider } = makeMockProvider({ entries });
    const persistence = new ContentProviderNotePersistence(provider as any);

    const page = await persistence.listNotes({ offset: 2, limit: 2 });

    expect(page).toHaveLength(2);
    expect(page[0].id).toBe('note-2');
    expect(page[1].id).toBe('note-3');
  });
});

describe('ContentProviderNotePersistence > mutateNote', () => {
  it('updates raw content via updateEntry', async () => {
    const { provider, updateCalls } = makeMockProvider();
    const persistence = new ContentProviderNotePersistence(provider as any);

    await persistence.mutateNote(BASE_ENTRY.id, {
      rawContent: '# Annie\nUpdated content',
    });

    expect(updateCalls).toHaveLength(1);
    expect((updateCalls[0].patch as any).rawContent).toContain('Updated content');
  });

  it('appends a workout result and returns entry with extendedResults', async () => {
    const { provider } = makeMockProvider();
    const persistence = new ContentProviderNotePersistence(provider as any);

    const entry = await persistence.mutateNote(BASE_ENTRY.id, {
      workoutResult: {
        id: 'result-new',
        sectionId: 'wod-a',
        data: { startTime: 2000, endTime: 2350, duration: 350, metrics: [], logs: [], completed: true },
      },
    });

    // extendedResults should be populated from the note's result history
    expect(Array.isArray(entry.extendedResults)).toBe(true);
    expect(entry.extendedResults!.length).toBe(2);
  });

  it('throws NOTE_NOT_FOUND for an unknown locator', async () => {
    const { provider } = makeMockProvider({ entries: [] });
    const persistence = new ContentProviderNotePersistence(provider as any);

    await expect(
      persistence.mutateNote('ghost-note', { rawContent: 'x' })
    ).rejects.toMatchObject({ code: 'NOTE_NOT_FOUND' });
  });

  it('adds an attachment via the provider', async () => {
    const { provider, savedAttachments } = makeMockProvider();
    const persistence = new ContentProviderNotePersistence(provider as any);

    await persistence.mutateNote(BASE_ENTRY.id, {
      attachments: {
        add: [new File(['data'], 'run.gpx', { type: 'application/gpx+xml' })],
      },
    });

    expect(savedAttachments).toHaveLength(1);
    expect(savedAttachments[0].noteId).toBe(BASE_ENTRY.id);
  });

  it('removes an attachment via the provider', async () => {
    const { provider, deletedAttachmentIds } = makeMockProvider();
    const persistence = new ContentProviderNotePersistence(provider as any);

    await persistence.mutateNote(BASE_ENTRY.id, {
      attachments: { remove: ['att-old-1', 'att-old-2'] },
    });

    expect(deletedAttachmentIds).toEqual(['att-old-1', 'att-old-2']);
  });
});

describe('ContentProviderNotePersistence > deleteNote', () => {
  it('delegates to provider.deleteEntry', async () => {
    const deletedIds: string[] = [];
    const { provider } = makeMockProvider();
    (provider as any).deleteEntry = async (id: string) => { deletedIds.push(id); };
    const persistence = new ContentProviderNotePersistence(provider as any);

    await persistence.deleteNote(BASE_ENTRY.id);

    expect(deletedIds).toEqual([BASE_ENTRY.id]);
  });
});

describe('ContentProviderNotePersistence > createNotePersistence factory', () => {
  it('returns ContentProviderNotePersistence for a non-IndexedDB provider', async () => {
    // Mock IndexedDBService before importing the factory to avoid openDB at module eval
    const { mock } = await import('bun:test');
    mock.module('@/services/db/IndexedDBService', () => ({ indexedDBService: {} }));

    const { createNotePersistence } = await import('./index');
    const { StaticContentProvider } = await import('@/services/content/StaticContentProvider');

    const provider = new StaticContentProvider('# Test');
    const persistence = createNotePersistence(provider);

    expect(persistence).toBeInstanceOf(ContentProviderNotePersistence);
  });
});
