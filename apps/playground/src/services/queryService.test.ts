import 'fake-indexeddb/auto';
import { beforeAll, describe, expect, it } from 'bun:test';
import { parseQuery, isFindQuery } from '@bitcobblers/wod-wiki-engine';
import { queryService } from './queryService';
import { indexedDBService } from '@/services/db/IndexedDBService';
import type { BlockIndexRow } from '@/types/storage';

function parseFindQuery(raw: string) {
  const parsed = parseQuery(raw);
  if (!isFindQuery(parsed)) {
    throw new Error(`Expected a find query: ${raw}`);
  }
  return parsed;
}

function corpusRow(partial: Partial<BlockIndexRow>): BlockIndexRow {
  return {
    id: 'static:note:seg:1',
    noteId: 'note',
    segmentId: 'seg',
    segmentVersion: 1,
    position: 0,
    dataType: 'markdown',
    rawContent: '',
    noteTitle: 'Note',
    createdAt: 0,
    isStatic: true,
    sourceId: 'collection:note',
    ...partial,
  } as BlockIndexRow;
}

// The corpus plane lives in the `block_index` store now — the seed importer
// materializes it. This fixture plays the importer: write corpus rows before
// the first query so the derived projections have data to read.
beforeAll(async () => {
  const db = await indexedDBService.getDB();
  const rows: BlockIndexRow[] = [
    corpusRow({ id: 'static:crossfit-girls/fran:front:1', noteId: 'crossfit-girls/fran', sourceId: 'collection:crossfit-girls/fran', dataType: 'frontmatter', rawContent: 'tags: [benchmark]' }),
    corpusRow({ id: 'static:crossfit-girls/fran:body:1', noteId: 'crossfit-girls/fran', sourceId: 'collection:crossfit-girls/fran', noteTitle: 'Fran' }),
    corpusRow({ id: 'static:feeds/dan-john/2026-01-12/day-01:body:1', noteId: 'feeds/dan-john/2026-01-12/day-01', sourceId: 'feed:feeds/dan-john/2026-01-12/day-01', noteTitle: 'Day 01' }),
  ];
  const tx = db.transaction('block_index', 'readwrite');
  for (const row of rows) await tx.store.put(row);
  await tx.done;
});

describe('queryService with the seeded corpus', () => {
  it('discovers collections when querying scope collections', async () => {
    const query = parseFindQuery('find:note in collections');
    const result = await queryService.runFind(query);
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes.every((n) => n.sourceId?.startsWith('collection:'))).toBe(true);
    expect(result.notes.some((n) => n.catalog === 'crossfit-girls')).toBe(true);
  });

  it('discovers feeds when querying scope feeds', async () => {
    const query = parseFindQuery('find:note in feeds');
    const result = await queryService.runFind(query);
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes.every((n) => n.sourceId?.startsWith('feed:'))).toBe(true);
  });

  it('discovers both collections and feeds when querying scope all', async () => {
    const query = parseFindQuery('find:note in all');
    const result = await queryService.runFind(query);
    expect(result.notes.length).toBeGreaterThan(0);
    expect(result.notes.some((n) => n.sourceId?.startsWith('collection:'))).toBe(true);
    expect(result.notes.some((n) => n.sourceId?.startsWith('feed:'))).toBe(true);
  });

  it('discovers blocks from the corpus when querying find:block in all', async () => {
    const query = parseFindQuery('find:block in all');
    const result = await queryService.runFind(query);
    expect(result.blocks.length).toBeGreaterThan(0);
    expect(result.blocks.some((b) => b.sourceId?.startsWith('collection:'))).toBe(true);
    expect(result.blocks.some((b) => b.sourceId?.startsWith('feed:'))).toBe(true);
  });
});
