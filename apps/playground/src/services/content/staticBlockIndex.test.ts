/**
 * Pure derivations over the static block-index corpus (issue #853):
 *   - feedDateToCreatedAt: feed path date keys → createdAt ms, 0 when
 *     malformed (undated rows are excluded from dated windows).
 *   - staticTagIndexFromBlocks: tag → noteIds from frontmatter rows — the
 *     mapping `staticNoteStore.getNoteIdsForTag` answers `tags:` clauses with.
 */
import { describe, expect, it } from 'bun:test';
import type { BlockIndexRow } from '@/types/storage';
import {
  feedDateToCreatedAt,
  staticTagIndexFromBlocks,
  staticNotesFromBlocks,
  staticNoteStore,
  staticBlockStore,
} from './staticBlockIndex';

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

describe('staticNotesFromBlocks', () => {
  it('synthesizes distinct Notes with catalog from block rows', () => {
    const blocks = [
      blockRow({
        noteId: 'crossfit-girls/fran',
        noteTitle: 'Fran',
        sourceId: 'collection:crossfit-girls/fran',
        createdAt: 0,
      }),
      blockRow({
        noteId: 'crossfit-girls/fran',
        noteTitle: 'Fran',
        sourceId: 'collection:crossfit-girls/fran',
        segmentId: 'sec-2',
      }),
      blockRow({
        noteId: 'feeds/dan-john/2026-01-12/day-01',
        noteTitle: 'Day 01',
        sourceId: 'feed:feeds/dan-john/2026-01-12/day-01',
        createdAt: 1768176000000,
      }),
    ];
    const notes = staticNotesFromBlocks(blocks);
    expect(notes.length).toBe(2);
    expect(notes[0]).toEqual({
      id: 'crossfit-girls/fran',
      title: 'Fran',
      createdAt: 0,
      type: 'note',
      sourceId: 'collection:crossfit-girls/fran',
      catalog: 'crossfit-girls',
    });
    expect(notes[1]).toEqual({
      id: 'feeds/dan-john/2026-01-12/day-01',
      title: 'Day 01',
      createdAt: 1768176000000,
      type: 'note',
      sourceId: 'feed:feeds/dan-john/2026-01-12/day-01',
      catalog: 'dan-john',
    });
  });
});

describe('static stores', () => {
  it('loads static notes and blocks from generated static corpus', async () => {
    const notes = await staticNoteStore.getAllNotes();
    const blocks = await staticBlockStore.getAllBlocks();
    expect(notes.length).toBeGreaterThan(0);
    expect(blocks.length).toBeGreaterThan(0);
    expect(notes.some(n => n.sourceId?.startsWith('collection:'))).toBe(true);
    expect(notes.some(n => n.sourceId?.startsWith('feed:'))).toBe(true);
  });
});
