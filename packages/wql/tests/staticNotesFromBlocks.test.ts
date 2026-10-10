import { describe, expect, it } from 'vitest';
import { staticNotesFromBlocks } from '../src/static';
import type { BlockIndexRow } from '@bitcobblers/wod-wiki-core';

function makeBlock(noteId: string, sourceId: string | undefined, overrides: Partial<BlockIndexRow> = {}): BlockIndexRow {
  return {
    id: `${noteId}:s:1`,
    noteId,
    segmentId: 's',
    segmentVersion: 1,
    dataType: 'wod',
    rawContent: '',
    noteTitle: noteId,
    createdAt: 1_700_000_000_000,
    isStatic: true,
    sourceId,
    ...overrides,
  };
}

describe('staticNotesFromBlocks', () => {
  it('returns one Note per distinct noteId', () => {
    const blocks = [
      makeBlock('crossfit-girls/fran', 'collection:crossfit-girls/fran'),
      makeBlock('crossfit-girls/cindy', 'collection:crossfit-girls/cindy'),
      makeBlock('crossfit-girls/fran', 'collection:crossfit-girls/fran', { segmentId: 's2' }),
    ];
    const notes = staticNotesFromBlocks(blocks);
    expect(notes).toHaveLength(2);
    expect(notes.map(n => n.id).sort()).toEqual(['crossfit-girls/cindy', 'crossfit-girls/fran']);
  });

  it('sets catalog to the first path segment for collections', () => {
    const blocks = [
      makeBlock('crossfit-girls/fran', 'collection:crossfit-girls/fran'),
      makeBlock('zombiefit/2009-12-01', 'collection:zombiefit/2009-12-01'),
    ];
    const notes = staticNotesFromBlocks(blocks);
    expect(notes.map(n => n.catalog).sort()).toEqual(['crossfit-girls', 'zombiefit']);
  });

  it('strips the `feeds/` wrapper to extract the catalog dir for feed rows', () => {
    const blocks = [
      makeBlock('feeds/crossfit-programming/2026-01-12/wednesday-hero', 'feed:feeds/crossfit-programming/2026-01-12/wednesday-hero'),
    ];
    const notes = staticNotesFromBlocks(blocks);
    expect(notes).toHaveLength(1);
    expect(notes[0].catalog).toBe('crossfit-programming');
  });

  it('preserves sourceId from the block', () => {
    const blocks = [makeBlock('crossfit-girls/fran', 'collection:crossfit-girls/fran')];
    const notes = staticNotesFromBlocks(blocks);
    expect(notes[0].sourceId).toBe('collection:crossfit-girls/fran');
  });

  it('routes UUID-keyed rows by sourceId — members stay notes, never UUID catalogs', () => {
    const blocks = [
      makeBlock('0f0e0d0c-0b0a-4998-8765-4321fedcba98', 'collection:crossfit-girls/fran'),
      makeBlock('1a2b3c4d-5e6f-4a1b-8c9d-0e1f2a3b4c5d', 'collection:crossfit-girls'),
      makeBlock('9f8e7d6c-5b4a-4938-8271-60594e3d2c1b', '', { sourceId: undefined }),
    ];
    const notes = staticNotesFromBlocks(blocks);
    expect(notes[0].type).toBe('note');
    expect(notes[0].catalog).toBe('crossfit-girls');
    expect(notes[0].sourceId).toBe('collection:crossfit-girls/fran');
    expect(notes[1].type).toBe('feed');
    expect(notes[1].catalog).toBe('crossfit-girls');
    expect(notes[1].sourceId).toBe('page:collection:crossfit-girls');
    expect(notes[2].type).toBe('note');
    expect(notes[2].catalog).toBeUndefined();
    expect(notes[2].sourceId).toBeUndefined();
  });
});
