import { describe, expect, it } from 'vitest';
import { QueryService } from '../src/QueryService';
import { parseQuery, type ParsedFindQuery } from '../src/wql';
import type { BlockIndexRow, Note } from '@bitcobblers/wod-wiki-core';

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
  makeNote('guide-1', 'guides:guide/syntax/basics'),
  { ...makeNote('pg-1', 'playground'), type: 'playground' },
  { ...makeNote('pg-legacy', undefined), id: 'pg-legacy', type: 'playground' },
  { ...makeNote('page-1', 'collection:crossfit-girls'), type: 'page' },
];

const BLOCKS: BlockIndexRow[] = [
  makeBlock('jrnl-1', undefined),
  makeBlock('coll-1', 'collection:crossfit-girls'),
  makeBlock('feed-1', 'feed:crossfit-programming/2026-01-12'),
  makeBlock('guide-1', 'guides:guide/syntax/basics'),
  makeBlock('pg-1', 'playground'),
  makeBlock('pg-legacy', undefined),
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
    const result = await service.runFind(parseQuery(':note{source:journal} in all') as ParsedFindQuery);
    expect(result.notes.map(n => n.id)).toEqual(['jrnl-1']);
  });

  it('keeps only static collection notes when source:collection is set', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':note{source:collection} in all') as ParsedFindQuery);
    expect(result.notes.map(n => n.id)).toEqual(['coll-1']);
  });

  it('source:feed is no longer a supported source choice — feed notes never match', async () => {
    const service = makeService();
    // Parse may reject outright or execute to an empty match; either way the
    // retired feeds surface is not queryable.
    const result = await service.runFind(parseQuery(':note{source:feed} in all') as ParsedFindQuery);
    expect(result.notes.map(n => n.id)).toEqual([]);
  });

  it(':note default scope excludes feeds and guides', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':note') as ParsedFindQuery);
    expect(result.notes.map(n => n.id).sort()).toEqual(['coll-1', 'jrnl-1', 'pg-1', 'pg-legacy']);
  });

  it('keeps only guide notes when source:guides is set', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':note{source:guides} in all') as ParsedFindQuery);
    expect(result.notes.map(n => n.id)).toEqual(['guide-1']);
  });

  it('parse-validates source:guides as a known source value', () => {
    const parsed = parseQuery(':note{source:guides}');
    expect(parsed.error).toBeUndefined();
  });

  it('in all spans every WQL-addressable source kind — feeds stay excised', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':note in all') as ParsedFindQuery);
    expect(result.notes.map(n => n.id).sort()).toEqual(['coll-1', 'guide-1', 'jrnl-1', 'pg-1', 'pg-legacy']);
  });

  it('source:all fails to parse with a hint', () => {
    const parsed = parseQuery(':note{source:all}');
    expect(parsed.error).toContain('source:all is retired');
  });

  it('keeps only playground entries when source:playground is set (sourceId convention and legacy type)', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':note{source:playground} in all') as ParsedFindQuery);
    expect(result.notes.map(n => n.id).sort()).toEqual(['pg-1', 'pg-legacy']);
  });

  it('parse-validates source:playground as a known source value', () => {
    const parsed = parseQuery(':note{source:playground}');
    expect(parsed.error).toBeUndefined();
  });

  it(':page fails to parse with a hint', () => {
    const parsed = parseQuery(':page');
    expect(parsed.error).toBeTruthy();
  });

  it(':note{type:page} targets notes with type page', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':note{type:page}') as ParsedFindQuery);
    expect(result.notes.map(n => n.id)).toEqual(['page-1']);
  });

  it(':note{page:true} targets notes with type page', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':note{page:true}') as ParsedFindQuery);
    expect(result.notes.map(n => n.id)).toEqual(['page-1']);
  });

  it('source:page fails to parse with a hint', () => {
    const parsed = parseQuery(':note{source:page}');
    expect(parsed.error).toContain('source:page is retired');
  });
});

describe('source: filter — runFindBlock (BlockIndexRow[])', () => {
  it('keeps only journal blocks when source:journal is set', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':block{source:journal} in all') as ParsedFindQuery);
    expect(result.blocks.map(b => b.noteId)).toEqual(['jrnl-1']);
  });

  it('keeps only collection blocks when source:collection is set', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':block{source:collection} in all') as ParsedFindQuery);
    expect(result.blocks.map(b => b.noteId)).toEqual(['coll-1']);
  });

  it('source:feed is no longer a supported source choice — feed blocks never match', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':block{source:feed} in all') as ParsedFindQuery);
    expect(result.blocks.map(b => b.noteId)).toEqual([]);
  });

  it('supports exact catalog-prefixed sourceId matching', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':block{source:collection:crossfit-girls} in all') as ParsedFindQuery);
    expect(result.blocks.map(b => b.noteId)).toEqual(['coll-1']);
  });

  it('default (no source filter) returns blocks from the allowed source kinds only — feeds excised', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':block') as ParsedFindQuery);
    expect(result.blocks.map(b => b.noteId).sort()).toEqual(['coll-1', 'guide-1', 'jrnl-1', 'pg-1', 'pg-legacy']);
  });

  it('keeps only playground blocks (denormalized sourceId) when source:playground is set', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':block{source:playground} in all') as ParsedFindQuery);
    expect(result.blocks.map(b => b.noteId)).toEqual(['pg-1']);
  });

  it('legacy in journal maps to source:journal correctly at runtime', async () => {
    const service = makeService();
    const result = await service.runFind(parseQuery(':block in journal') as ParsedFindQuery);
    expect(result.blocks.map(b => b.noteId)).toEqual(['jrnl-1']);
  });
});
