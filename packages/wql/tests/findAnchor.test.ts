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
  raw: 'find:note in journal last 2w', target: 'note', filters: [], scope: 'journal',
  last: { size: 2, unit: 'w' },
};

describe("anchor: 'latest-activity' — runFind", () => {
  it('windows against the newest entry, keeping recent-but-old-in-wall-clock notes', async () => {
    const service = makeService();
    const result = await service.runFind(LAST_2W, { anchor: 'latest-activity' });
    expect(result.notes.map(n => n.id).sort()).toEqual(['newest', 'recent']);
  });

  it('default (no anchor option) keeps wall-clock semantics', async () => {
    const service = makeService();
    const result = await service.runFind(LAST_2W);
    expect(result.notes).toEqual([]);
  });

  it('explicit range overrides the anchor', async () => {
    const service = makeService();
    const result = await service.runFind(LAST_2W, {
      anchor: 'latest-activity',
      range: { start: T_OLD, end: T_OLD },
    });
    expect(result.notes.map(n => n.id)).toEqual(['old']);
  });

  it('an all-undated set anchors at 0 and passes every note', async () => {
    const undated = [makeNote('a', 0), makeNote('b', 0)];
    const service = makeService(undated, []);
    const result = await service.runFind(LAST_2W, { anchor: 'latest-activity' });
    expect(result.notes.map(n => n.id).sort()).toEqual(['a', 'b']);
  });
});

describe("anchor: 'latest-activity' — runFindBlock", () => {
  it('windows blocks against the newest block', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = { ...LAST_2W, raw: 'find:block in journal last 2w', target: 'block' };
    const result = await service.runFind(parsed, { anchor: 'latest-activity' });
    expect(result.blocks.map(b => b.noteId).sort()).toEqual(['newest', 'recent']);
  });
});
