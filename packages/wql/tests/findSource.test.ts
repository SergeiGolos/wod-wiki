import { describe, expect, it } from 'vitest';
import { QueryService } from '../src/QueryService';
import { parseQuery, type ParsedFindQuery } from '../src/wql';
import type { BlockIndexRow, Note } from '@wod-wiki/core';

const TS = 1_700_000_000_000;

function makeNote(id: string, sourceId: string | undefined): Note {
  return { id, title: id, createdAt: TS, type: 'note', sourceId } as Note;
}

function makeBlock(noteId: string, sourceId: string | undefined): BlockIndexRow {
  return {
    id: `b:${noteId}`,
    noteId,
    segmentId: 's',
    segmentVersion: 1,
    position: 0,
    dataType: 'wod',
    rawContent: '',
    noteTitle: noteId,
    createdAt: TS,
    sourceId,
  } as BlockIndexRow;
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
    const result = await service.runFind(parseQuery('find:note{source:journal} in all') as ParsedFindQuery);
    expect(result.notes.map(n => n.id)).toEqual(['jrnl-1']);
  });

  it('keeps only static collection notes when source:collection is set', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery('find:note{source:collection} in all') as ParsedFindQuery);
    expect(result.notes.map(n => n.id)).toEqual(['coll-1']);
  });

  it('keeps only feed notes when source:feed is set', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery('find:note{source:feed} in all') as ParsedFindQuery);
    expect(result.notes.map(n => n.id)).toEqual(['feed-1']);
  });

  it('drops feed notes when !source:feed is set', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery('find:note{!source:feed} in all') as ParsedFindQuery);
    expect(result.notes.map(n => n.id).sort()).toEqual(['coll-1', 'jrnl-1']);
  });
});

describe('source: filter — runFindBlock (BlockIndexRow[])', () => {
  it('keeps only journal blocks when source:journal is set', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery('find:block{source:journal} in all') as ParsedFindQuery);
    expect(result.blocks.map(b => b.noteId)).toEqual(['jrnl-1']);
  });

  it('keeps only collection blocks when source:collection is set', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery('find:block{source:collection} in all') as ParsedFindQuery);
    expect(result.blocks.map(b => b.noteId)).toEqual(['coll-1']);
  });

  it('keeps only feed blocks when source:feed is set', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery('find:block{source:feed} in all') as ParsedFindQuery);
    expect(result.blocks.map(b => b.noteId)).toEqual(['feed-1']);
  });

  it('drops feed blocks when !source:feed is set', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery('find:block{!source:feed} in all') as ParsedFindQuery);
    expect(result.blocks.map(b => b.noteId).sort()).toEqual(['coll-1', 'jrnl-1']);
  });

  it('supports exact catalog-prefixed sourceId matching', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery('find:block{source:collection:crossfit-girls} in all') as ParsedFindQuery);
    expect(result.blocks.map(b => b.noteId)).toEqual(['coll-1']);
  });
});
