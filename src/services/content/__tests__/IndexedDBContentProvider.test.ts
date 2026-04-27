import { afterEach, describe, expect, it, mock } from 'bun:test';
import type { Note, NoteSegment } from '../../../types/storage';

const savedNotes: Note[] = [];
const savedSegments: NoteSegment[] = [];
const notes: Note[] = [];

mock.module('../../db/IndexedDBService', () => ({
  indexedDBService: {
    getAllNotes: async () => notes,
    saveNote: async (note: Note) => {
      savedNotes.push(note);
      return note.id;
    },
    saveSegment: async (segment: NoteSegment) => {
      savedSegments.push(segment);
      return segment.id;
    },
  },
}));

const providerModule = import('../IndexedDBContentProvider');
const originalDateNow = Date.now;

afterEach(() => {
  Date.now = originalDateNow;
  notes.length = 0;
  savedNotes.length = 0;
  savedSegments.length = 0;
});

describe('IndexedDBContentProvider', () => {
  it('uses timestamp IDs for new playground entries', async () => {
    Date.now = () => Date.UTC(2026, 3, 27, 14, 30, 22, 481);
    const { IndexedDBContentProvider } = await providerModule;
    const provider = new IndexedDBContentProvider();

    const entry = await provider.saveEntry({
      title: '',
      rawContent: '',
      tags: [],
      targetDate: Date.now(),
      type: 'playground',
    });

    expect(entry.id).toBe('2026-04-27-14-30-22-481');
    expect(savedNotes[0].id).toBe('2026-04-27-14-30-22-481');
    expect(savedNotes[0].type).toBe('playground');
  });

  it('preserves playground type when listing entries', async () => {
    notes.push({
      id: '2026-04-27-14-30-22-481',
      title: '',
      rawContent: '',
      tags: [],
      createdAt: Date.UTC(2026, 3, 27, 14, 30, 22, 481),
      updatedAt: Date.UTC(2026, 3, 27, 14, 30, 22, 481),
      targetDate: Date.UTC(2026, 3, 27, 14, 30, 22, 481),
      segmentIds: [],
      type: 'playground',
    });
    const { IndexedDBContentProvider } = await providerModule;
    const provider = new IndexedDBContentProvider();

    const entries = await provider.getEntries();

    expect(entries[0].type).toBe('playground');
  });

  it('keeps UUID IDs for non-playground entries', async () => {
    Date.now = () => Date.UTC(2026, 3, 27, 14, 30, 22, 481);
    const { IndexedDBContentProvider } = await providerModule;
    const provider = new IndexedDBContentProvider();

    const entry = await provider.saveEntry({
      title: 'Fran',
      rawContent: '',
      tags: [],
      targetDate: Date.now(),
      type: 'note',
    });

    expect(entry.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
