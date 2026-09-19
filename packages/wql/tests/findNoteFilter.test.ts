import { describe, expect, it } from 'vitest';
import { QueryService } from '../src/QueryService';
import type { BlockIndexRow, Note } from '@bitcobblers/wod-wiki-core';
import { parseQuery, type ParsedFindQuery } from '../src/wql';

const testNotes: Note[] = [
  { id: 'note-1', title: 'Fran Note', createdAt: 1000, type: 'note' } as Note,
  { id: 'note-2', title: 'Cindy Note', createdAt: 2000, type: 'note' } as Note,
  { id: 'note-3', title: 'Murph Note', createdAt: 3000, type: 'note' } as Note,
];

const testBlocks: BlockIndexRow[] = [
  {
    id: 'note-1:seg-1:1',
    noteId: 'note-1',
    segmentId: 'seg-1',
    segmentVersion: 1,
    dataType: 'wod',
    blockContentId: 'bc-1',
    rawContent: 'Fran WOD',
    noteTitle: 'Fran Note',
    createdAt: 1000,
  },
  {
    id: 'note-2:seg-1:1',
    noteId: 'note-2',
    segmentId: 'seg-1',
    segmentVersion: 1,
    dataType: 'wod',
    blockContentId: 'bc-2',
    rawContent: 'Cindy WOD',
    noteTitle: 'Cindy Note',
    createdAt: 2000,
  },
];

function makeService() {
  return new QueryService({
    noteStore: { getAllNotes: async () => testNotes, getNoteIdsForTag: async () => new Set<string>() },
    blockStore: { getAllBlocks: async () => testBlocks },
  });
}

describe('note: filter in runFind and runFindBlock', () => {
  it('filters notes by exact note id', async () => {
    const service = makeService();
    const parsed = parseQuery('find:note{note:note-2}') as ParsedFindQuery;
    const result = await service.runFind(parsed);
    expect(result.notes.map(n => n.id)).toEqual(['note-2']);
  });

  it('filters notes with negated note id', async () => {
    const service = makeService();
    const parsed = parseQuery('find:note{!note:note-2}') as ParsedFindQuery;
    const result = await service.runFind(parsed);
    expect(result.notes.map(n => n.id)).toEqual(['note-1', 'note-3']);
  });

  it('filters notes with multiple OR values for note id', async () => {
    const service = makeService();
    const parsed = parseQuery('find:note{note:note-1|note-3}') as ParsedFindQuery;
    const result = await service.runFind(parsed);
    expect(result.notes.map(n => n.id)).toEqual(['note-1', 'note-3']);
  });

  it('filters blocks by parent noteId', async () => {
    const service = makeService();
    const parsed = parseQuery('find:block{note:note-1}') as ParsedFindQuery;
    const result = await service.runFind(parsed);
    expect(result.blocks.map(b => b.id)).toEqual(['note-1:seg-1:1']);
  });

  it('filters blocks with negated parent noteId', async () => {
    const service = makeService();
    const parsed = parseQuery('find:block{!note:note-1}') as ParsedFindQuery;
    const result = await service.runFind(parsed);
    expect(result.blocks.map(b => b.id)).toEqual(['note-2:seg-1:1']);
  });
});
