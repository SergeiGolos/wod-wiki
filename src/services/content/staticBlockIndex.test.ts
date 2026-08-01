/**
 * Pure derivations over the static block-index corpus (issue #853):
 *   - feedDateToCreatedAt: feed path date keys → createdAt ms, 0 when
 *     malformed (undated rows are excluded from dated windows).
 *   - staticTagIndexFromBlocks: tag → noteIds from frontmatter rows — the
 *     mapping `staticNoteStore.getNoteIdsForTag` answers `tags:` clauses with.
 */
import { describe, expect, it } from 'bun:test';
import type { BlockIndexRow } from '@/types/storage';
import { feedDateToCreatedAt, staticTagIndexFromBlocks } from './staticBlockIndex';

function blockRow(partial: Partial<BlockIndexRow>): BlockIndexRow {
  return {
    id: 'static:note:seg:1',
    noteId: 'feeds/feed-a/2026-01-12/note',
    segmentId: 'seg',
    segmentVersion: 1,
    position: 0,
    dataType: 'markdown',
    rawContent: '',
    noteTitle: 'Note',
    createdAt: 0,
    isStatic: true,
    ...partial,
  } as BlockIndexRow;
}

describe('feedDateToCreatedAt', () => {
  it('parses a yyyy-mm-dd key to UTC midnight', () => {
    expect(feedDateToCreatedAt('2026-01-12')).toBe(Date.parse('2026-01-12T00:00:00Z'));
  });

  it('returns 0 for malformed keys', () => {
    expect(feedDateToCreatedAt('jan-12')).toBe(0);
    expect(feedDateToCreatedAt('2026-1-2')).toBe(0);
    expect(feedDateToCreatedAt('')).toBe(0);
  });

  it('returns 0 for impossible dates', () => {
    expect(feedDateToCreatedAt('2026-13-01')).toBe(0);
  });
});

describe('staticTagIndexFromBlocks', () => {
  it('maps frontmatter tags to their note ids, both YAML forms', () => {
    const blocks = [
      blockRow({ noteId: 'feeds/feed-a/2026-01-12/note-a', dataType: 'frontmatter', rawContent: 'tags:\n  - strength\n  - conditioning' }),
      blockRow({ noteId: 'crossfit-girls/fran', dataType: 'frontmatter', rawContent: 'tags: [strength, benchmark]' }),
      blockRow({ noteId: 'crossfit-girls/fran', dataType: 'wod', rawContent: 'tags: not-frontmatter' }),
      blockRow({ noteId: 'feeds/feed-a/2026-01-13/note-b', dataType: 'frontmatter', rawContent: 'met: 7.0' }),
    ];
    const index = staticTagIndexFromBlocks(blocks);
    expect([...(index.get('strength') ?? [])].sort()).toEqual([
      'crossfit-girls/fran',
      'feeds/feed-a/2026-01-12/note-a',
    ]);
    expect(index.get('conditioning')).toEqual(new Set(['feeds/feed-a/2026-01-12/note-a']));
    expect(index.get('benchmark')).toEqual(new Set(['crossfit-girls/fran']));
    expect(index.get('not-frontmatter')).toBeUndefined();
    expect(index.get('met')).toBeUndefined();
  });

  it('returns an empty index when no frontmatter rows carry tags', () => {
    expect(staticTagIndexFromBlocks([blockRow({})]).size).toBe(0);
  });
});
