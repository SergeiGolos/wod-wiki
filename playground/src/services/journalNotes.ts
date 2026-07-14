import { v4 as uuidv4 } from 'uuid';

import type { INotePersistence } from '@/services/persistence';
import { notePersistence } from '@/services/persistence';
import type { HistoryEntry } from '@/types/history';
import type { NoteCreationSource } from '@/types/storage';

import { parseJournalDate } from './parseJournalDate';

export interface CreateJournalNoteInput {
  journalDate: string;
  title: string;
  rawContent: string;
  tags?: string[];
  slug?: string;
  createdFrom?: NoteCreationSource;
  type?: 'note' | 'playground' | 'journal';
}

export interface JournalNotes {
  create(input: CreateJournalNoteInput): Promise<HistoryEntry>;
  getById(noteId: string): Promise<HistoryEntry>;
  resolve(idOrSlug: string): Promise<HistoryEntry>;
  listByDate(journalDate: string): Promise<HistoryEntry[]>;
  update(noteId: string, rawContent: string): Promise<HistoryEntry>;
  moveToDate(noteId: string, journalDate: string): Promise<HistoryEntry>;
  delete(noteId: string): Promise<void>;
}

export interface JournalNotesDependencies {
  persistence: INotePersistence;
  uuid?: () => string;
}

function dateTimestamp(journalDate: string): number {
  const parsed = parseJournalDate(journalDate);
  if (!parsed) throw new Error(`Invalid journal date: ${journalDate}`);
  return parsed.date.getTime();
}
export function createJournalNotes({
  persistence,
  uuid = uuidv4,
}: JournalNotesDependencies): JournalNotes {
  return {
    async create(input) {
      const targetDate = input.journalDate ? dateTimestamp(input.journalDate) : Date.now();
      return persistence.createNote({
        id: uuid(),
        title: input.title,
        rawContent: input.rawContent,
        tags: input.tags ?? [],
        targetDate,
        journalDate: input.journalDate || undefined,
        type: input.type ?? 'journal',
        slug: input.slug,
        createdFrom: input.createdFrom,
      });
    },

    getById(noteId) {
      return persistence.getNote({ id: noteId }, {
        projection: 'workbench',
        resultSelection: { mode: 'all-for-note' },
        includeSections: true,
        includeAttachments: true,
      });
    },

    resolve(idOrSlug) {
      return persistence.getNote(idOrSlug, {
        projection: 'workbench',
        resultSelection: { mode: 'all-for-note' },
        includeSections: true,
        includeAttachments: true,
      });
    },

    async listByDate(journalDate) {
      dateTimestamp(journalDate);
      const notes = await persistence.listNotes({
        journalDate,
        kind: 'journal',
        projection: 'summary',
      });
      return notes.sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
    },

    update(noteId, rawContent) {
      const heading = rawContent.match(/^#\s+(.+)$/m)?.[1]?.trim();
      return persistence.mutateNote({ id: noteId }, {
        rawContent,
        metadata: heading ? { title: heading } : undefined,
      });
    },

    moveToDate(noteId, journalDate) {
      return persistence.mutateNote({ id: noteId }, {
        metadata: {
          journalDate,
          targetDate: dateTimestamp(journalDate),
        },
      });
    },

    delete(noteId) {
      return persistence.deleteNote({ id: noteId });
    },
  };
}

export const journalNotes = createJournalNotes({ persistence: notePersistence });
