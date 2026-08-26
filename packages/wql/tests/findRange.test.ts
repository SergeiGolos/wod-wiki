import { describe, expect, it } from 'vitest';
import { QueryService } from '../src/QueryService';
import type { BlockIndexRow, Note } from '@bitcobblers/wod-wiki-core';
import type { ParsedFindQuery } from '../src/wql';

const TS_BASE = 1_700_000_000_000;
const DAY = 86_400_000;

function makeNote(id: string, createdAt: number): Note {
  return { id, title: id, createdAt, type: 'note' } as Note;
}

function makeBlock(noteId: string, createdAt: number): BlockIndexRow {
  return {
    id: `b:${noteId}`,
    noteId,
    segmentId: 's',
    segmentVersion: 1,
    position: 0,
    dataType: 'wod',
    rawContent: '',
    noteTitle: noteId,
    createdAt,
  } as BlockIndexRow;
}

const T0 = TS_BASE;
const T_OLD = TS_BASE - 30 * DAY;
const T_NEW = TS_BASE + DAY;

const NOTES: Note[] = [
  makeNote('old', T_OLD),
  makeNote('mid', T0),
  makeNote('new', T_NEW),
];
const BLOCKS: BlockIndexRow[] = NOTES.map(n => makeBlock(n.id, n.createdAt));

function makeService() {
  return new QueryService(
    { getFactsByMetric: async () => [], getFactsByTimeRange: async () => [], getNoteTagLabels: async () => [] },
    { getAllNotes: async () => NOTES, getNoteIdsForTag: async () => new Set<string>() },
    { getAllBlocks: async () => BLOCKS },
  );
}

describe('range parameter — runFind', () => {
  it('drops notes outside the [start, end] range', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      family: 'find', raw: 'find:note', target: 'note', filters: [] };
    const result = await service.runFind(parsed, { range: { start: T0, end: T0 } });
    expect(result.notes.map(n => n.id)).toEqual(['mid']);
  });
  it('is inclusive at the boundary (start === note.createdAt)', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      family: 'find', raw: 'find:note', target: 'note', filters: [] };
    const result = await service.runFind(parsed, { range: { start: T0, end: T_NEW } });
    expect(result.notes.map(n => n.id).sort()).toEqual(['mid', 'new']);
  });

  it('overrides the WQL\'s `last 8w` clause when both are set', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      family: 'find',
      raw: 'find:note last 8w',
      target: 'note',
      filters: [],
      window: { kind: 'relative', size: 8, unit: 'w' },
    };
    const result = await service.runFind(parsed, { range: { start: T_OLD, end: T_OLD } });
    expect(result.notes.map(n => n.id)).toEqual(['old']);
  });

  it('omitting the range leaves the WQL `last` clause in effect', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      family: 'find',
      raw: 'find:note last 8w',
      target: 'note',
      filters: [],
      window: { kind: 'relative', size: 8, unit: 'w' },
    };
    const result = await service.runFind(parsed);
    expect(result.notes).toEqual([]);
  });
});

describe('range parameter — runFindBlock', () => {
  it('filters blocks by the range parameter', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      family: 'find', raw: 'find:block', target: 'block', filters: [] };
    const result = await service.runFind(parsed, { range: { start: T0, end: T0 } });
    expect(result.blocks.map(b => b.noteId)).toEqual(['mid']);
  });
});
