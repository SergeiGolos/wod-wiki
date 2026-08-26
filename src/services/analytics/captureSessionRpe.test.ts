/**
 * captureSessionRpe tests — post-workout RPE write path (#735).
 *
 * Defends the observable contracts:
 *   1. Missing result → 'not-found' with no side effects.
 *   2. Captured RPE is appended as a user-origin SessionRPE segment statement.
 *   3. Re-answer removes the previous user-origin SessionRPE statement (no duplicates).
 *   4. Orphan results (no NoteSegment) still save the log; re-derive degrades
 *      to 'captured-no-rederive' without crashing.
 *   5. Replay preserves the user-origin SessionRPE and the re-derived SessionLoad
 *      projection uses it (predictions frozen, user authoritative).
 */
import { describe, expect, it } from 'bun:test';

import { captureSessionRpe } from './captureSessionRpe';
import { IndexedDBNotePersistence } from '@/services/persistence/IndexedDBNotePersistence';
import { MetricType } from '@bitcobblers/wod-wiki-engine';
import type { NotePersistenceStorage, UnifiedEventRecord } from '@/services/persistence/types';
import type { NoteSegment, WorkoutResult } from '@/types/storage';
import type { StoredOutputStatement } from '@/components/Editor/types';

const T0 = 1_700_000_000_000;

const BLOCK_CONTENT = '21 Deadlift 60kg';

const SEGMENT: NoteSegment = {
  id: 'wod-2-test',
  version: 1,
  noteId: 'note-1',
  dataType: 'wod',
  rawContent: BLOCK_CONTENT,
  data: {
    id: 'wod-2-test',
    contentId: 'bc-test',
    dialect: 'time',
    startLine: 2,
    endLine: 5,
    content: BLOCK_CONTENT,
    state: 'idle',
    version: 1,
    createdAt: 0,
    widgetIds: {},
  },
  createdAt: T0,
};

function baseSegmentLog(): StoredOutputStatement {
  return {
    id: 1,
    outputType: 'segment',
    timeSpan: { started: T0, ended: T0 + 60_000 },
    metrics: [
      { type: MetricType.Rep, value: 21, image: '21', origin: 'runtime' },
      { type: MetricType.Resistance, value: 60, image: '60 kg', origin: 'parser' },
      { type: MetricType.Effort, value: 'Deadlift', image: 'Deadlift', origin: 'parser' },
      { type: MetricType.Elapsed, value: 60_000, origin: 'runtime' },
      { type: MetricType.Total, value: 60_000, origin: 'runtime' },
    ],
    sourceBlockKey: 'block-1',
    stackLevel: 0,
  };
}

function makeResult(overrides: Partial<WorkoutResult> = {}): WorkoutResult {
  return {
    id: 'result-1',
    noteId: 'note-1',
    segmentId: 'wod-2-test',
    segmentVersion: 1,
    blockContentId: 'bc-test',
    origin: 'journal',
    data: { startTime: T0, endTime: T0 + 60_000, duration: 60_000, completed: true, logs: [baseSegmentLog()] },
    createdAt: T0 + 60_000,
    ...overrides,
  };
}

function createHarness(result: WorkoutResult, segment: NoteSegment | undefined = SEGMENT) {
  let currentResult = result;
  const savedResults: WorkoutResult[] = [];
  const finalizedSummaries: { resultId: string; rows: UnifiedEventRecord[] }[] = [];

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
    appendEvents: async () => {},
    finalizeSummaries: async (resultId, rows) => {
      finalizedSummaries.push({ resultId, rows });
    },
    deleteEvents: async () => {},
    getEventsForNote: async () => [],
  };

  const persistence = new IndexedDBNotePersistence(storage);

  return {
    persistence,
    storage,
    savedResults: () => savedResults,
    finalizedSummaries: () => finalizedSummaries,
  };
}

function findUserRpeStatements(logs: StoredOutputStatement[]) {
  return logs.filter(
    (o) =>
      o.outputType === 'segment' &&
      o.metrics.some((m) => m.type === MetricType.SessionRPE && m.origin === 'user'),
  );
}

function findSessionLoad(logs: StoredOutputStatement[]) {
  return logs
    .filter((o) => o.outputType === 'analytics')
    .flatMap((o) => o.metrics)
    .find((m) => m.type === MetricType.Load);
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

  it('appends a user-origin SessionRPE segment statement and re-derives analytics', async () => {
    const result = makeResult();
    const { storage, persistence, savedResults, finalizedSummaries } = createHarness(result);

    const outcome = await captureSessionRpe(result.id, 8, { storage, persistence });

    expect(outcome).toBe('captured');
    expect(savedResults().length).toBeGreaterThanOrEqual(1);

    const saved = savedResults()[savedResults().length - 1]!;
    const rpeStatements = findUserRpeStatements(saved.data.logs ?? []);
    expect(rpeStatements).toHaveLength(1);
    expect(rpeStatements[0]!.metrics[0]).toMatchObject({
      type: MetricType.SessionRPE,
      value: 8,
      origin: 'user',
      image: 'rpe: 8',
    });

    // Re-derivation ran and finalized summary events for the result.
    const resultFinalizations = finalizedSummaries().filter((f) => f.resultId === result.id);
    expect(resultFinalizations.length).toBeGreaterThan(0);
    expect(resultFinalizations.some((f) => f.rows.some((r) => r.grain === 'summary'))).toBe(true);

    // SessionLoad uses the user RPE (8) × 1 minute = 8 AU.
    const sessionLoad = findSessionLoad(saved.data.logs ?? []);
    expect(sessionLoad).toBeDefined();
    expect(sessionLoad!.value).toBe(8);
  });

  it('replaces the existing user-origin SessionRPE on re-answer (no duplicates)', async () => {
    const firstRpe: StoredOutputStatement = {
      id: 2,
      outputType: 'segment',
      timeSpan: { started: T0 + 60_000, ended: T0 + 60_000 },
      metrics: [{ type: MetricType.SessionRPE, value: 5, origin: 'user', image: 'rpe: 5' }],
      sourceBlockKey: 'block-1',
      stackLevel: 0,
    };
    const result = makeResult({ data: { ...makeResult().data, logs: [baseSegmentLog(), firstRpe] } });
    const { storage, persistence, savedResults } = createHarness(result);

    await captureSessionRpe(result.id, 9, { storage, persistence });

    const saved = savedResults()[0]!;
    const rpeStatements = findUserRpeStatements(saved.data.logs ?? []);
    expect(rpeStatements).toHaveLength(1);
    expect(rpeStatements[0]!.metrics[0]!.value).toBe(9);
  });

  it('preserves non-user SessionRPE origins when replacing', async () => {
    const analyzedRpe: StoredOutputStatement = {
      id: 2,
      outputType: 'segment',
      timeSpan: { started: T0 + 60_000, ended: T0 + 60_000 },
      metrics: [{ type: MetricType.SessionRPE, value: 5, origin: 'analyzed', image: 'rpe: 5' }],
      sourceBlockKey: 'block-1',
      stackLevel: 0,
    };
    const result = makeResult({ data: { ...makeResult().data, logs: [baseSegmentLog(), analyzedRpe] } });
    const { storage, persistence, savedResults } = createHarness(result);

    await captureSessionRpe(result.id, 9, { storage, persistence });

    const saved = savedResults()[0]!;
    const rpeStatements = saved.data.logs!.filter(
      (o) => o.outputType === 'segment' && o.metrics.some((m) => m.type === MetricType.SessionRPE),
    );
    // Analyzed RPE is stripped by replay, user RPE is added.
    const userRpe = rpeStatements.find((s) => s.metrics.some((m) => m.origin === 'user'));
    expect(userRpe).toBeDefined();
    expect(userRpe!.metrics[0]!.value).toBe(9);
  });

  it('returns captured-no-rederive for orphan results and still saves the log', async () => {
    const result = makeResult({ segmentId: undefined, segmentVersion: undefined });
    const { storage, persistence, savedResults } = createHarness(result, undefined);

    const outcome = await captureSessionRpe(result.id, 7, { storage, persistence });

    expect(outcome).toBe('captured-no-rederive');
    expect(savedResults()).toHaveLength(1);

    const saved = savedResults()[0]!;
    const rpeStatements = findUserRpeStatements(saved.data.logs ?? []);
    expect(rpeStatements).toHaveLength(1);
    expect(rpeStatements[0]!.metrics[0]!.value).toBe(7);
  });

  it('re-derivation preserves the user-origin SessionRPE in replayed logs', async () => {
    const result = makeResult();
    const { storage, persistence, savedResults } = createHarness(result);

    await captureSessionRpe(result.id, 8, { storage, persistence });

    const saved = savedResults()[0]!;
    const userRpe = saved.data.logs!
      .flatMap((o) => o.metrics)
      .find((m) => m.type === MetricType.SessionRPE && m.origin === 'user');
    expect(userRpe).toBeDefined();
    expect(userRpe!.value).toBe(8);
  });
});
