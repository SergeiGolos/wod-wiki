/**
 * range parameter tests (#813 slice 3) — the WQL Time Range Parameter
 * (a structured `{ start, end }` object) is passed alongside the WQL to
 * `runFind` and `runFindBlock`, and **overrides** the WQL's `last <n>w|d`
 * clause. The `last` clause is preserved in the WQL string for parser
 * round-trippability; the parameter is the truth source for execution.
 */
import { describe, expect, it } from 'bun:test';
import { QueryService } from './QueryService';
import type { BlockIndexRow, Note } from '@/types/storage';
import type { ParsedFindQuery } from './wql';

const TS_BASE = 1_700_000_000_000;
const DAY = 86_400_000;

function makeNote(id: string, createdAt: number): Note {
  return { id, title: id, createdAt, type: 'note' } as Note;
}

function makeBlock(noteId: string, createdAt: number): BlockIndexRow {
  return {
    id: `${noteId}:s:1`,
    noteId,
    segmentId: 's',
    segmentVersion: 1,
    dataType: 'wod',
    rawContent: '',
    noteTitle: noteId,
    createdAt,
  };
}

const T0 = TS_BASE;
const T_OLD = TS_BASE - 30 * DAY; // 30d before T0
const T_NEW = TS_BASE + DAY; // 1d after T0

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
    const parsed: ParsedFindQuery = { raw: 'find:note{}', target: 'note', filters: [] };
    const result = await service.runFind(parsed, { range: { start: T0, end: T0 } });
    expect(result.notes.map(n => n.id)).toEqual(['mid']);
  });

  it('is inclusive at the boundary (start === note.createdAt)', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = { raw: 'find:note{}', target: 'note', filters: [] };
    const result = await service.runFind(parsed, { range: { start: T0, end: T_NEW } });
    expect(result.notes.map(n => n.id).sort()).toEqual(['mid', 'new']);
  });

  it('overrides the WQL\'s `last 8w` clause when both are set', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      raw: 'find:note in journal last 8w',
      target: 'note',
      filters: [],
      last: { size: 8, unit: 'w' },
    };
    // Without the range param, `last 8w` would have included everything (8w > 30d).
    // With the range clamped to [T0, T0], only `mid` is in the window.
    const result = await service.runFind(parsed, { range: { start: T0, end: T0 } });
    expect(result.notes.map(n => n.id)).toEqual(['mid']);
  });

  it('omitting the range leaves the WQL `last` clause in effect', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      raw: 'find:note in journal last 8w',
      target: 'note',
      filters: [],
      last: { size: 8, unit: 'w' },
    };
    const result = await service.runFind(parsed);
    // 8w = 56d; the fixtures are dated 2023-11 — well before `Date.now() - 56d`,
    // so the WQL `last` clause correctly drops them all.
    expect(result.notes).toHaveLength(0);
  });
});

describe('range parameter — runFindBlock', () => {
  it('drops blocks outside the range', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = { raw: 'find:block{}', target: 'block', filters: [] };
    const result = await service.runFind(parsed, { range: { start: T0, end: T0 } });
    expect(result.blocks.map(b => b.noteId)).toEqual(['mid']);
  });
});
