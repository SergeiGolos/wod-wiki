import { describe, expect, it } from 'vitest';
import { QueryService } from '../src/QueryService';
import type { BlockIndexRow } from '@bitcobblers/wod-wiki-core';
import type { ParsedFindQuery } from '../src/wql';

function makeBlock(overrides: Partial<BlockIndexRow> = {}): BlockIndexRow {
  return {
    id: 'note-1:seg-1:1',
    noteId: 'note-1',
    segmentId: 'seg-1',
    segmentVersion: 1,
    dataType: 'wod',
    blockContentId: 'bc-abc12345',
    rawContent: '21-15-9\nThrusters 95lb\nPull-ups',
    noteTitle: 'Fran',
    createdAt: Date.now(),
    ...overrides,
  };
}

const blocks: BlockIndexRow[] = [
  makeBlock({ id: 'n1:s1:1', noteId: 'n1', noteTitle: 'Fran', rawContent: '21-15-9\nThrusters 95lb\nPull-ups', dataType: 'wod', blockContentId: 'bc-fran1234' }),
  makeBlock({ id: 'n2:s2:1', noteId: 'n2', noteTitle: 'Notes', rawContent: 'Remember to scale Fran if needed', dataType: 'markdown' }),
  makeBlock({ id: 'n3:s3:1', noteId: 'n3', noteTitle: 'Cindy', rawContent: 'AMRAP 20\n5 Pull-ups\n10 Push-ups\n15 Squats', dataType: 'wod', blockContentId: 'bc-cind5678' }),
];

function makeService() {
  return new QueryService(
    { getFactsByMetric: async () => [], getFactsByTimeRange: async () => [], getNoteTagLabels: async () => [] },
    { getAllNotes: async () => [], getNoteIdsForTag: async () => new Set<string>() },
    { getAllBlocks: async () => blocks },
  );
}

describe('find:block queries', () => {
  it('returns all blocks with empty filters', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = { raw: 'find:block{}', target: 'block', filters: [] };
    const result = await service.runFind(parsed);
    expect(result.blocks).toHaveLength(3);
    expect(result.stages.selected).toBe(3);
    expect(result.stages.matched).toBe(3);
  });

  it('filters by text substring over rawContent', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      raw: 'find:block{text:fran}',
      target: 'block',
      filters: [{ key: 'text', negate: false, values: [{ value: 'fran', wildcard: false }] }],
    };
    const result = await service.runFind(parsed);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].noteTitle).toBe('Notes');
  });

  it('filters by type (dataType)', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      raw: 'find:block{type:wod}',
      target: 'block',
      filters: [{ key: 'type', negate: false, values: [{ value: 'wod', wildcard: false }] }],
    };
    const result = await service.runFind(parsed);
    expect(result.blocks).toHaveLength(2);
    expect(result.blocks.every(b => b.dataType === 'wod')).toBe(true);
  });

  it('combines text and type filters (AND)', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = {
      raw: 'find:block{text:thrusters,type:wod}',
      target: 'block',
      filters: [
        { key: 'text', negate: false, values: [{ value: 'thrusters', wildcard: false }] },
        { key: 'type', negate: false, values: [{ value: 'wod', wildcard: false }] },
      ],
    };
    const result = await service.runFind(parsed);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].noteTitle).toBe('Fran');
  });

  it('returns notes as empty array for block queries', async () => {
    const service = makeService();
    const parsed: ParsedFindQuery = { raw: 'find:block{}', target: 'block', filters: [] };
    const result = await service.runFind(parsed);
    expect(result.notes).toEqual([]);
  });
});
