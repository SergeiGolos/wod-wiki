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
    id: `b:${noteId}`, noteId, segmentId: 's', segmentVersion: 1, position: 0,
    dataType: 'wod', rawContent: '', noteTitle: noteId, createdAt,
  } as BlockIndexRow;
}

const T0 = TS_BASE;
const T_RECENT = TS_BASE - 5 * DAY;
const T_OLD = TS_BASE - 30 * DAY;

const NOTES: Note[] = [
  makeNote('old', T_OLD),
  makeNote('recent', T_RECENT),
  makeNote('newest', T0),
];
const BLOCKS: BlockIndexRow[] = NOTES.map(n => makeBlock(n.id, n.createdAt));

function makeService(notes: Note[] = NOTES, blocks: BlockIndexRow[] = BLOCKS) {
  return new QueryService(
    { getFactsByMetric: async () => [], getFactsByTimeRange: async () => [], getNoteTagLabels: async () => [] },
    { getAllNotes: async () => notes, getNoteIdsForTag: async () => new Set<string>() },
    { getAllBlocks: async () => blocks },
  );
}

const LAST_2W: ParsedFindQuery = {
  family: 'find',
  raw: 'find:note{source:journal} last 2w', target: 'note',
  filters: [{ key: 'source', negate: false, values: [{ value: 'journal', wildcard: false }] }],
  window: { kind: 'relative', size: 2, unit: 'w' },
};

describe("wall-clock window anchoring (#1009)", () => {
  it('windows against anchorNow timestamp', async () => {
    const service = makeService();
    const result = await service.runFind(LAST_2W, { anchorNow: T0 });
    expect(result.notes.map(n => n.id).sort()).toEqual(['newest', 'recent']);
  });

  it('default (no anchorNow) checks against wall-clock now', async () => {
    const service = makeService();
    const result = await service.runFind(LAST_2W);
    expect(result.notes).toEqual([]);
  });

  it('explicit range overrides relative window', async () => {
    const service = makeService();
    const result = await service.runFind(LAST_2W, {
      range: { start: T_OLD, end: T_OLD },
    });
    expect(result.notes.map(n => n.id)).toEqual(['old']);
  });
});
