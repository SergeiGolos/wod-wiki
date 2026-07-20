import type { WorkoutResult } from '@/types/storage';
import type { CreateNoteInput, GetNoteOptions, NoteLocator, NoteMutation, NoteQuery } from './types';
import type { HistoryEntry } from '@/types/history';

export interface INotePersistence {
  createNote(input: CreateNoteInput): Promise<HistoryEntry>;
  getNote(locator: NoteLocator, options?: GetNoteOptions): Promise<HistoryEntry>;
  listNotes(query?: NoteQuery): Promise<HistoryEntry[]>;
  mutateNote(locator: NoteLocator, mutation: NoteMutation): Promise<HistoryEntry>;
  deleteNote(locator: NoteLocator): Promise<void>;
  /**
   * Fetch results for the same workout block (same `blockContentId`) recorded in
   * other notes. Optional because not every backend adapter supports this query.
   */
  getSimilarWorkoutResults?(
    blockContentId: string,
    options?: { excludeNoteId?: string; includePlayground?: boolean; limit?: number },
  ): Promise<WorkoutResult[]>;
}
