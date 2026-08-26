/**
 * V12 migration driver test — real IndexedDB stack (fake-indexeddb backing),
 * same '?real' module-key seam as persistence/resultIdentity.integration.test.ts (sibling
 * files stub the service module process-globally).
 *
 * Defends the observable contracts of backfillV12:
 *   1. Legacy analytics rows are PURGED; every result with logs gets fresh
 *      event rows carrying block identity and canonical workout time.
 *   2. Replay rewrites the result's logs (stale Tier-2 replaced).
 *   3. Results without recoverable segment context fall back to re-normalizing
 *      their stored logs — they still gain facts (the pre-V12 partial-save gap),
 *      with the canonical timestamp.
 *   4. Frontmatter `tags:` on existing notes are swept into note_tags
 *      (additively — pre-existing manual links survive).
 */
import { describe, expect, it } from 'bun:test';
import { openDB, type IDBPDatabase } from 'idb';

import type { AnalyticsDataPoint, Note, NoteSegment, Tag, WorkoutResult } from '@/types/storage';
import type { ScriptBlock, StoredOutputStatement } from '@/components/Editor/types';
import type { IndexedDBService, WodWikiDB } from '@/services/db/IndexedDBService';
import { projectEventToFacts } from '@bitcobblers/wod-wiki-wql';

// @ts-expect-error — bun-only '?real' specifier: bypasses the shared
// mock.module registry (sibling files stub this module process-globally).
// Dynamic import is intentional — a test exercising the module-loading
// boundary (documented exception).
const { IndexedDBService: RealIndexedDBService } = await import('@/services/db/IndexedDBService?real') as typeof import('@/services/db/IndexedDBService');

const service: IndexedDBService = new RealIndexedDBService();
const DB_NAME = 'wodwiki-db';

const T0 = 1_700_000_000_000;
const RUN_ID = `v12-${crypto.randomUUID()}`;
const noteId = `${RUN_ID}-note`;
const replayResultId = `${RUN_ID}-replay`;
const orphanResultId = `${RUN_ID}-orphan`;

// The unit-setup effort catalog mock ships rowing/burpee/kettlebell-snatch —
// resolve against 'Burpee' (bodyweight). The block statements carry an
// 'action' metric purely to satisfy the TIS processor's requiredMetrics gate
// (StandardAnalyticsProfile filters processors by script metric types).
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

const FRONTMATTER_SEGMENT: NoteSegment = {
  id: `${RUN_ID}-fm`,
  version: 1,
  noteId,
  dataType: 'frontmatter',
  data: null,
  rawContent: '---\ntags:\n  - crossfit\n---',
  createdAt: 1,
};

const NOTE: Note = { id: noteId, title: 'Fran', createdAt: T0 };

function segmentLog(): StoredOutputStatement {
  return {
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
  };
}

/** Result with a recoverable segment but a stale Tier-2 output and no facts. */
const REPLAY_RESULT: WorkoutResult = {
  id: replayResultId,
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
      segmentLog(),
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

/** Pre-V12 partial-save shape: logs exist (with an old Tier-2 output that has
 *  no metadata), no segment context, no facts. */
const ORPHAN_RESULT: WorkoutResult = {
  id: orphanResultId,
  noteId,
  origin: 'journal',
  data: {
    startTime: T0 + 3_600_000,
    endTime: T0 + 3_660_000,
    duration: 60_000,
    completed: false,
    logs: [
      segmentLog(),
      {
        id: 5,
        outputType: 'analytics',
        timeSpan: { started: T0 + 999_000_000, ended: T0 + 999_000_000 },
        metrics: [
          { type: 'label', value: 'Total Reps', image: 'Total Reps', origin: 'analyzed' },
          { type: 'rep', value: 21, unit: 'reps', origin: 'analyzed' },
        ],
        sourceBlockKey: 'analytics-summary',
        stackLevel: 0,
      },
    ],
  },
  createdAt: T0 + 3_660_000,
};

/** Pre-V12 garbage row — wrong timestamp semantics, no effort identity. */
const GARBAGE_FACT: AnalyticsDataPoint = {
  id: `${RUN_ID}-garbage`,
  noteId,
  segmentId: '0',
  segmentVersion: 0,
  resultId: replayResultId,
  type: 'totalReps',
  value: 0,
  label: 'Total Reps',
  timestamp: 1,
  createdAt: 1,
};

async function openV11DB(): Promise<IDBPDatabase<WodWikiDB>> {
  return openDB<WodWikiDB>(DB_NAME, 11, {
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
    },
  });
}

async function allFacts(db: IDBPDatabase<WodWikiDB>): Promise<AnalyticsDataPoint[]> {
  const rows = await db.getAll('events');
  return rows
    .filter((row) => row.noteId === noteId || row.resultId === replayResultId || row.resultId === orphanResultId)
    .flatMap((row) => projectEventToFacts(row));
}

describe('backfillV12 (real IndexedDB stack)', () => {
  it('purges legacy rows and re-derives events with effort identity + canonical time', async () => {
    // Start with a clean DB so a pre-V12 schema can be seeded first.
    await service.wipe();

    // Seed a pre-V12 journal directly through the v11 object stores.
    const v11 = await openV11DB();
    await v11.put('notes', NOTE);
    await v11.put('segments', WOD_SEGMENT);
    await v11.put('segments', FRONTMATTER_SEGMENT);
    await v11.put('results', REPLAY_RESULT);
    await v11.put('results', ORPHAN_RESULT);
    await v11.put('analytics', GARBAGE_FACT as never);

    // Pre-existing manual tag link that the sweep must preserve.
    const manualTag: Tag = {
      id: `${RUN_ID}-manual-tag`,
      label: 'manual-tag',
      type: 'general',
      createdAt: 1,
    };
    await v11.put('tags', manualTag);
    await v11.put('note_tags', {
      id: `${RUN_ID}-manual-link`,
      noteId,
      tagId: manualTag.id,
    });
    v11.close();

    // Opening the service at V16 triggers the full upgrade chain, including
    // backfillV12, backfillV13–V15, and the V16 event-store migration.
    const db = await service.getDB();

    // 1. Garbage row purged; replayed result gained fresh events.
    const facts = await allFacts(db);
    expect(facts.some((row) => row.id === GARBAGE_FACT.id)).toBe(false);

    const replayFacts = facts.filter((row) => row.resultId === replayResultId);
    expect(replayFacts.length).toBeGreaterThan(0);
    expect(replayFacts.some((row) => row.metricKey === 'reps')).toBe(true);
    // Engine replay stamps effort identity onto the projected summary facts.
    expect(replayFacts.some((row) => row.effortSlug === 'burpee' && row.discipline === 'bodyweight')).toBe(true);
    // Canonical workout time is stamped on the summary projection.
    const replaySummaries = replayFacts.filter((row) => row.grain === 'summary');
    expect(replaySummaries.every((row) => row.timestamp === REPLAY_RESULT.createdAt)).toBe(true);

    // 2. The result's logs were rewritten (stale Tier-2 replaced).
    const rewritten = await db.get('results', replayResultId);
    expect(rewritten?.data.logs?.some((o) => o.id === 99)).toBe(false);
    expect((rewritten?.data.logs?.filter((o) => o.outputType === 'analytics').length ?? 0)).toBeGreaterThan(0);

    // 3. Orphan (partial-save) result: facts from stored logs, canonical time.
    const orphanFacts = facts.filter((row) => row.resultId === orphanResultId);
    expect(orphanFacts.length).toBeGreaterThan(0);
    expect(orphanFacts.every((row) => row.timestamp === ORPHAN_RESULT.createdAt)).toBe(true);
    expect(orphanFacts.some((row) => row.metricKey === 'totalReps')).toBe(true);

    // 4. Frontmatter tag swept in; the manual link survived.
    const tags: Tag[] = await service.getTagsForNote(noteId);
    expect(tags.map((tag) => tag.label).sort()).toEqual(['crossfit', 'manual-tag']);

    // 5. The legacy analytics object store is removed by the V16 upgrade.
    expect(db.objectStoreNames.contains('analytics')).toBe(false);
  });
});
