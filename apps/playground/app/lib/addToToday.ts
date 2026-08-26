/**
 * addEntryToTodayInput — pure mapper from an Entry + a target date +
 * the source's raw content to a `CreateJournalNoteInput`. The Library
 * page composes the source's rawContent (block-index for static, journal
 * store for Note) and passes the result to `journalNotes.create`. The
 * test seam is the input shape; the IO is the page's responsibility.
 */
import type { CreateJournalNoteInput } from '../services/journalNotes'
import type { Entry } from './entryMapper'

/**
 * Build a `CreateJournalNoteInput` that clones the source Entry onto the
 * target journal date. The caller supplies the `rawContent`; this helper
 * sets the journal-date, the title, and the sourceId for traceability.
 */
export function addEntryToTodayInput(
  entry: Entry,
  rawContent: string,
  targetDate: string,
): CreateJournalNoteInput {
  return {
    journalDate: targetDate,
    title: entry.title,
    rawContent,
    sourceId: entry.sourceId,
    type: 'journal',
  }
}
