import { describe, expect, it, mock } from 'bun:test';

import type { HistoryEntry } from '@/types/history';
import type { AnalyticsDataPoint, Note, NoteSegment, WorkoutResult } from '@/types/storage';

const indexedDBService = {};

mock.module('@/services/db/IndexedDBService', () => ({
  indexedDBService,
}));

const persistenceModule = import('./IndexedDBNotePersistence');

const note: Note = {
  id: '11111111-2222-4333-8444-555555555555',
  title: 'Fran',
  rawContent: '# Fran',
  tags: ['crossfit'],
  createdAt: 1,
  updatedAt: 2,
  targetDate: 3,
  segmentIds: ['wod-a'],
};

const olderSectionResult: WorkoutResult = {
  id: 'older',
  noteId: note.id,
  sectionId: 'wod-a',
  segmentId: 'wod-a',
  data: { startTime: 100, endTime: 200, duration: 100, metrics: [], logs: [], completed: true },
  completedAt: 200,
};

const latestSectionResult: WorkoutResult = {
  id: 'latest',
  noteId: note.id,
  sectionId: 'wod-a',
  segmentId: 'wod-a',
  data: { startTime: 300, endTime: 450, duration: 150, metrics: [], logs: [], completed: true },
  completedAt: 450,
};

const otherResult: WorkoutResult = {
  id: 'other',
  noteId: note.id,
  sectionId: 'wod-b',
  segmentId: 'wod-b',
  data: { startTime: 500, endTime: 700, duration: 200, metrics: [], logs: [], completed: true },
  completedAt: 700,
};

function createHarness(latestSegments: NoteSegment[] = []) {
  const results = [olderSectionResult, latestSectionResult, otherResult];
  const requestedLatestSegmentIds: string[][] = [];
  const savedAnalyticsPoints: AnalyticsDataPoint[] = [];
  const savedAttachments: import('@/types/storage').Attachment[] = [];
  const storage = {
    getNote: async (id: string) => id === note.id ? note : undefined,
    getAllNotes: async () => [note],
    getLatestSegments: async (segmentIds: string[]) => {
      requestedLatestSegmentIds.push(segmentIds);
      return latestSegments.filter(segment => segmentIds.includes(segment.id));
    },
    getLatestSegmentVersion: async () => undefined,
    getResultsForNote: async (noteId: string) => results.filter(result => result.noteId === noteId),
    getResultsForSection: async (_noteId: string, sectionId: string) =>
      results.filter(result => result.sectionId === sectionId || result.segmentId === sectionId),
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
      updatedAt: note.updatedAt,
      targetDate: note.targetDate,
      rawContent: note.rawContent,
      tags: note.tags,
      schemaVersion: 1,
    }),
    getEntries: async () => [],
    updateEntry: async () => ({} as HistoryEntry),
    deleteEntry: async () => undefined,
  };

  return { storage, contentProvider, requestedLatestSegmentIds, savedAnalyticsPoints, savedAttachments };
}

describe('IndexedDBNotePersistence', () => {
  it('normalizes runtime analytics segments for persistence', async () => {
    const { normalizeAnalyticsSegments } = await persistenceModule;

    const points = normalizeAnalyticsSegments([
      {
        id: 'segment-a',
        elapsed: 12,
        metric: { reps: 30, label: 'ignored' },
        name: 'AMRAP',
        absoluteStartTime: 123,
      },
    ], note.id, 'result-a');

    expect(points.map(point => point.type)).toEqual(['elapsed', 'reps']);
    expect(points.every(point => point.noteId === note.id)).toBe(true);
    expect(points.every(point => point.resultId === 'result-a')).toBe(true);
    expect(points.every(point => point.segmentVersion === 0)).toBe(true);
  });

  it('persists analytics with the latest segment version', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const latestSegment: NoteSegment = {
      id: 'segment-a',
      version: 7,
      noteId: note.id,
      dataType: 'wod',
      data: null,
      rawContent: '21-15-9',
      createdAt: 456,
    };
    const { storage, contentProvider, requestedLatestSegmentIds, savedAnalyticsPoints } = createHarness([latestSegment]);
    const persistence = new IndexedDBNotePersistence(storage, contentProvider as any);

    await persistence.mutateNote(note.id, {
      analytics: {
        resultId: 'result-a',
        segments: [{
          id: 'segment-a',
          elapsed: 12,
          metric: { reps: 30 },
        }, {
          id: 'segment-a',
          metric: { calories: 9 },
        }, {
          id: 'missing-segment',
          elapsed: 5,
          metric: {},
        }],
      },
    });

    expect(requestedLatestSegmentIds).toEqual([['segment-a', 'missing-segment']]);
    expect(savedAnalyticsPoints).toHaveLength(4);
    expect(savedAnalyticsPoints.filter(point => point.segmentId === 'segment-a').every(point => point.segmentVersion === 7)).toBe(true);
    expect(savedAnalyticsPoints.find(point => point.segmentId === 'missing-segment')?.segmentVersion).toBe(0);
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
      resultSelection: { mode: 'latest-for-section', sectionId: 'wod-a' },
    });

    expect(entry.results?.duration).toBe(150);
  });

  it('returns section history sorted newest first', async () => {
    const { IndexedDBNotePersistence } = await persistenceModule;
    const { storage, contentProvider } = createHarness();
    const persistence = new IndexedDBNotePersistence(storage, contentProvider as any);

    const entry = await persistence.getNote(note.id, {
      projection: 'history-detail',
      resultSelection: { mode: 'all-for-section', sectionId: 'wod-a' },
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
});
