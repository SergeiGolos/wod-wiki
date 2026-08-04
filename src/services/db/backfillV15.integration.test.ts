/**
 * V15 migration driver test — real IndexedDB stack (fake-indexeddb backing),
 * same '?real' module-key seam as backfillV12.integration.test.ts (sibling
 * files stub the service module process-globally).
 *
 * Defends the observable contracts of the #893 fence-tag cutover:
 *   1. Stored segment rawContent fences are rewritten — ```wod, ```plan, and
 *      ```whiteboard all become ```time (incl. 4-backtick and
 *      trailing-whitespace variants); time/log/query/dashboard/code fences
 *      are untouched.
 *   2. History segment versions are rewritten too — the cutover has no read
 *      alias, so any surfaced row must carry the new tag.
 *   3. block_index rows mirror the rewritten rawContent (rebuilt from
 *      segments after the rewrite).
 *   4. Structured ScriptBlock payloads are migrated too: persisted
 *      data.dialect 'wod'/'plan' becomes 'time' — the load path re-synthesizes
 *      the fence from data.dialect, and no read alias may remain.
 *   5. rewriteLegacyFences is a pure string transform: no fences → identity.
 */
import { describe, expect, it } from 'bun:test';

import type { Note, NoteSegment } from '@/types/storage';
import type { IndexedDBService, WodWikiDB } from '@/services/db/IndexedDBService';
import type { IDBPDatabase } from 'idb';

const { IndexedDBService: RealIndexedDBService, backfillV15, rewriteLegacyFences } =
  // @ts-expect-error — bun-only '?real' specifier: bypasses the shared
  // mock.module registry (sibling files stub this module process-globally).
  // Dynamic import intentionally exercises the module-loading boundary.
  (await import('@/services/db/IndexedDBService?real')) as typeof import('@/services/db/IndexedDBService');

const service: IndexedDBService = new RealIndexedDBService();

const RUN_ID = `v15-${crypto.randomUUID()}`;
const noteId = `${RUN_ID}-note`;
const NOTE: Note = { id: noteId, title: 'Legacy note', createdAt: 1 };

function segment(id: string, version: number, rawContent: string, isHistory = false): NoteSegment {
  return {
    id,
    version,
    noteId,
    position: 0,
    dataType: 'wod',
    data: null,
    rawContent,
    createdAt: version,
    isHistory,
  };
}

/** Real save-path shape for a workout segment: fence-free displayContent in
 *  rawContent; the fence tag lives only in the ScriptBlock payload's dialect. */
function workoutSegment(
  id: string,
  version: number,
  displayContent: string,
  dialect: string,
): NoteSegment {
  return {
    ...segment(id, version, displayContent),
    data: { id, content: displayContent, dialect },
  };
}

describe('rewriteLegacyFences — pure transform', () => {
  it('rewrites wod, plan, and whiteboard tags to time', () => {
    expect(rewriteLegacyFences('```wod\n10 Burpees\n```')).toBe('```time\n10 Burpees\n```');
    expect(rewriteLegacyFences('```plan\nWeek 1\n```')).toBe('```time\nWeek 1\n```');
    expect(rewriteLegacyFences('```whiteboard\n10 Burpees\n```')).toBe('```time\n10 Burpees\n```');
  });

  it('rewrites 4-backtick and trailing-whitespace variants', () => {
    expect(rewriteLegacyFences('````wod\nx\n````')).toBe('````time\nx\n````');
    expect(rewriteLegacyFences('```wod \nx\n```')).toBe('```time \nx\n```');
  });

  it('leaves current tags and generic code fences alone', () => {
    const doc = '```time\na\n```\n```log\nb\n```\n```query\nc\n```\n```dashboard\nd\n```\n```js\ne\n```';
    expect(rewriteLegacyFences(doc)).toBe(doc);
  });

  it('is identity when no legacy fences exist', () => {
    expect(rewriteLegacyFences('# Just markdown\n\nNo fences here.')).toBe(
      '# Just markdown\n\nNo fences here.',
    );
  });

  it('does not touch the word wod outside a fence tag', () => {
    expect(rewriteLegacyFences('wod plan whiteboard')).toBe('wod plan whiteboard');
  });

  it('rewrites a fence tag at the very end of the text', () => {
    expect(rewriteLegacyFences('10 Burpees\n```wod')).toBe('10 Burpees\n```time');
  });
});

describe('backfillV15 (real IndexedDB stack)', () => {
  it('rewrites legacy fences in segments and rebuilds block_index', async () => {
    await service.saveNote(NOTE);
    // Real legacy shapes: displayContent rawContent + dialect in the payload.
    await service.saveSegment(workoutSegment(`${RUN_ID}-w`, 1, '21-15-9\n  Thrusters 95lb', 'wod'));
    await service.saveSegment(workoutSegment(`${RUN_ID}-p`, 1, 'Week 1', 'plan'));
    await service.saveSegment(workoutSegment(`${RUN_ID}-l`, 1, '5k Run', 'log'));
    // Markdown segment whose raw text still carries a legacy fence.
    await service.saveSegment({
      ...segment(`${RUN_ID}-md`, 1, '# Intro\n\n```wod\n21-15-9\n```'),
      dataType: 'markdown',
    });
    await service.saveSegment(segment(`${RUN_ID}-c`, 1, '```js\nconst x = 1;\n```'));

    const db: IDBPDatabase<WodWikiDB> = await service.getDB();
    // Simulate a pre-cutover history flag on the plan row's older version.
    await service.saveSegment(workoutSegment(`${RUN_ID}-p`, 2, 'Week 2', 'plan'));
    {
      const tx = db.transaction('segments', 'readwrite');
      const row = await tx.store.get([`${RUN_ID}-p`, 1]);
      if (row) await tx.store.put({ ...row, isHistory: true });
      await tx.done;
    }
    // Seed block_index with a stale row (as a pre-V15 DB would carry).
    {
      const tx = db.transaction(['block_index', 'segments', 'notes'], 'readwrite');
      await tx.objectStore('block_index').put({
        id: `${noteId}:${RUN_ID}-md:1`,
        noteId,
        segmentId: `${RUN_ID}-md`,
        segmentVersion: 1,
        position: 0,
        dataType: 'markdown',
        rawContent: '# Intro\n\n```wod\n21-15-9\n```',
        noteTitle: NOTE.title,
        createdAt: 1,
      });
      await tx.done;
    }

    const tx = db.transaction(['notes', 'segments', 'block_index'], 'readwrite');
    await backfillV15(tx as never);
    await tx.done;

    // 1. Payload dialects migrated; rawContent untouched (it was fence-free).
    const w = await db.get('segments', [`${RUN_ID}-w`, 1]);
    expect(w?.data?.dialect).toBe('time');
    expect(w?.rawContent).toBe('21-15-9\n  Thrusters 95lb');
    const p1 = await db.get('segments', [`${RUN_ID}-p`, 1]);
    expect(p1?.data?.dialect).toBe('time');
    const p2 = await db.get('segments', [`${RUN_ID}-p`, 2]);
    expect(p2?.data?.dialect).toBe('time');
    // 2. Current dialects and generic-code rows untouched.
    const l = await db.get('segments', [`${RUN_ID}-l`, 1]);
    expect(l?.data?.dialect).toBe('log');
    const c = await db.get('segments', [`${RUN_ID}-c`, 1]);
    expect(c?.rawContent).toBe('```js\nconst x = 1;\n```');
    // 3. Markdown raw text rewritten.
    const md = await db.get('segments', [`${RUN_ID}-md`, 1]);
    expect(md?.rawContent).toBe('# Intro\n\n```time\n21-15-9\n```');

    // 4. block_index mirrors rewritten content.
    const rows = await db.getAll('block_index');
    const rowMd = rows.find((r) => r.segmentId === `${RUN_ID}-md`);
    expect(rowMd?.rawContent).toContain('```time');
    expect(rowMd?.rawContent).not.toContain('```wod');
  });
});
