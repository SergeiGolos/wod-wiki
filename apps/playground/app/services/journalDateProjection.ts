import type { HistoryEntry } from '@/types/history';
import type { Session } from '@/types/storage';

export interface JournalDateProjectionNote {
  note: HistoryEntry;
  results: Session[];
}

export interface JournalDateProjection {
  journalDate: string;
  notes: JournalDateProjectionNote[];
}

export function projectJournalDate(journalDate: string, notes: HistoryEntry[], results: Session[]): JournalDateProjection {
  const journalNotes = notes
    .filter(note => note.journalDate === journalDate && note.type === 'journal')
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
  const resultByNote = new Map<string, Session[]>();
  for (const result of results) {
    const existing = resultByNote.get(result.noteId) ?? [];
    existing.push(result);
    resultByNote.set(result.noteId, existing);
  }
  return {
    journalDate,
    notes: journalNotes.map(note => ({
      note,
      results: (resultByNote.get(note.id) ?? []).sort((a, b) => b.createdAt - a.createdAt),
    })),
  };
}
