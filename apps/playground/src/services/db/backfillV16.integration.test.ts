/**
 * V16 migration driver test — real IndexedDB stack (fake-indexeddb backing),
 * same '?real' module-key seam as backfillV12/V15 integration tests (sibling
 * files stub the service module process-globally).
 *
 * Defends the observable contracts of the unified event store cutover:
 *   1. Upgrading a DB that has a result with data.logs produces grain 'event'
 *      rows 1:1 with replayed statements plus deterministic grain 'summary'
 *      rows (id prefix `${resultId}:summary:`).
 *   2. The legacy analytics object store is gone after upgrade.
 *   3. Re-finalize is idempotent — calling service.finalizeSummaries twice
 *      leaves one summary row per key.
 *   4. finalizeSummaries preserves origin 'user' wellness rows.
 */
import { describe, expect, it } from 'bun:test';
import { openDB, type IDBPDatabase } from 'idb';

import type { Note, NoteSegment, WorkoutResult } from '@/types/storage';
import type { ScriptBlock } from '@/components/Editor/types';
import type { IndexedDBService, WodWikiDB } from '@/services/db/IndexedDBService';

// @ts-expect-error — bun-only '?real' specifier: bypasses the shared
// mock.module registry (sibling files stub this module process-globally).
// Dynamic import is intentional — a test exercising the module-loading
// boundary (documented exception).
const { IndexedDBService: RealIndexedDBService } = await import('@/services/db/IndexedDBService?real') as typeof import('@/services/db/IndexedDBService');

const service: IndexedDBService = new RealIndexedDBService();
const DB_NAME = 'wodwiki-db';

const T0 = 1_700_000_000_000;
const RUN_ID = `v16-${crypto.randomUUID()}`;
const noteId = `${RUN_ID}-note`;
const resultId = `${RUN_ID}-result`;
const wellnessNoteId = `${RUN_ID}-wellness`;

const SCRIPT_BLOCK: ScriptBlock = {
  id: `${RUN_ID}-wod`,
  contentId: `${RUN_ID}-bc`,
  dialect: 'time',
  startLine: 2,
  endLine: 5,
  content: '21 Burpee',
  state: 'idle',
  version: 1,
  createdAt: 0,
  widgetIds: {},
  statements: [
    { id: 1, metrics: [{ type: 'action', value: 'rest', origin: 'parser' }] } as never,
  ],
};

const WOD_SEGMENT: NoteSegment = {
  id: SCRIPT_BLOCK.id,
  version: 1,
  noteId,
  dataType: 'wod',
  data: SCRIPT_BLOCK,
  rawContent: SCRIPT_BLOCK.content,
  createdAt: 1,
};

const NOTE: Note = { id: noteId, title: 'Fran', createdAt: T0 };

/** Result with a recoverable segment and a stale Tier-2 output. */
const REPLAY_RESULT: WorkoutResult = {
  id: resultId,
  noteId,
  segmentId: SCRIPT_BLOCK.id,
  segmentVersion: 1,
  blockContentId: SCRIPT_BLOCK.contentId,
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
          { type: 'effort', value: 'Burpee', image: 'Burpee', origin: 'parser' },
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

async function openV15DB(): Promise<IDBPDatabase<WodWikiDB>> {
  return openDB<WodWikiDB>(DB_NAME, 15, {
    upgrade(db, oldVersion) {
      if (oldVersion > 0) return;
      db.createObjectStore('notes', { keyPath: 'id' });
      db.createObjectStore('page', { keyPath: 'id' });

      const tags = db.createObjectStore('tags', { keyPath: 'id' });
      tags.createIndex('by-label', 'label', { unique: true });
      tags.createIndex('by-type', 'type');

      const noteTags = db.createObjectStore('note_tags', { keyPath: 'id' });
      noteTags.createIndex('by-note', 'noteId');
      noteTags.createIndex('by-tag', 'tagId');

      db.createObjectStore('segments', { keyPath: ['id', 'version'] });

      const results = db.createObjectStore('results', { keyPath: 'id' });
      results.createIndex('by-segment', 'segmentId');
      results.createIndex('by-note', 'noteId');
      results.createIndex('by-content', 'blockContentId');

      db.createObjectStore('attachments', { keyPath: 'id' });

      const analytics = db.createObjectStore('analytics', { keyPath: 'id' });
      analytics.createIndex('by-timestamp', 'timestamp');
      analytics.createIndex('by-result', 'resultId');
      analytics.createIndex('by-content', 'blockContentId');
      analytics.createIndex('by-metric', 'metricKey');

      db.createObjectStore('efforts', { keyPath: 'slug' });

      const blockIndex = db.createObjectStore('block_index', { keyPath: 'id' });
      blockIndex.createIndex('by-note', 'noteId');
      blockIndex.createIndex('by-content', 'blockContentId');
      blockIndex.createIndex('by-type', 'dataType');
    },
  });
}

describe('backfillV16 (real IndexedDB stack)', () => {
  it('migrates results to unified event rows and finalizes summaries', async () => {
    await service.wipe();

    const v15 = await openV15DB();
    await v15.put('notes', NOTE);
    await v15.put('segments', WOD_SEGMENT);
    await v15.put('results', REPLAY_RESULT);
    v15.close();

    // Opening the service at V16 runs backfillV16 (and any intermediate
    // backfills from the v15 baseline).
    const db = await service.getDB();

    // 1. The legacy analytics store is gone.
    expect(db.objectStoreNames.contains('analytics')).toBe(false);
    expect(db.objectStoreNames.contains('events')).toBe(true);

    // 2. The result was replayed: stale Tier-2 dropped, fresh Tier-2 present.
    const result = await db.get('results', resultId);
    expect(result?.data.logs?.some((o) => o.id === 99)).toBe(false);
    expect((result?.data.logs?.filter((o) => o.outputType === 'analytics').length ?? 0)).toBeGreaterThan(0);

    // 3. Event rows mirror the replayed logs 1:1.
    const events = await service.getEventsByResult(resultId);
    const eventRows = events.filter((row) => row.grain === 'event');
    expect(eventRows.length).toBe(result?.data.logs?.length ?? 0);
    for (const row of eventRows) {
      expect(row.resultId).toBe(resultId);
      expect(row.noteId).toBe(noteId);
      expect(row.blockContentId).toBe(SCRIPT_BLOCK.contentId);
      expect(row.segmentId).toBe(SCRIPT_BLOCK.id);
      expect(row.segmentVersion).toBe(1);
    }

    // 4. Summary rows are deterministic and scoped to the result.
    const summaryRows = events.filter((row) => row.grain === 'summary');
    expect(summaryRows.length).toBeGreaterThan(0);
    expect(summaryRows.every((row) => row.id.startsWith(`${resultId}:summary:`))).toBe(true);
    expect(summaryRows.every((row) => row.resultId === resultId)).toBe(true);
    expect(summaryRows.every((row) => row.blockContentId === SCRIPT_BLOCK.contentId)).toBe(true);
  });

  it('preserves user-origin wellness rows through finalizeSummaries', async () => {
    await service.wipe();

    const v15 = await openV15DB();
    await v15.put('notes', { id: wellnessNoteId, title: 'Wellness', createdAt: T0 });
    v15.close();

    await service.getDB();

    const wellnessResultId = `wellness:${wellnessNoteId}`;
    const wellnessRow = {
      id: `${wellnessResultId}:soreness`,
      resultId: wellnessResultId,
      noteId: wellnessNoteId,
      timestamp: T0,
      grain: 'summary' as const,
      origin: 'user' as const,
      outputType: 'wellness',
      metrics: [{
        type: 'soreness',
        value: 7,
        unit: 'rating',
        origin: 'user' as const,
        metadata: { canonicalKey: 'soreness' },
      }],
    };

    await service.appendEvents([wellnessRow]);

    // finalizeSummaries clears only engine-authored summaries; user wellness
    // rows must survive a re-finalize with no new rows.
    await service.finalizeSummaries(wellnessResultId, []);
    const afterClear = await service.getEventsByResult(wellnessResultId);
    expect(afterClear.some((row) => row.id === wellnessRow.id)).toBe(true);
  });

  it('finalizeSummaries is idempotent for engine-authored summaries', async () => {
    await service.wipe();

    const v15 = await openV15DB();
    await v15.put('notes', NOTE);
    await v15.put('segments', WOD_SEGMENT);
    await v15.put('results', REPLAY_RESULT);
    v15.close();

    await service.getDB();

    // Take the summary rows produced by the V16 backfill and re-finalize twice.
    const summaries = (await service.getEventsByResult(resultId))
      .filter((row) => row.grain === 'summary');
    expect(summaries.length).toBeGreaterThan(0);

    await service.finalizeSummaries(resultId, summaries);
    await service.finalizeSummaries(resultId, summaries);

    const after = (await service.getEventsByResult(resultId))
      .filter((row) => row.grain === 'summary');
    const keys = new Set(after.map((row) => row.id));
    expect(after.length).toBe(keys.size);
    expect(after.length).toBe(summaries.length);
  });
});
