import { describe, expect, it } from 'vitest';
import { staticNotesFromBlocks } from '../src/static';
import type { BlockIndexRow } from '@wod-wiki/core';

function makeBlock(noteId: string, sourceId: string, overrides: Partial<BlockIndexRow> = {}): BlockIndexRow {
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
      makeBlock('ZombieFit-org-2010-Jan/wod-120109', 'collection:ZombieFit-org-2010-Jan/wod-120109'),
    ];
    const notes = staticNotesFromBlocks(blocks);
    expect(notes.map(n => n.catalog).sort()).toEqual(['ZombieFit-org-2010-Jan', 'crossfit-girls']);
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
});
