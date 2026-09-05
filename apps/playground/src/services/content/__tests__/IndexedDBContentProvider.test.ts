import { afterEach, describe, expect, it, mock } from 'bun:test';
import type { Note, NoteSegment } from '../../../types/storage';
import { parseDocumentSections } from '../../../components/Editor/utils/sectionParser';
import { parseDashboardNote } from '../../../lib/dashboard/parser';
import { buildDashboardDocument, isDashboardMeta } from '../../../lib/dashboard/model';

const savedNotes: Note[] = [];
const savedSegments: NoteSegment[] = [];
const notes: Note[] = [];
// T4 bridge capture: noteId -> labels from the last setNoteTags call.
const noteTagsByNote = new Map<string, string[]>();

mock.module('../../db/IndexedDBService', () => ({
  indexedDBService: {
    getNote: async (id: string) => notes.find(note => note.id === id) ?? savedNotes.find(note => note.id === id),
    getAllNotes: async () => [...notes, ...savedNotes],
    getTagsForNote: async (noteId: string) =>
      (noteTagsByNote.get(noteId) ?? []).map(label => ({ id: `tag-${label}`, label, createdAt: 0 })),
    setNoteTags: async (noteId: string, labels: string[]) => {
      noteTagsByNote.set(noteId, labels);
    },
    getPage: async (_id: string) => undefined,
    getAllSegments: async () => savedSegments,
    getResultsForNote: async () => [],
    getAttachmentsForNote: async () => [],
    saveNote: async (note: Note) => {
      savedNotes.push(note);
      return note.id;
    },
    saveSegment: async (segment: NoteSegment) => {
      // IndexedDB put semantics: one row per [id, version].
      const index = savedSegments.findIndex(s => s.id === segment.id && s.version === segment.version);
      if (index >= 0) savedSegments[index] = segment;
      else savedSegments.push(segment);
      return segment.id;
    },
    getLatestSegmentsForNote: async (noteId: string) => {
      const latest = new Map<string, NoteSegment>();
      for (const segment of savedSegments.filter(s => s.noteId === noteId)) {
        const current = latest.get(segment.id);
        if (!current || segment.version > current.version) latest.set(segment.id, segment);
      }
      return [...latest.values()].sort(
        (a, b) => (a.position ?? a.createdAt) - (b.position ?? b.createdAt),
      );
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
  noteTagsByNote.clear();
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
      createdAt: Date.UTC(2026, 3, 27, 14, 30, 22, 481),
      type: 'playground',
    });
    const { IndexedDBContentProvider } = await providerModule;
    const provider = new IndexedDBContentProvider();

    const entries = await provider.getEntries();

    expect(entries[0].type).toBe('playground');
  });

  it('adds a suffix when a playground timestamp ID already exists', async () => {
    Date.now = () => Date.UTC(2026, 3, 27, 14, 30, 22, 481);
    notes.push({
      id: '2026-04-27-14-30-22-481',
      title: 'Existing playground',
      createdAt: Date.now(),
      type: 'playground',
    });
    const { IndexedDBContentProvider } = await providerModule;
    const provider = new IndexedDBContentProvider();

    const entry = await provider.saveEntry({
      title: '',
      rawContent: '',
      tags: [],
      targetDate: Date.now(),
      type: 'playground',
    });

    expect(entry.id).toBe('2026-04-27-14-30-22-481-1');
    expect(savedNotes[0].id).toBe('2026-04-27-14-30-22-481-1');
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

    expect(entry.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('round-trips frontmatter delimiters on read (dashboard notes stay parseable)', async () => {
    const { IndexedDBContentProvider } = await providerModule;
    const provider = new IndexedDBContentProvider();
    const raw = `---
dashboard: true
title: Benchmark PR Board
slug: benchmark-pr-board
---

# Benchmark PR Board

\`\`\`query:value
sum:totalVolume{}
\`\`\`
`;

    const entry = await provider.saveEntry({
      title: 'Benchmark PR Board',
      rawContent: raw,
      tags: [],
      targetDate: Date.now(),
      type: 'note',
    });

    // Single-note read AND list read must both restore the --- delimiters —
    // segments store the frontmatter's inner content only.
    const read = await provider.getEntry(entry.id);
    expect(read?.rawContent.startsWith('---\n')).toBe(true);
    expect(read?.rawContent).toContain('\n---\n');

    const listed = await provider.getEntries();
    expect(listed.find(e => e.id === entry.id)?.rawContent).toBe(read?.rawContent);

    // The Dashboard Note actually resolves: frontmatter parses, widget found.
    const { meta, sections } = parseDashboardNote(read!.rawContent);
    expect(isDashboardMeta(meta)).toBe(true);
    expect(buildDashboardDocument(sections, meta).widgets).toHaveLength(1);
  });

  it('collapses per-keystroke updates to a single live segment (#705)', async () => {
    const { IndexedDBContentProvider } = await providerModule;
    const provider = new IndexedDBContentProvider();

    const entry = await provider.saveEntry({
      title: '',
      rawContent: 'Note\n',
      tags: [],
      targetDate: Date.now(),
      type: 'note',
    });

    // Simulate per-keystroke saves: each update re-parses content-addressed
    // section ids, so superseded rows must be retired on every save.
    const typed = 'NoteE2E-RELOAD-1784826347490';
    for (let i = 5; i <= typed.length; i++) {
      await provider.updateEntry(entry.id, { rawContent: typed.slice(0, i) + '\n' });
    }

    const latestById = new Map<string, NoteSegment>();
    for (const segment of savedSegments) {
      const current = latestById.get(segment.id);
      if (!current || segment.version >= current.version) latestById.set(segment.id, segment);
    }
    const live = [...latestById.values()].filter(s => !s.isHistory);

    // Live rows are exactly the sections of the final content — no pile-up.
    const finalSections = parseDocumentSections(typed + '\n');
    expect(new Set(live.map(s => s.id))).toEqual(new Set(finalSections.map(s => s.id)));
    expect(live.find(s => s.rawContent.trim())?.rawContent.trim()).toBe(typed);
    // Every superseded snapshot is history, not a live duplicate.
    const liveIds = new Set(live.map(s => s.id));
    for (const segment of latestById.values()) {
      if (!liveIds.has(segment.id)) expect(segment.isHistory).toBe(true);
    }
  });

  it('bridges frontmatter tags into note_tags at note creation', async () => {
    const { IndexedDBContentProvider } = await providerModule;
    const provider = new IndexedDBContentProvider();

    const entry = await provider.saveEntry({
      title: 'Fran',
      rawContent: '---\ntags:\n  - crossfit\n  - girl-wods\n---\n# Fran\n',
      tags: ['manual'],
      targetDate: Date.now(),
      type: 'note',
    });

    // Frontmatter labels ∪ explicit tags, deduped.
    expect(noteTagsByNote.get(entry.id)?.sort()).toEqual(['crossfit', 'girl-wods', 'manual']);
  });

  it('unions new frontmatter tags into existing note_tags on content save', async () => {
    const { IndexedDBContentProvider } = await providerModule;
    const provider = new IndexedDBContentProvider();

    const entry = await provider.saveEntry({
      title: 'Fran',
      rawContent: '---\ntags:\n  - crossfit\n---\n# Fran\n',
      tags: [],
      targetDate: Date.now(),
      type: 'note',
    });
    expect(noteTagsByNote.get(entry.id)).toEqual(['crossfit']);

    // Editing content to carry a new frontmatter label ADDS it; the old label
    // survives (frontmatter is additive-only, never destructive).
    await provider.updateEntry(entry.id, {
      rawContent: '---\ntags:\n  - hero\n---\n# Fran\n',
    });
    expect(noteTagsByNote.get(entry.id)?.sort()).toEqual(['crossfit', 'hero']);
  });

  it('does not let a manual tag replace wipe frontmatter tags', async () => {
    const { IndexedDBContentProvider } = await providerModule;
    const provider = new IndexedDBContentProvider();

    const entry = await provider.saveEntry({
      title: 'Fran',
      rawContent: '---\ntags:\n  - crossfit\n---\n# Fran\n',
      tags: [],
      targetDate: Date.now(),
      type: 'note',
    });

    // A tag-editor save replaces the manual portion but re-adds the
    // frontmatter labels still present in content.
    await provider.updateEntry(entry.id, { tags: ['benchmark'] });
    expect(noteTagsByNote.get(entry.id)?.sort()).toEqual(['benchmark', 'crossfit']);
  });
});
