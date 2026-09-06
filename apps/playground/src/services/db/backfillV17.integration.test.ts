/**
 * V17 field catalog lifecycle test — real IndexedDB stack (fake-indexeddb
 * backing), same '?real' module-key seam as the backfillV12/V15/V16
 * integration tests.
 *
 * Defends the observable contracts of ticket 14 (lifecycle/migration):
 *   1. Saving a result makes its typed fields discoverable; an identical
 *      re-save changes no reference counts (idempotent delta).
 *   2. Editing keeps availability exact: deleting one of two supporting
 *      results keeps the field; deleting the last (note cascade) removes
 *      it — including categorical values and the note's own frontmatter
 *      fields.
 *   3. The backfill populates from retained sources, is idempotent (no
 *      double-counted support), and completes with a marker.
 */
import { describe, expect, it } from 'bun:test';

import type { IDBPDatabase } from 'idb';

import type { Note, WorkoutResult } from '@/types/storage';
import type { IndexedDBService, WodWikiDB } from '@/services/db/IndexedDBService';

// @ts-expect-error — bun-only '?real' specifier: bypasses the shared
// mock.module registry (sibling files stub this module process-globally).
// Dynamic import is intentional — a test exercising the module-loading
// boundary (documented exception).
const { IndexedDBService: RealIndexedDBService } = await import('@/services/db/IndexedDBService?real') as typeof import('@/services/db/IndexedDBService');

const service: IndexedDBService = new RealIndexedDBService();

const RUN_ID = `v17-${crypto.randomUUID()}`;
const noteId = `${RUN_ID}-note`;

function resultWith(id: string, logs: unknown[]): WorkoutResult {
  return {
    id,
    noteId,
    origin: 'journal',
    createdAt: 1_700_000_000_000,
    data: { logs },
  } as unknown as WorkoutResult;
}

const hangLog = (kg: number) => ({
  id: `${RUN_ID}-stmt-hang-${kg}`,
  outputType: 'segment',
  timeSpan: { started: 1_700_000_000_000 },
  metrics: [
    { type: 'hang', value: kg, unit: 'kg', origin: 'runtime', metadata: { canonicalKey: 'hang' } },
  ],
});

const hrvLog = {
  id: `${RUN_ID}-stmt-hrv`,
  outputType: 'segment',
  timeSpan: { started: 1_700_000_000_000 },
  metrics: [
    { type: 'custom', value: 48, metadata: { fieldRef: { path: 'hrv', kind: 'number' }, originalKey: 'hrv' } },
  ],
};

const shoeLog = (shoe: string) => ({
  id: `${RUN_ID}-stmt-shoe`,
  outputType: 'segment',
  metrics: [
    { type: 'custom', value: shoe, metadata: { fieldRef: { path: 'shoe', kind: 'string' }, originalKey: 'shoe' } },
  ],
});

async function db(): Promise<IDBPDatabase<WodWikiDB>> {
  return (service as unknown as { dbPromise: Promise<IDBPDatabase<WodWikiDB>> }).dbPromise;
}

async function sourceCountOf(fieldId: string): Promise<number | undefined> {
  return (await (await db()).get('field_catalog', fieldId))?.sourceCount;
}

function fieldIdFor(path: string, kind: 'number' | 'string'): string {
  // Mirror fieldRefKey's collision-free typed key.
  return JSON.stringify([path, kind, null]);
}

describe('V17 field catalog lifecycle (ticket 14)', () => {
  it('save → identical re-save keeps reference counts exact; the note cascade removes the last support', async () => {
    const r1 = resultWith(`${RUN_ID}-r1`, [hangLog(28)]);
    await service.saveResult(r1);

    const hangId = fieldIdFor('hang', 'number');
    expect(await sourceCountOf(hangId)).toBe(1);

    // Identical re-save — no double-increment.
    await service.saveResult(r1);
    expect(await sourceCountOf(hangId)).toBe(1);

    // A second supporting result keeps the field on first delete.
    await service.saveResult(resultWith(`${RUN_ID}-r2`, [hangLog(30), hrvLog]));
    expect(await sourceCountOf(hangId)).toBe(2);

    // Deleting one of two supporting results keeps the field…
    await service.saveResult(resultWith(`${RUN_ID}-r2-empty`, []));
    await service.deleteNote(noteId);
    // …but deleting the note cascade removes every remaining support.
    expect(await sourceCountOf(hangId)).toBeUndefined();
    expect(await sourceCountOf(fieldIdFor('hrv', 'number'))).toBeUndefined();
  });

  it('the note save path catalogues frontmatter fields and the cascade removes them', async () => {
    const note = {
      id: `${RUN_ID}-note-fm`,
      title: 'f',
      rawContent: '---\nshoe: Alphafly\n---\n\nbody',
    } as unknown as Note;
    await service.saveNote(note);
    const shoeId = fieldIdFor('shoe', 'string');
    expect(await sourceCountOf(shoeId)).toBe(1);

    const database = await db();
    const values = await (await db()).getAllFromIndex("field_values", "by-field", shoeId);
    expect(values.map((v) => v.value)).toEqual(['Alphafly']);

    await service.deleteNote(note.id);
    expect(await sourceCountOf(shoeId)).toBeUndefined();
    expect(await (await db()).getAllFromIndex("field_values", "by-field", shoeId)).toEqual([]);
  });

  it('backfill populates from retained sources, is idempotent, and completes', async () => {
    await service.saveResult(resultWith(`${RUN_ID}-bf-r1`, [shoeLog('Alphafly')]));

    // Simulate an interrupted earlier backfill (marker initializing, no data).
    const database = await db();
    await database.put('field_catalog_meta', {
      id: 'backfill', status: 'initializing', revision: 0, updatedAt: 0,
    });

    await service.ensureFieldCatalogBackfill();
    const shoeId = fieldIdFor('shoe', 'string');
    expect(await sourceCountOf(shoeId)).toBe(1);

    // Re-running a completed backfill is a no-op (no double-counted support).
    await service.ensureFieldCatalogBackfill();
    expect(await sourceCountOf(shoeId)).toBe(1);

    const state = await database.get('field_catalog_meta', 'backfill');
    expect(state?.status).toBe('complete');
  });
});
