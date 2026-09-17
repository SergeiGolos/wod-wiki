import { describe, it, expect } from 'bun:test';
import { IndexedDBNotePersistence } from '@/services/persistence/IndexedDBNotePersistence';
import { captureSessionRpe } from './captureSessionRpe';
import { MetricType } from '@bitcobblers/wod-wiki-engine';
import type { NotePersistenceStorage, EventRecord } from '@/services/persistence/types';
import type { Session, NoteSegment } from '@/types/storage';

const T0 = 1_700_000_000_000;
const SEGMENT: NoteSegment = {
  id: 'wod-2-test',
  version: 1,
  noteId: 'note-1',
  position: 2,
  dataType: 'wod',
  data: {
    id: 'block-1',
    content: '21 Deadlift 60kg',
    contentId: 'bc-test',
    sport: 'crossfit',
    dialect: 'time',
    startLine: 0,
    endLine: 1,
    statements: [],
    state: 'idle',
    version: 1,
    createdAt: T0,
    widgetIds: {},
  },
  rawContent: '21 Deadlift 60kg',
  createdAt: T0,
  updatedAt: T0,
  isHistory: false,
};

function baseSegmentEvent(resultId: string): EventRecord {
  return {
    id: `${resultId}:0`,
    resultId,
    noteId: 'note-1',
    timestamp: T0,
    grain: 'event',
    outputType: 'segment',
    metrics: [
      { type: 'rep', value: 21, image: '21', origin: 'runtime' },
      { type: 'effort', value: 'Deadlift', image: 'Deadlift', origin: 'parser' },
      { type: 'elapsed', value: 60_000, origin: 'runtime' },
    ],
    sourceBlockKey: 'block-1',
    stackLevel: 0,
  };
}

function makeResult(overrides: Partial<Session> = {}): Session {
  return {
    id: 'result-1',
    noteId: 'note-1',
    segmentId: 'wod-2-test',
    segmentVersion: 1,
    blockContentId: 'bc-test',
    origin: 'journal',
    startTime: T0,
    endTime: T0 + 60_000,
    duration: 60_000,
    completed: true,
    createdAt: T0 + 60_000,
    ...overrides,
  };
}

function createHarness(result: Session, initialEvents: EventRecord[] = [], segment: NoteSegment | undefined = SEGMENT) {
  let currentResult = result;
  let currentEvents = [...initialEvents];
  const savedResults: Session[] = [];
  const finalizedSummaries: { resultId: string; rows: EventRecord[] }[] = [];

  const storage: NotePersistenceStorage = {
    getNote: async () => undefined,
    saveNote: async () => 'note-1',
    getAllNotes: async () => [],
    getLatestSegmentVersion: async (id) => (segment && segment.id === id ? segment : undefined),
    getSegment: async (id, version) => (segment && segment.id === id && segment.version === version ? segment : undefined),
    getResultsForNote: async () => [currentResult],
    saveResult: async (r) => {
      currentResult = r;
      savedResults.push(r);
      return r.id;
    },
    getResultsByContentId: async () => [],
    getResultsForSection: async () => [],
    getResultById: async (id) => (id === currentResult.id ? currentResult : undefined),
    getAttachmentsForNote: async () => [],
    saveAttachment: async () => 'att-1',
    deleteAttachment: async () => {},
    appendEvents: async (rows) => {
      currentEvents.push(...rows);
    },
    finalizeSummaries: async (resultId, rows) => {
      finalizedSummaries.push({ resultId, rows });
    },
    deleteEvents: async (ids) => {
      const doomed = new Set(ids);
      currentEvents = currentEvents.filter((r) => !doomed.has(r.id));
    },
    getEventsForNote: async () => currentEvents,
    getEventsByResult: async (resultId) => currentEvents.filter((r) => r.resultId === resultId),
  };

  const persistence = new IndexedDBNotePersistence(storage);

  return {
    persistence,
    storage,
    savedResults: () => savedResults,
    finalizedSummaries: () => finalizedSummaries,
    currentEvents: () => currentEvents,
  };
}

function findUserRpeEvents(events: EventRecord[]) {
  return events.filter(
    (row) =>
      row.outputType === 'segment' &&
      row.metrics.some((m) => m.type === MetricType.SessionRPE && m.origin === 'user'),
  );
}

describe('captureSessionRpe', () => {
  it('returns not-found when the result does not exist', async () => {
    const storage: NotePersistenceStorage = {
      getResultById: async () => undefined,
      saveResult: async () => '',
      getNote: async () => undefined,
      saveNote: async () => '',
      getAllNotes: async () => [],
      getLatestSegmentVersion: async () => undefined,
      getResultsForNote: async () => [],
      getResultsByContentId: async () => [],
      getResultsForSection: async () => [],
      getAttachmentsForNote: async () => [],
      saveAttachment: async () => '',
      deleteAttachment: async () => {},
    };
    const persistence = new IndexedDBNotePersistence(storage);

    const outcome = await captureSessionRpe('missing-id', 7, { storage, persistence });

    expect(outcome).toBe('not-found');
  });

  it('appends a user-origin SessionRPE event row and re-derives analytics', async () => {
    const result = makeResult();
    const { storage, persistence, savedResults, finalizedSummaries, currentEvents } = createHarness(result, [baseSegmentEvent(result.id)]);

    const outcome = await captureSessionRpe(result.id, 8, { storage, persistence });

    expect(outcome).toBe('captured');
    expect(savedResults().length).toBe(0); // Session row is untouched under V21

    const rpeEvents = findUserRpeEvents(currentEvents());
    expect(rpeEvents).toHaveLength(1);
    expect(rpeEvents[0]!.metrics[0]).toMatchObject({
      type: MetricType.SessionRPE,
      value: 8,
      origin: 'user',
      image: 'rpe: 8',
    });

    const resultFinalizations = finalizedSummaries().filter((f) => f.resultId === result.id);
    expect(resultFinalizations.length).toBeGreaterThan(0);
    expect(resultFinalizations.some((f) => f.rows.some((r) => r.grain === 'summary'))).toBe(true);
  });

  it('replaces the existing user-origin SessionRPE on re-answer (no duplicates)', async () => {
    const result = makeResult();
    const firstRpe: EventRecord = {
      id: `${result.id}:rpe:old`,
      resultId: result.id,
      noteId: 'note-1',
      timestamp: T0 + 60_000,
      grain: 'event',
      outputType: 'segment',
      metrics: [{ type: MetricType.SessionRPE, value: 5, origin: 'user', image: 'rpe: 5' }],
      sourceBlockKey: 'block-1',
      stackLevel: 0,
    };
    const { storage, persistence, currentEvents } = createHarness(result, [baseSegmentEvent(result.id), firstRpe]);

    await captureSessionRpe(result.id, 9, { storage, persistence });

    const rpeEvents = findUserRpeEvents(currentEvents());
    expect(rpeEvents).toHaveLength(1);
    expect(rpeEvents[0]!.metrics[0]!.value).toBe(9);
  });

  it('preserves non-user SessionRPE origins when replacing', async () => {
    const result = makeResult();
    const analyzedRpe: EventRecord = {
      id: `${result.id}:analyzed-rpe`,
      resultId: result.id,
      noteId: 'note-1',
      timestamp: T0 + 60_000,
      grain: 'event',
      outputType: 'segment',
      metrics: [{ type: MetricType.SessionRPE, value: 5, origin: 'analyzed', image: 'rpe: 5' }],
      sourceBlockKey: 'block-1',
      stackLevel: 0,
    };
    const { storage, persistence, currentEvents } = createHarness(result, [baseSegmentEvent(result.id), analyzedRpe]);

    await captureSessionRpe(result.id, 9, { storage, persistence });

    const rpeEvents = currentEvents().filter(
      (row) => row.outputType === 'segment' && row.metrics.some((m) => m.type === MetricType.SessionRPE),
    );
    const userRpe = rpeEvents.find((s) => s.metrics.some((m) => m.origin === 'user'));
    expect(userRpe).toBeDefined();
    expect(userRpe!.metrics[0]!.value).toBe(9);
  });

  it('returns captured-no-rederive for orphan results and still saves the event', async () => {
    const result = makeResult({ segmentId: undefined, segmentVersion: undefined });
    const { storage, persistence, currentEvents } = createHarness(result, [baseSegmentEvent(result.id)], undefined);

    const outcome = await captureSessionRpe(result.id, 7, { storage, persistence });

    expect(outcome).toBe('captured-no-rederive');

    const rpeEvents = findUserRpeEvents(currentEvents());
    expect(rpeEvents).toHaveLength(1);
    expect(rpeEvents[0]!.metrics[0]!.value).toBe(7);
  });

  it('re-derivation preserves the user-origin SessionRPE in replayed events', async () => {
    const result = makeResult();
    const { storage, persistence, currentEvents } = createHarness(result, [baseSegmentEvent(result.id)]);

    await captureSessionRpe(result.id, 8, { storage, persistence });

    const userRpe = currentEvents()
      .flatMap((row) => row.metrics)
      .find((m) => m.type === MetricType.SessionRPE && m.origin === 'user');
    expect(userRpe).toBeDefined();
    expect(userRpe!.value).toBe(8);
  });
});
