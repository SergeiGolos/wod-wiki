/**
 * source: filter tests (#813 slice 2) — the panel's `hide` toggle emits
 * `!source:<kind>`; the engine drops the matching kind from the result.
 *
 * The filter is applied post-scope to both `runFind` (Note[]) and
 * `runFindBlock` (BlockIndexRow[]). Journal notes have no `sourceId`;
 * static corpus rows have `sourceId: 'collection:…' | 'feed:…' | 'static:…'`.
 */
import { describe, expect, it } from 'bun:test';
import { QueryService } from './QueryService';
import { parseQuery } from './wql';
import type { BlockIndexRow, Note } from '@/types/storage';

const TS = 1_700_000_000_000;

function makeNote(id: string, sourceId: string | undefined): Note {
  return { id, title: id, createdAt: TS, type: 'note', sourceId } as Note;
}

function makeBlock(noteId: string, sourceId: string | undefined): BlockIndexRow {
  return {
    id: `${noteId}:s:1`,
    noteId,
    segmentId: 's',
    segmentVersion: 1,
    dataType: 'wod',
    rawContent: '',
    noteTitle: noteId,
    createdAt: TS,
    isStatic: !!sourceId,
    sourceId,
  };
}

const NOTES: Note[] = [
  makeNote('jrnl-1', undefined),
  makeNote('coll-1', 'collection:crossfit-girls'),
  makeNote('feed-1', 'feed:crossfit-programming/2026-01-12'),
];

const BLOCKS: BlockIndexRow[] = [
  makeBlock('jrnl-1', undefined),
  makeBlock('coll-1', 'collection:crossfit-girls'),
  makeBlock('feed-1', 'feed:crossfit-programming/2026-01-12'),
];

function makeService() {
  return new QueryService(
    { getFactsByMetric: async () => [], getFactsByTimeRange: async () => [], getNoteTagLabels: async () => [] },
    { getAllNotes: async () => NOTES, getNoteIdsForTag: async () => new Set<string>() },
    { getAllBlocks: async () => BLOCKS },
  );
}

describe('source: filter — runFind (Note[])', () => {
  it('keeps only journal notes when source:journal is set', async () => {
    const service = makeService();
    const parsed = parseQuery('find:note{source:journal}');
    const result = await service.runFind(parsed as Parameters<typeof service.runFind>[0]);
    expect(result.notes.map(n => n.id).sort()).toEqual(['jrnl-1']);
  });

  it('keeps only static collection notes when source:collection is set', async () => {
    const service = makeService();
    const parsed = parseQuery('find:note{source:collection}');
    const result = await service.runFind(parsed as Parameters<typeof service.runFind>[0]);
    expect(result.notes.map(n => n.id).sort()).toEqual(['coll-1']);
  });

  it('keeps only feed notes when source:feed is set', async () => {
    const service = makeService();
    const parsed = parseQuery('find:note{source:feed}');
    const result = await service.runFind(parsed as Parameters<typeof service.runFind>[0]);
    expect(result.notes.map(n => n.id).sort()).toEqual(['feed-1']);
  });

  it('drops feed notes when !source:feed is set', async () => {
    const service = makeService();
    const parsed = parseQuery('find:note{!source:feed}');
    const result = await service.runFind(parsed as Parameters<typeof service.runFind>[0]);
    expect(result.notes.map(n => n.id).sort()).toEqual(['coll-1', 'jrnl-1']);
  });
});

describe('source: filter — runFindBlock (BlockIndexRow[])', () => {
  it('keeps only feed blocks when source:feed is set', async () => {
    const service = makeService();
    const parsed = parseQuery('find:block{source:feed}');
    const result = await service.runFind(parsed as Parameters<typeof service.runFind>[0]);
    expect(result.blocks.map(b => b.noteId).sort()).toEqual(['feed-1']);
  });

  it('drops feed blocks when !source:feed is set', async () => {
    const service = makeService();
    const parsed = parseQuery('find:block{!source:feed}');
    const result = await service.runFind(parsed as Parameters<typeof service.runFind>[0]);
    expect(result.blocks.map(b => b.noteId).sort()).toEqual(['coll-1', 'jrnl-1']);
  });

  it('narrows by catalog prefix when source:collection:crossfit-girls is set', async () => {
    const service = makeService();
    const parsed = parseQuery('find:note{source:collection:crossfit-girls}');
    const result = await service.runFind(parsed as Parameters<typeof service.runFind>[0]);
    expect(result.notes.map(n => n.id).sort()).toEqual(['coll-1']);
  });

  it('filters notes by catalog key when catalog:crossfit-girls is set', async () => {
    const service = makeService();
    const parsed = parseQuery('find:note{catalog:crossfit-girls}');
    const result = await service.runFind(parsed as Parameters<typeof service.runFind>[0]);
    expect(result.notes.map(n => n.id).sort()).toEqual(['coll-1']);
  });

  it('filters blocks by catalog key when catalog:crossfit-programming is set', async () => {
    const service = makeService();
    const parsed = parseQuery('find:block{catalog:crossfit-programming}');
    const result = await service.runFind(parsed as Parameters<typeof service.runFind>[0]);
    expect(result.blocks.map(b => b.noteId).sort()).toEqual(['feed-1']);
  });
});
