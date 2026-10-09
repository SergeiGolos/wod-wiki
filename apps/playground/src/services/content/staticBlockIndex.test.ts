/**
 * Pure derivations over the static block-index corpus (issue #853):
 *   - feedDateToCreatedAt: feed path date keys → createdAt ms, 0 when
 *     malformed (undated rows are excluded from dated windows).
 *   - staticTagIndexFromBlocks: tag → noteIds from frontmatter rows — the
 *     mapping `staticNoteStore.getNoteIdsForTag` answers `tags:` clauses with.
 */
import { describe, expect, it } from 'bun:test';
import type { BlockIndexRow } from '@/types/storage';

// The corpus plane reads the shared `block_index` store — mock the service
// before importing the module under test.
import { storageService } from '@/services/storage';
const blockRows: BlockIndexRow[] = [];
storageService.getAllBlockIndex = async () => blockRows;
storageService.getAllTags = async () => [];
import {
  feedDateToCreatedAt,
  invalidateCorpusBlocks,
  staticTagIndexFromBlocks,
  staticNotesFromBlocks,
  staticNoteStore,
} from './staticBlockIndex';
import { getAppEffortRegistry } from '@/services/effortRegistry';
import { invalidateSuggestions, loadSuggestions } from '@bitcobblers/wod-wiki-ui';
import type { IEffort } from '@bitcobblers/wod-wiki-lang';

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
      blockRow({
        noteId: 'crossfit-girls',
        noteTitle: 'Crossfit Girls',
        sourceId: 'collection:crossfit-girls',
        createdAt: 0,
      }),
    ];
    const notes = staticNotesFromBlocks(blocks);
    expect(notes.length).toBe(3);
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
    expect(notes[2]).toEqual({
      id: 'crossfit-girls',
      title: 'Crossfit Girls',
      createdAt: 0,
      type: 'collection',
      sourceId: 'page:collection:crossfit-girls',
      catalog: 'crossfit-girls',
    });
  });

  it('routes UUID-keyed rows by sourceId — members stay notes, never UUID catalogs', () => {
    const blocks = [
      blockRow({
        noteId: '0f0e0d0c-0b0a-4998-8765-4321fedcba98',
        noteTitle: 'Fran',
        sourceId: 'collection:crossfit-girls/fran',
        dataType: 'frontmatter',
        rawContent: 'tags: [benchmark]',
      }),
      blockRow({
        noteId: '1a2b3c4d-5e6f-4a1b-8c9d-0e1f2a3b4c5d',
        noteTitle: 'Crossfit Girls',
        sourceId: 'page:collection:crossfit-girls',
      }),
      blockRow({ noteId: '9f8e7d6c-5b4a-4938-8271-60594e3d2c1b', noteTitle: 'Orphan' }),
    ];
    const notes = staticNotesFromBlocks(blocks);
    expect(notes[0]).toEqual({
      id: '0f0e0d0c-0b0a-4998-8765-4321fedcba98',
      title: 'Fran',
      createdAt: 0,
      type: 'note',
      sourceId: 'collection:crossfit-girls/fran',
      catalog: 'crossfit-girls',
      tags: ['benchmark'],
    });
    expect(notes[1]).toEqual({
      id: '1a2b3c4d-5e6f-4a1b-8c9d-0e1f2a3b4c5d',
      title: 'Crossfit Girls',
      createdAt: 0,
      type: 'collection',
      sourceId: 'page:collection:crossfit-girls',
      catalog: 'crossfit-girls',
    });
    expect(notes[2].id).toBe('9f8e7d6c-5b4a-4938-8271-60594e3d2c1b');
    expect(notes[2].type).toBe('note');
    expect(notes[2].sourceId).toBeUndefined();
    expect(notes[2].catalog).toBeUndefined();
    expect(notes[2].sourcePath).toBeUndefined();
  });
});

describe('static stores (IndexedDB-backed)', () => {
  it('derives corpus projections from isStatic rows only — user rows are excluded', async () => {
    blockRows.length = 0;
    blockRows.push(
      blockRow({ id: 'user-row', noteId: 'user-note', segmentId: 'u1', isStatic: undefined, sourceId: undefined }),
      blockRow({ noteId: 'crossfit-girls/fran', sourceId: 'collection:crossfit-girls/fran' }),
      blockRow({ noteId: 'feeds/dan-john/2026-01-12/day-01', sourceId: 'feed:feeds/dan-john/2026-01-12/day-01' }),
    );
    const notes = await staticNoteStore.getAllNotes();
    expect(notes.map((n) => n.id)).toEqual([
      'crossfit-girls/fran',
      'feeds/dan-john/2026-01-12/day-01',
    ]);
    expect(notes.every((n) => n.sourceId?.startsWith('collection:') || n.sourceId?.startsWith('feed:'))).toBe(true);
  });
});

describe('composer suggestion bindings (vault/canonical normalization)', () => {
  it('ranks vault values first, canonical spelling wins enum keys, effort value is the registry slug', async () => {
    blockRows.length = 0;
    blockRows.push(blockRow({ dataType: 'wod' }));
    invalidateCorpusBlocks();
    storageService.getAllEfforts = async () => [];
    await getAppEffortRegistry().loadBundled([
      {
        slug: 'air-squat',
        label: 'Air Squat',
        baseAttributes: { met: 3, discipline: 'Strength', intensityTier: 'MODERATE' },
        registrySource: 'user',
      },
      {
        slug: 'Rowing-Intervals',
        label: 'Rowing Intervals',
        baseAttributes: { met: 7, discipline: 'rowing', intensityTier: 'high' },
        registrySource: 'bundled',
      },
    ] as IEffort[]);
    invalidateSuggestions();

    // Vault disciplines first (case-deduped to canonical spelling), then the
    // canonical static vocabulary — no bogus crossfit/climbing/yoga entries.
    expect((await loadSuggestions('discipline')).map((item) => item.value)).toEqual([
      'strength',
      'rowing',
      'bodyweight',
      'cycling',
      'gymnastics',
      'kettlebell',
      'recovery',
      'running',
      'swimming',
      'walking',
    ]);
    expect((await loadSuggestions('intensity')).map((item) => item.value)).toEqual(['moderate', 'high', 'low']);

    const efforts = await loadSuggestions('effort');
    expect(efforts.map((item) => item.value)).toEqual(['air-squat', 'Rowing-Intervals']);
    expect(efforts.map((item) => item.label)).toEqual(['Air Squat', 'Rowing Intervals']);

    expect((await loadSuggestions('type')).map((item) => item.value)).toEqual(['wod', 'movement', 'workout']);
  });
});
