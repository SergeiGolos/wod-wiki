import { describe, expect, it, mock } from 'bun:test';

import type { HistoryEntry } from '@/types/history';
import type { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider';
import type { AnalyticsDataPoint, Note, NoteSegment, WorkoutResult } from '@/types/storage';

const indexedDBService = {};

mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService,
}));

const persistenceModule = import('./IndexedDBNotePersistence');

const note: Note = {
  id: '11111111-2222-4333-8444-555555555555',
  title: 'Fran',
  createdAt: 1,
};

const olderSectionResult: WorkoutResult = {
  id: 'older',
  noteId: note.id,
  blockContentId: 'wod-a',
  data: { startTime: 100, endTime: 200, duration: 100, logs: [], completed: true },
  createdAt: 200,
};

const latestSectionResult: WorkoutResult = {
  id: 'latest',
  noteId: note.id,
  blockContentId: 'wod-a',
  data: { startTime: 300, endTime: 450, duration: 150, logs: [], completed: true },
  createdAt: 450,
};
const otherResult: WorkoutResult = {
  id: 'other',
  noteId: note.id,
  blockContentId: 'wod-b',
  data: { startTime: 500, endTime: 700, duration: 200, logs: [], completed: true },
  createdAt: 700,
};

function createHarness(latestSegments: NoteSegment[] = []) {
  const results = [olderSectionResult, latestSectionResult, otherResult];
  const savedAnalyticsPoints: AnalyticsDataPoint[] = [];
  const savedNotes: Note[] = [];
  const savedAttachments: import('@/types/storage').Attachment[] = [];
  const storage = {
    getNote: async (id: string) => id === note.id ? note : undefined,
    saveNote: async (n: Note) => { savedNotes.push(n); return n.id; },
    getAllNotes: async () => [note],
    getLatestSegmentVersion: async (segmentId: string) =>
      latestSegments.find(segment => segment.id === segmentId),
    getResultsForNote: async (noteId: string) => results.filter(result => result.noteId === noteId),
    getResultsByContentId: async (blockContentId: string) => results.filter(result => result.blockContentId === blockContentId),
    saveResult: async (result: WorkoutResult) => result.id,
    getResultsForSection: async (_noteId: string, blockContentId: string) =>
      results.filter(result => result.blockContentId === blockContentId),
    getResultById: async (resultId: string) => results.find(result => result.id === resultId),
    getAttachmentsForNote: async () => [],
    saveAttachment: async (attachment: import('@/types/storage').Attachment) => {
      savedAttachments.push(attachment);
      return attachment.id;
    },
    deleteAttachment: async () => undefined,
    saveAnalyticsPoints: async (points: AnalyticsDataPoint[]) => {
      savedAnalyticsPoints.push(...points);
    },
  };
  const contentProvider = {
    getEntry: async (): Promise<HistoryEntry> => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.createdAt,
      targetDate: note.createdAt,
      rawContent: '',
      tags: [],
      schemaVersion: 1,
    }),
    getEntries: async () => [],
    updateEntry: async () => ({} as HistoryEntry),
    deleteEntry: async () => undefined,
  };

  return { storage, contentProvider, savedAnalyticsPoints, savedAttachments, savedNotes };
}

describe('IndexedDBNotePersistence', () => {
  it('normalizes Tier-2 summary outputs into summary fact rows', async () => {
    const { normalizeSummaryFacts } = await persistenceModule;

    const points = normalizeSummaryFacts([
      {
        outputType: 'analytics',
        timeSpan: { started: 123, ended: 123 },
        metrics: [
          { type: 'label', value: 'Total Reps', image: 'Total Reps' },
          { type: 'rep', value: 90, unit: 'reps', image: '90 reps' },
        ],
      },
      {
        // Non-analytics outputs are ignored — summary facts only.
        outputType: 'segment',
        timeSpan: { started: 100 },
        metrics: [{ type: 'rep', value: 21 }],
      },
      {
        outputType: 'analytics',
        timeSpan: { started: 124 },
        metrics: [
          { type: 'label', value: 'Total Volume', image: 'Total Volume' },
          { type: 'calculated', value: 5400, unit: 'kg', image: '5400 kg' },
        ],
      },
    ], { noteId: note.id, resultId: 'result-a' });

    expect(points).toHaveLength(2);
    expect(points.map(p => p.metricKey)).toEqual(['totalReps', 'totalVolume']);
    expect(points.every(p => p.grain === 'summary')).toBe(true);
    expect(points.every(p => p.noteId === note.id)).toBe(true);
    expect(points.every(p => p.resultId === 'result-a')).toBe(true);
    expect(points[0]).toMatchObject({ value: 90, unit: 'reps', label: 'Total Reps' });
  });

  it('persists summary facts with the block identity from workoutResult', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const latestSegment: NoteSegment = {
      id: 'wod-a',
      version: 7,
      noteId: note.id,
      dataType: 'wod',
      data: null,
      rawContent: '21-15-9',
      createdAt: 456,
    };
    const { storage, contentProvider, savedAnalyticsPoints } = createHarness([latestSegment]);
    const persistence = new IndexedDBNotePersistence(storage, contentProvider as any);

    await persistence.mutateNote(note.id, {
      workoutResult: {
        id: 'result-a',
        blockId: 'wod-a',
        blockContentId: 'bc-a',
        segmentId: 'wod-a',
        origin: 'playground',
        data: {
          startTime: 0, endTime: 1000, duration: 1000, completed: true,
          logs: [
            {
              id: 1, outputType: 'segment', timeSpan: { started: 0, ended: 1000 },
              metrics: [{ type: 'rep', value: 21, origin: 'runtime' }],
              sourceBlockKey: 'block-1', stackLevel: 0,
            },
            {
              id: 2, outputType: 'analytics', timeSpan: { started: 1000, ended: 1000 },
              metrics: [
                { type: 'label', value: 'Total Reps', image: 'Total Reps', origin: 'analyzed' },
                { type: 'rep', value: 45, unit: 'reps', origin: 'analyzed' },
              ],
              sourceBlockKey: 'analytics-summary', stackLevel: 0,
            },
          ],
        } as never,
        createdAt: 1000,
      },
    });

    // One summary fact (from the Tier-2 output), carrying the block's
    // segment identity (version 7 from the segments store) + recorder origin.
    expect(savedAnalyticsPoints).toHaveLength(1);
    expect(savedAnalyticsPoints[0]).toMatchObject({
      metricKey: 'totalReps',
      value: 45,
      grain: 'summary',
      segmentId: 'wod-a',
      segmentVersion: 7,
      origin: 'playground',
    });
  });

  it('preserves attachment descriptor ids and time spans', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const { storage, contentProvider, savedAttachments } = createHarness();
    const persistence = new IndexedDBNotePersistence(storage, contentProvider as any);

    await persistence.mutateNote(note.id, {
      attachments: {
        add: [{
          id: 'attachment-1',
          label: 'GPS',
          mimeType: 'application/gpx+xml',
          data: '<gpx />',
          timeSpan: { start: 10, end: 20 },
        }],
      },
    });

    expect(savedAttachments[0].id).toBe('attachment-1');
    expect(savedAttachments[0].timeSpan).toEqual({ start: 10, end: 20 });
  });

  it('selects an exact review result by result id', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const { storage, contentProvider } = createHarness();
    const persistence = new IndexedDBNotePersistence(storage, contentProvider as any);

    const entry = await persistence.getNote(note.id, {
      projection: 'review',
      resultSelection: { mode: 'by-result-id', resultId: 'older' },
    });

    expect(entry.results?.duration).toBe(100);
  });

  it('selects the newest result for a section', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const { storage, contentProvider } = createHarness();
    const persistence = new IndexedDBNotePersistence(storage, contentProvider as any);

    const entry = await persistence.getNote(note.id, {
      projection: 'review',
      resultSelection: { mode: 'latest-for-section', blockContentId: 'wod-a' },
    });

    expect(entry.results?.duration).toBe(150);
  });

  it('returns section history sorted newest first', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const { storage, contentProvider } = createHarness();
    const persistence = new IndexedDBNotePersistence(storage, contentProvider as any);

    const entry = await persistence.getNote(note.id, {
      projection: 'history-detail',
      resultSelection: { mode: 'all-for-section', blockContentId: 'wod-a' },
    });

    expect(entry.extendedResults?.map(result => result.id)).toEqual(['latest', 'older']);
  });

  it('hydrates selected notes for multi-select analysis', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const { storage, contentProvider } = createHarness();
    const persistence = new IndexedDBNotePersistence(storage, contentProvider as any);

    const entries = await persistence.listNotes({ ids: [note.id], projection: 'history-detail' });

    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(note.id);
  });

  it('listNotes({ids}) history-detail hydrates extendedResults (all-for-note)', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const { storage, contentProvider } = createHarness();
    const persistence = new IndexedDBNotePersistence(storage, contentProvider as any);

    const entries = await persistence.listNotes({ ids: [note.id], projection: 'history-detail' });

    expect(entries).toHaveLength(1);
    // Regression: the ids-branch dropped resultSelection, so history-detail
    // silently used the default 'latest' projection and returned NO
    // extendedResults — the inline results bar never hydrated on reload
    // (the canvas loads via listNotes({ids})).
    expect(entries[0].extendedResults).toBeDefined();
    expect(entries[0].extendedResults!.map(r => r.id)).toEqual(['other', 'latest', 'older']);
  });

  it('mutateNote lazily creates the note when recording a result onto a missing note', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const { storage, contentProvider, savedNotes } = createHarness();
    // Make the freshly-created note resolvable on the read-back getNote call.
    (storage as any).getNote = async (id: string) =>
      id === note.id ? note : savedNotes.find(n => n.id === id);
    const updated: { id: string; blockContentId?: string }[] = [];
    (contentProvider as any).updateEntry = async (id: string, patch: any) => {
      updated.push({ id, blockContentId: patch.blockContentId });
      return {} as HistoryEntry;
    };
    const persistence = new IndexedDBNotePersistence(storage, contentProvider as any);

    // 'canvas:home' has no note row — a static surface whose body is
    // file-backed. Recording a result must still succeed.
    await persistence.mutateNote('canvas:home', {
      workoutResult: {
        id: 'r1', blockId: 'wod-1-x', blockContentId: 'bc-x', version: 1,
        data: { startTime: 0, endTime: 1000, duration: 1000, completed: true } as any,
        createdAt: 1000,
      },
    });

    // A minimal note was created so the result has a home…
    expect(savedNotes).toHaveLength(1);
    expect(savedNotes[0].id).toBe('canvas:home');
    // …and the result write proceeded against it.
    expect(updated).toHaveLength(1);
    expect(updated[0]).toMatchObject({ id: 'canvas:home', blockContentId: 'bc-x' });
  });

  it('mutateNote still throws NOTE_NOT_FOUND for content mutations on a missing note', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const { storage, contentProvider } = createHarness();
    const persistence = new IndexedDBNotePersistence(storage, contentProvider as any);

    await expect(
      persistence.mutateNote('ghost-note', { rawContent: '# hi' }),
    ).rejects.toMatchObject({ code: 'NOTE_NOT_FOUND' });
  });

  it('mutateNote resolves a note by its slug (journal route) instead of creating a duplicate', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const { storage, contentProvider, savedNotes } = createHarness();
    // A real journal note: UUID id, slug = the route, body present.
    const journalNote: Note = { ...note, id: 'uuid-journal-1', slug: 'journal/2026-06-29', title: '2026-06-29' };
    (storage as any).getNote = async (id: string) => id === journalNote.id ? journalNote : undefined;
    (storage as any).getAllNotes = async () => [journalNote];
    const updated: { id: string }[] = [];
    (contentProvider as any).updateEntry = async (id: string) => { updated.push({ id }); return {} as HistoryEntry; };
    const persistence = new IndexedDBNotePersistence(storage, contentProvider as any);

    // The recorder addresses the note by its route slug, not its UUID.
    await persistence.mutateNote('journal/2026-06-29', {
      workoutResult: {
        id: 'r1', blockId: 'wod-1-x', blockContentId: 'bc-x', version: 1,
        data: { startTime: 0, endTime: 1000, duration: 1000, completed: true } as any,
        createdAt: 1000,
      },
    });

    // Resolved to the existing note by slug — no duplicate created, write went to the UUID.
    expect(savedNotes).toHaveLength(0);
    expect(updated[0]?.id).toBe('uuid-journal-1');
  });

  // V6 — by-content stamp
  // V6 — by-content stamp
  it('normalizeSummaryFacts stamps block identity on every fact row', async () => {
    const { normalizeSummaryFacts } = await persistenceModule;

    const points = normalizeSummaryFacts(
      [{
        outputType: 'analytics',
        timeSpan: { started: 42 },
        metrics: [
          { type: 'label', value: 'TIS', image: 'TIS' },
          { type: 'calculated', value: 72, unit: 'pts' },
        ],
      }],
      { noteId: note.id, resultId: 'result-x', segmentId: 'wod-x', segmentVersion: 3, blockContentId: 'bc-fran' },
    );

    expect(points).toHaveLength(1);
    for (const pt of points) {
      expect(pt.blockContentId).toBe('bc-fran');
      expect(pt.noteId).toBe(note.id);
      expect(pt.resultId).toBe('result-x');
      expect(pt.segmentId).toBe('wod-x');
      expect(pt.segmentVersion).toBe(3);
      expect(pt.metricKey).toBe('tis');
    }
  });

  it('mutateNote threads workoutResult identity into summary fact rows', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const { storage, contentProvider, savedAnalyticsPoints } = createHarness();
    // Partial harness double — satisfies the constructor's structural needs;
    // the full IndexedDBContentProvider surface isn't exercised here.
    const persistence = new IndexedDBNotePersistence(storage, contentProvider as unknown as IndexedDBContentProvider);

    await persistence.mutateNote(note.id, {
      workoutResult: {
        id: 'result-threading',
        blockId: 'wod-a',
        blockContentId: 'bc-threaded',
        version: 1,
        data: {
          startTime: 0, endTime: 1000, duration: 1000, completed: true,
          logs: [{
            id: 2, outputType: 'analytics', timeSpan: { started: 1000 },
            metrics: [
              { type: 'label', value: 'Total Distance', image: 'Total Distance', origin: 'analyzed' },
              { type: 'distance', value: 5000, unit: 'm', origin: 'analyzed' },
            ],
            sourceBlockKey: 'analytics-summary', stackLevel: 0,
          }],
        } as never,
        createdAt: 1000,
      },
    });

    expect(savedAnalyticsPoints.length).toBeGreaterThan(0);
    for (const pt of savedAnalyticsPoints) {
      expect(pt.blockContentId).toBe('bc-threaded');
      expect(pt.noteId).toBe(note.id);
    }
  });

  it('getSimilarWorkoutResults filters by note and origin, sorts newest first', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const { storage, contentProvider } = createHarness();
    const crossNote: WorkoutResult[] = [
      { id: 'x1', noteId: 'other-note', blockContentId: 'wod-a', origin: 'journal', data: { startTime: 1, endTime: 2, duration: 1, logs: [], completed: true }, createdAt: 500 },
      { id: 'x2', noteId: note.id, blockContentId: 'wod-a', origin: 'journal', data: { startTime: 1, endTime: 2, duration: 1, logs: [], completed: true }, createdAt: 900 },
      { id: 'x3', noteId: 'pg-note', blockContentId: 'wod-a', origin: 'playground', data: { startTime: 1, endTime: 2, duration: 1, logs: [], completed: true }, createdAt: 700 },
      { id: 'x4', noteId: 'other-note', blockContentId: 'wod-b', origin: 'journal', data: { startTime: 1, endTime: 2, duration: 1, logs: [], completed: true }, createdAt: 100 },
    ];
    const harnessStorage = {
      ...storage,
      getResultsByContentId: async (bcid: string) => crossNote.filter(r => r.blockContentId === bcid),
    };
    const persistence = new IndexedDBNotePersistence(harnessStorage, contentProvider as unknown as IndexedDBContentProvider);

    // Default: playground excluded, newest first, only matching content.
    const all = await persistence.getSimilarWorkoutResults('wod-a');
    expect(all.map(r => r.id)).toEqual(['x2', 'x1']);

    // excludeNoteId removes the current note's own results.
    const others = await persistence.getSimilarWorkoutResults('wod-a', { excludeNoteId: note.id });
    expect(others.map(r => r.id)).toEqual(['x1']);

    // includePlayground reveals playground rows, still newest first.
    const withPlayground = await persistence.getSimilarWorkoutResults('wod-a', { includePlayground: true });
    expect(withPlayground.map(r => r.id)).toEqual(['x2', 'x3', 'x1']);

    // limit applies after filtering.
    const limited = await persistence.getSimilarWorkoutResults('wod-a', { includePlayground: true, limit: 2 });
    expect(limited.map(r => r.id)).toEqual(['x2', 'x3']);
  });

  it('rederiveResultAnalytics replays logs headlessly and rewrites result + facts', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const T0 = 1_700_000_000_000;
    const scriptBlock = {
      id: 'wod-a',
      contentId: 'bc-a',
      dialect: 'wod' as const,
      startLine: 2,
      endLine: 5,
      content: '21 Deadlift 60kg',
      state: 'idle' as const,
      version: 1,
      createdAt: 0,
      widgetIds: {},
    };
    const segment: NoteSegment = {
      id: 'wod-a',
      version: 1,
      noteId: note.id,
      dataType: 'wod',
      data: scriptBlock,
      rawContent: '21 Deadlift 60kg',
      createdAt: 1,
    };
    const staleResult: WorkoutResult = {
      id: 'result-replay',
      noteId: note.id,
      segmentId: 'wod-a',
      segmentVersion: 1,
      blockContentId: 'bc-a',
      origin: 'journal',
      data: {
        startTime: T0,
        endTime: T0 + 60_000,
        duration: 60_000,
        completed: true,
        logs: [
          {
            id: 1,
            outputType: 'segment',
            timeSpan: { started: T0, ended: T0 + 60_000 },
            metrics: [
              { type: 'rep', value: 21, image: '21', origin: 'runtime' },
              { type: 'effort', value: 'Deadlift', image: 'Deadlift', origin: 'parser' },
              { type: 'elapsed', value: 60_000, origin: 'runtime' },
            ],
            sourceBlockKey: 'block-1',
            stackLevel: 0,
          },
          {
            id: 99,
            outputType: 'analytics',
            timeSpan: { started: T0, ended: T0 },
            metrics: [{ type: 'label', value: 'Stale', image: 'Stale', origin: 'analyzed' }],
            sourceBlockKey: 'analytics-summary',
            stackLevel: 0,
          },
        ],
      },
      createdAt: T0 + 60_000,
    };

    const savedResults: WorkoutResult[] = [];
    const purgedFor: string[] = [];
    const rewrittenFacts: AnalyticsDataPoint[] = [];
    const storage = {
      getNote: async () => note,
      getResultById: async () => staleResult,
      getSegment: async () => segment,
      getLatestSegmentVersion: async () => segment,
      saveResult: async (r: WorkoutResult) => { savedResults.push(r); return r.id; },
      deleteAnalyticsPointsForResult: async (resultId: string) => { purgedFor.push(resultId); },
      saveAnalyticsPoints: async (points: AnalyticsDataPoint[]) => { rewrittenFacts.push(...points); },
    };
    const persistence = new IndexedDBNotePersistence(storage as never, {} as never);

    const updated = await persistence.rederiveResultAnalytics('result-replay');

    // Result rewritten: stale Tier-2 discarded, fresh Tier-2 regenerated
    // into the SAME logs stream (no data.analytics split).
    expect(savedResults).toHaveLength(1);
    expect(updated.data.logs?.some(o => o.id === 99)).toBe(false);
    expect((updated.data.logs?.filter(o => o.outputType === 'analytics').length ?? 0)).toBeGreaterThan(0);

    // Facts purged for exactly this result, then rewritten as summary rows
    // with block identity.
    expect(purgedFor).toEqual(['result-replay']);
    expect(rewrittenFacts.length).toBeGreaterThan(0);
    expect(rewrittenFacts.every(p => p.grain === 'summary')).toBe(true);
    expect(rewrittenFacts.every(p => p.resultId === 'result-replay')).toBe(true);
    expect(rewrittenFacts.every(p => p.segmentId === 'wod-a')).toBe(true);
    expect(rewrittenFacts.every(p => p.origin === 'journal')).toBe(true);
  });

  it('rederiveResultAnalytics rejects results with no recoverable segment context', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const storage = {
      getResultById: async () => ({
        id: 'orphan',
        noteId: note.id,
        data: { startTime: 0, endTime: 1, duration: 1, completed: true, logs: [] },
        createdAt: 1,
      } as WorkoutResult),
    };
    const persistence = new IndexedDBNotePersistence(storage as never, {} as never);

    await expect(persistence.rederiveResultAnalytics('orphan')).rejects.toThrow(/no NoteSegment/);
  });
});
