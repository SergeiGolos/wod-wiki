/**
 * getEntries regression tests (real InMemoryStorage backend):
 *  - current-content selection is MAX(version) per segment id BEFORE the
 *    history filter — a retired latest incarnation hides its older live row
 *    exactly like the single-note getEntry path;
 *  - the targetDate window selects note candidates via `date ?? createdAt`
 *    with INCLUSIVE bounds, and non-candidates never pay for
 *    links/pages/tags/segment fetches (batched per-candidate reads);
 *  - pageId/journalDate/slug resolve independently for notes sitting on both
 *    calendar and named pages;
 *  - backends exposing the domain entries plan get used, with identical
 *    client-side filter semantics.
 */
import { describe, expect, it } from 'bun:test';

import type { DomainEntry, DomainQueryResult } from '@bitcobblers/wod-wiki-storage';
import { IndexedDBContentProvider } from '../IndexedDBContentProvider';
import { InMemoryStorage, StorageService } from '@/services/storage';
import type { Note, NoteSegment, Page, PageNote, Tag } from '@/types/storage';

const T0 = Date.UTC(2026, 5, 1, 12, 0, 0); // 2026-06-01 12:00 UTC
const T1 = Date.UTC(2026, 5, 2, 12, 0, 0);

function makeService() {
  const storage = new InMemoryStorage();
  return new StorageService(storage);
}

async function seedSegment(
  service: StorageService,
  noteId: string,
  sectionId: string,
  version: number,
  rawContent: string,
  opts: { isHistory?: boolean; position?: number; dataType?: NoteSegment['dataType'] } = {},
) {
  await service.saveSegment({
    id: `${noteId}:${sectionId}`,
    version,
    noteId,
    position: opts.position ?? 0,
    dataType: opts.dataType ?? 'markdown',
    data: null,
    rawContent,
    createdAt: T0,
    updatedAt: T0,
    isHistory: opts.isHistory ?? false,
  });
}

describe('IndexedDBContentProvider.getEntries (real InMemoryStorage)', () => {
  it('selects MAX(version) per segment id before the history filter', async () => {
    const service = makeService();
    const note: Note = { id: 'note-max', title: 'Max', createdAt: T0, date: T0 };
    await service.saveNote(note);
    // sec-hidden: latest incarnation (v2) is retired — the older live row
    // must NOT resurrect into current content.
    await seedSegment(service, note.id, 'sec-hidden', 1, 'hidden v1 body');
    await seedSegment(service, note.id, 'sec-hidden', 2, 'hidden v2 body', { isHistory: true, position: 0 });
    // sec-live: latest incarnation (v2) is live — shown.
    await seedSegment(service, note.id, 'sec-live', 1, 'live v1 body', { isHistory: true, position: 1 });
    await seedSegment(service, note.id, 'sec-live', 2, 'live v2 body', { position: 1 });

    const entries = await new IndexedDBContentProvider(service).getEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0]!.rawContent).not.toContain('hidden v1 body');
    expect(entries[0]!.rawContent).toContain('live v2 body');
  });

  it('selects candidates by the date ?? createdAt fallback with inclusive bounds', async () => {
    const service = makeService();
    // Dated note lands via Note.date; undated note falls back to createdAt —
    // both inside [T1, T1] (inclusive on both ends).
    await service.saveNote({ id: 'note-dated', title: 'Dated', createdAt: T0, date: T1 });
    await service.saveNote({ id: 'note-fallback', title: 'Fallback', createdAt: T1 });
    await service.saveNote({ id: 'note-early', title: 'Early', createdAt: T1 - 1 });
    await service.saveNote({ id: 'note-late', title: 'Late', createdAt: T1 + 1, date: T1 + 1 });

    const entries = await new IndexedDBContentProvider(service).getEntries({
      dateRange: { start: T1, end: T1 },
    });

    expect(entries.map(e => e.id).sort()).toEqual(['note-dated', 'note-fallback']);
    for (const entry of entries) expect(entry.targetDate).toBe(T1);
  });

  it('derives the same window from daysBack', async () => {
    const service = makeService();
    const now = Date.UTC(2026, 5, 10, 12, 0, 0);
    const realNow = Date.now;
    Date.now = () => now;
    try {
      await service.saveNote({ id: 'note-old', title: 'Old', createdAt: now - 3 * 86_400_000 });
      await service.saveNote({ id: 'note-recent', title: 'Recent', createdAt: now - 86_400_000 });

      const entries = await new IndexedDBContentProvider(service).getEntries({ daysBack: 2 });
      expect(entries.map(e => e.id)).toEqual(['note-recent']);
    } finally {
      Date.now = realNow;
    }
  });

  it('fetches metadata bundles only for in-window candidates', async () => {
    const service = makeService();
    const inWindow = { id: 'note-in', title: 'In', createdAt: T1, date: T1 };
    const outWindow = { id: 'note-out', title: 'Out', createdAt: T1 + 86_400_000, date: T1 + 86_400_000 };
    await service.saveNote(inWindow);
    await service.saveNote(outWindow);
    await service.setNoteTags(inWindow.id, ['fit']);
    await service.setNoteTags(outWindow.id, ['fit']);
    await seedSegment(service, inWindow.id, 'sec', 1, 'in body');

    const batchCalls: string[][] = [];
    const db = Object.create(service) as StorageService;
    db.getEntryBatches = async (noteIds: readonly string[]) => {
      batchCalls.push([...noteIds]);
      return service.getEntryBatches(noteIds);
    };

    const entries = await new IndexedDBContentProvider(db).getEntries({
      dateRange: { start: T0, end: T1 },
      tags: ['fit'],
    });

    expect(entries.map(e => e.id)).toEqual(['note-in']);
    expect(entries[0]!.rawContent).toContain('in body');
    expect(entries[0]!.tags).toEqual(['fit']);
    // Candidates only — the out-of-window note is never probed.
    expect(batchCalls).toEqual([['note-in']]);
  });

  it('resolves pageId, journalDate and slug independently for dual-page notes', async () => {
    const service = makeService();
    const note: Note = { id: 'note-dual', title: 'Dual', createdAt: T1, date: T1 };
    await service.saveNote(note);
    const calendar: Page = { id: 'page-cal', date: '2026-06-02', title: '2026-06-02', createdAt: T0 };
    const named: Page = { id: 'page-named', slug: 'fran-board', title: 'Fran Board', createdAt: T0 };
    await service.savePage(calendar);
    await service.savePage(named);
    // Explicit position puts the calendar page first → primary pageId.
    await service.addNoteToPage(note.id, calendar.id, 0);
    await service.addNoteToPage(note.id, named.id, 1);
    await service.setNoteTags(note.id, ['benchmark']);
    await seedSegment(service, note.id, 'sec', 1, 'dual body');

    const entries = await new IndexedDBContentProvider(service).getEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: note.id,
      pageId: 'page-cal',
      journalDate: '2026-06-02',
      slug: 'fran-board',
      targetDate: T1,
      tags: ['benchmark'],
      type: 'note',
    });
  });

  it('sorts by targetDate descending', async () => {
    const service = makeService();
    await service.saveNote({ id: 'note-a', title: 'A', createdAt: T0, date: T0 });
    await service.saveNote({ id: 'note-b', title: 'B', createdAt: T1, date: T1 });
    await service.saveNote({ id: 'note-c', title: 'C', createdAt: T0 + 1 });

    const entries = await new IndexedDBContentProvider(service).getEntries();
    expect(entries.map(e => e.id)).toEqual(['note-b', 'note-c', 'note-a']);
  });

  it('uses the domain entries plan when the backend exposes it, with identical filters', async () => {
    const service = makeService();
    const note: Note = { id: 'note-dom', title: 'Dom', createdAt: T1, date: T1, sourceId: 'src-1' };
    const calendar: Page = { id: 'page-dom', date: '2026-06-02', title: '2026-06-02', createdAt: T0 };
    const link: PageNote = { id: 'link-1', pageId: calendar.id, noteId: note.id, createdAt: T0 };
    const tag: Tag = { id: 'tag-dom', label: 'dom', createdAt: T0 };
    const segment: NoteSegment = {
      id: `${note.id}:sec`, version: 2, noteId: note.id, position: 0,
      dataType: 'markdown', data: null, rawContent: 'dom v2 body',
      createdAt: T0, updatedAt: T0, isHistory: false,
    };
    const domainEntry: DomainEntry = {
      note, segments: [segment], tags: [tag], links: [link], pages: [calendar],
    };
    const plans: string[] = [];
    const db = Object.create(service) as StorageService;
    db.queryDomain = async (query) => {
      plans.push(query.plan);
      return {
        plan: 'entries',
        projectionVersion: 1,
        selectedCount: 2,
        matchedCount: 2,
        rows: [domainEntry],
      } satisfies DomainQueryResult;
    };

    const entries = await new IndexedDBContentProvider(db).getEntries({ tags: ['dom'] });
    expect(plans).toEqual(['entries']);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      id: note.id,
      pageId: 'page-dom',
      journalDate: '2026-06-02',
      targetDate: T1,
      tags: ['dom'],
      sourceId: 'src-1',
    });
    expect(entries[0]!.rawContent).toContain('dom v2 body');

    // Client-side filter stays exact: a tag mismatch drops the row.
    const none = await new IndexedDBContentProvider(db).getEntries({ tags: ['other'] });
    expect(none).toEqual([]);
  });
});
