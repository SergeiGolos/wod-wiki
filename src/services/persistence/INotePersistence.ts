import type { GetNoteOptions, NoteLocator, NoteMutation, NoteQuery } from './types';
import type { HistoryEntry } from '@/types/history';

export interface INotePersistence {
  getNote(locator: NoteLocator, options?: GetNoteOptions): Promise<HistoryEntry>;
  listNotes(query?: NoteQuery): Promise<HistoryEntry[]>;
  mutateNote(locator: NoteLocator, mutation: NoteMutation): Promise<HistoryEntry>;
  deleteNote(locator: NoteLocator): Promise<void>;
}
