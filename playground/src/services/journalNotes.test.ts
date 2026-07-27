import { describe, expect, it } from 'bun:test';
import type { HistoryEntry } from '@/types/history';
import type { CreateNoteInput, GetNoteOptions, NoteLocator, NoteMutation, NoteQuery } from '@/services/persistence/types';
import type { INotePersistence } from '@/services/persistence';
import { createJournalNotes } from './journalNotes';

class MemoryNotePersistence implements INotePersistence {
  readonly notes = new Map<string, HistoryEntry>();

  async createNote(input: CreateNoteInput): Promise<HistoryEntry> {
    const entry: HistoryEntry = {
      id: input.id,
      title: input.title,
      rawContent: input.rawContent,
      tags: input.tags ?? [],
      createdAt: 1_720_828_800_000,
      updatedAt: 1_720_828_800_000,
      targetDate: input.targetDate,
      journalDate: input.journalDate,
      type: input.type,
      slug: input.slug,
      sourceId: input.sourceId,
      schemaVersion: 1,
    };
    this.notes.set(entry.id, entry);
    return entry;
  }

  async getNote(locator: NoteLocator, _options?: GetNoteOptions): Promise<HistoryEntry> {
    const id = typeof locator === 'string' ? locator : locator.id;
    const entry = id ? this.notes.get(id) : undefined;
    if (!entry) throw new Error('not found');
    return entry;
  }

  async listNotes(query: NoteQuery = {}): Promise<HistoryEntry[]> {
    return Array.from(this.notes.values()).filter(note =>
      (!query.journalDate || note.journalDate === query.journalDate) &&
      (!query.kind || note.type === query.kind),
    );
  }

  async mutateNote(locator: NoteLocator, mutation: NoteMutation): Promise<HistoryEntry> {
    const current = await this.getNote(locator);
    const next = {
      ...current,
      rawContent: mutation.rawContent ?? current.rawContent,
      title: mutation.metadata?.title ?? current.title,
      journalDate: mutation.metadata?.journalDate ?? current.journalDate,
    };
    this.notes.set(next.id, next);
    return next;
  }

  async deleteNote(locator: NoteLocator): Promise<void> {
    const current = await this.getNote(locator);
    this.notes.delete(current.id);
  }
}

describe('Journal Notes', () => {
  it('creates every journal document with a fresh UUID and logical journal date', async () => {
    const persistence = new MemoryNotePersistence();
    let sequence = 0;
    const journalNotes = createJournalNotes({
      persistence,
      uuid: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
    });

    const first = await journalNotes.create({
      journalDate: '2026-07-13',
      title: 'Fran',
      rawContent: '# Fran',
    });
    const second = await journalNotes.create({
      journalDate: '2026-07-13',
      title: 'Fran',
      rawContent: '# Fran',
    });

    expect(first.id).not.toBe(second.id);
    expect(first.journalDate).toBe('2026-07-13');
    expect(first.type).toBe('journal');
    expect(persistence.notes).toHaveLength(2);
  });

  it('lists every Note in a date group in stable creation order', async () => {
    const persistence = new MemoryNotePersistence();
    let sequence = 0;
    const journalNotes = createJournalNotes({
      persistence,
      uuid: () => `00000000-0000-4000-8000-${String(++sequence).padStart(12, '0')}`,
    });
    const later = await journalNotes.create({ journalDate: '2026-07-13', title: 'Later', rawContent: '# Later' });
    const earlier = await journalNotes.create({ journalDate: '2026-07-13', title: 'Earlier', rawContent: '# Earlier' });
    persistence.notes.set(later.id, { ...later, createdAt: 2 });
    persistence.notes.set(earlier.id, { ...earlier, createdAt: 1 });
    await journalNotes.create({ journalDate: '2026-07-14', title: 'Tomorrow', rawContent: '# Tomorrow' });

    const notes = await journalNotes.listByDate('2026-07-13');

    expect(notes.map(note => note.title)).toEqual(['Earlier', 'Later']);
  });
});
