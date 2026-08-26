/**
 * History-lineage regression tests (#705-class duplication bugs, surfaced by
 * the widget-edit e2e):
 *  1. updateEntry's retire sweep must retire even foreign segment rows
 *     (e.g. a whole-document segment written by a seed/import) — otherwise
 *     reconstruction joins stale content into the document.
 *  2. getEntry / getLatestSegmentsForNote must exclude retired (isHistory)
 *     rows — reads previously ignored the flag and duplicated every edit.
 */
import { describe, expect, it, mock } from 'bun:test';
import type { Note, NoteSegment } from '../../../types/storage';

// Replicates the e2e seedNote shape: one whole-document segment 'seg-0'.
const notes: Note[] = [];
const savedSegments: NoteSegment[] = [];

mock.module('../../db/IndexedDBService', () => ({
  indexedDBService: {
    getNote: async (id: string) => notes.find((n) => n.id === id),
    getAllNotes: async () => notes,
    getTagsForNote: async () => [],
    getPage: async () => undefined,
    getAllSegments: async () => [],
    getResultsForNote: async () => [],
    saveNote: async (note: Note) => note.id,
    saveSegment: async (segment: NoteSegment) => {
      const index = savedSegments.findIndex(
        (s) => s.id === segment.id && s.version === segment.version,
      );
      if (index >= 0) savedSegments[index] = segment;
      else savedSegments.push(segment);
      return segment.id;
    },
    getLatestSegmentsForNote: async (noteId: string, opts?: { includeHistory?: boolean }) => {
      const latest = new Map<string, NoteSegment>();
      for (const segment of savedSegments.filter((s) => s.noteId === noteId)) {
        const current = latest.get(segment.id);
        if (!current || segment.version > current.version) latest.set(segment.id, segment);
      }
      return [...latest.values()]
        .filter((s) => opts?.includeHistory || !s.isHistory)
        .sort(
          (a, b) => (a.position ?? a.createdAt) - (b.position ?? b.createdAt),
        );
    },
  },
}));

const providerModule = import('../IndexedDBContentProvider');

describe('updateEntry with e2e-seeded whole-doc segment', () => {
  it('retires the foreign whole-doc segment after an edit', async () => {
    const now = Date.now();
    const note: Note = {
      id: 'playground/widget-edit',
      title: 'widget-edit',
      type: 'playground',
      createdAt: now,
    } as Note;
    notes.push(note);
    savedSegments.push({
      id: 'seg-0',
      version: 1,
      noteId: note.id,
      position: 0,
      dataType: 'markdown',
      data: null,
      rawContent:
        '# Widget Edit E2E\n\n```widget:attention\n{"headline":"Seed"}\n```\n',
      createdAt: now,
      updatedAt: now,
      isHistory: false,
    } as NoteSegment);

    const { IndexedDBContentProvider } = await providerModule;
    const provider = new IndexedDBContentProvider();
    await provider.updateEntry(note.id, {
      rawContent:
        '# Widget Edit E2E\n\n```widget:attention\n{"headline":"Updated"}\n```\n',
    });

    const seg0 = savedSegments.find((s) => s.id === 'seg-0');
    expect(seg0?.isHistory).toBe(true);

    // …and the note's live reconstruction contains only the edited content.
    const entry = await provider.getEntry(note.id);
    expect(entry?.rawContent).toContain('Updated');
    expect(entry?.rawContent).not.toContain('Seed');
  });

  it('getEntry excludes retired segments from reconstructed content', async () => {
    const now = Date.now();
    const note: Note = {
      id: 'n1',
      title: 'n1',
      type: 'note',
      createdAt: now,
    } as Note;
    notes.push(note);

    const { IndexedDBContentProvider } = await providerModule;
    const provider = new IndexedDBContentProvider();
    await provider.updateEntry('n1', { rawContent: '# Alpha\n\nfirst\n' });
    await provider.updateEntry('n1', { rawContent: '# Alpha\n\nsecond\n' });

    const entry = await provider.getEntry('n1');
    expect(entry?.rawContent).toContain('second');
    expect(entry?.rawContent).not.toContain('first');
  });
});
