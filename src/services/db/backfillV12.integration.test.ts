/**
 * V12 migration driver test — real IndexedDB stack (fake-indexeddb backing),
 * same '?real' module-key seam as persistence/resultIdentity.integration.test.ts (sibling
 * files stub the service module process-globally).
 *
 * Defends the observable contracts of backfillV12:
 *   1. Legacy analytics rows are PURGED; every result with logs gets fresh
 *      fact rows carrying effortSlug/discipline (from replayed processor
 *      metadata) and timestamp === WorkoutResult.createdAt (canonical
 *      workout time — never the derivation-time output stamp).
 *   2. Replay rewrites the result's logs (stale Tier-2 replaced).
 *   3. Results without recoverable segment context fall back to
 *      re-normalizing their stored logs — they still gain facts (the pre-V12
 *      partial-save gap), with the canonical timestamp.
 *   4. Frontmatter `tags:` on existing notes are swept into note_tags
 *      (additively — pre-existing manual links survive).
 */
import { describe, expect, it } from 'bun:test';

import type { IDBPDatabase } from 'idb';
import type {
  AnalyticsDataPoint,
  Note,
  NoteSegment,
  Tag,
  WorkoutResult,
} from '@/types/storage';
import type { ScriptBlock, StoredOutputStatement } from '@/components/Editor/types';
import type { IndexedDBService, WodWikiDB } from '@/services/db/IndexedDBService';

// @ts-expect-error — bun-only '?real' specifier: bypasses the shared
// mock.module registry (sibling files stub this module process-globally).
// Dynamic import is intentional — a test exercising the module-loading
// boundary (documented exception).
const { IndexedDBService: RealIndexedDBService, backfillV12 } = await import('@/services/db/IndexedDBService?real') as typeof import('@/services/db/IndexedDBService');

const service: IndexedDBService = new RealIndexedDBService();

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

async function allFacts(db: IDBPDatabase<WodWikiDB>): Promise<AnalyticsDataPoint[]> {
  const rows = await db.getAll('analytics');
  return rows.filter(row => row.noteId === noteId || row.resultId === replayResultId || row.resultId === orphanResultId);
}

describe('backfillV12 (real IndexedDB stack)', () => {
  it('purges legacy rows and re-derives facts with effort identity + canonical time', async () => {
    // Seed a pre-V12 journal.
    await service.saveNote(NOTE);
    await service.saveSegment(WOD_SEGMENT);
    await service.saveSegment(FRONTMATTER_SEGMENT);
    await service.saveResult(REPLAY_RESULT);
    await service.saveResult(ORPHAN_RESULT);
    await service.saveAnalyticsPoints([GARBAGE_FACT]);
    // Pre-existing manual tag link that the sweep must preserve.
    await service.setNoteTags(noteId, ['manual-tag']);

    const db = await service.getDB();

    // Schema contract: the by-timestamp index exists on a v12-opened DB.
    expect(db.objectStoreNames.contains('analytics')).toBe(true);
    const indexNames = Array.from((db.transaction('analytics').objectStore('analytics')).indexNames);
    expect(indexNames).toContain('by-timestamp');

    const tx = db.transaction(
      ['notes', 'page', 'tags', 'note_tags', 'segments', 'results', 'attachments', 'analytics', 'efforts'],
      'readwrite',
    );
    await backfillV12(tx as never);
    await tx.done;

    // 1. Garbage row purged; replayed result gained fresh facts.
    const facts = await allFacts(db);
    expect(facts.some(row => row.id === GARBAGE_FACT.id)).toBe(false);
    const replayFacts = facts.filter(row => row.resultId === replayResultId);
    expect(replayFacts.length).toBeGreaterThan(0);
    expect(replayFacts.every(row => row.timestamp === REPLAY_RESULT.createdAt)).toBe(true);
    // Replay ran the current processors: effort metadata reached the rows.
    const tagged = replayFacts.filter(row => row.effortSlug !== undefined);
    expect(tagged.length).toBeGreaterThan(0);
    expect(tagged.every(row => row.effortSlug === 'burpee' && row.discipline === 'bodyweight')).toBe(true);

    // 2. The result's logs were rewritten (stale Tier-2 replaced).
    const rewritten = await db.get('results', replayResultId);
    expect(rewritten?.data.logs?.some(o => o.id === 99)).toBe(false);
    expect((rewritten?.data.logs?.filter(o => o.outputType === 'analytics').length ?? 0)).toBeGreaterThan(0);

    // 3. Orphan (partial-save) result: facts from stored logs, canonical time.
    const orphanFacts = facts.filter(row => row.resultId === orphanResultId);
    expect(orphanFacts.length).toBeGreaterThan(0);
    expect(orphanFacts.every(row => row.timestamp === ORPHAN_RESULT.createdAt)).toBe(true);
    expect(orphanFacts.some(row => row.metricKey === 'totalReps')).toBe(true);

    // 4. Frontmatter tag swept in; the manual link survived.
    const tags: Tag[] = await service.getTagsForNote(noteId);
    expect(tags.map(tag => tag.label).sort()).toEqual(['crossfit', 'manual-tag']);
  });
});
