/**
 * journalWorkout — helpers for writing workout blocks into the journal.
 *
 * When a workout is started from a collection (or future feed) page, we
 * create/update today's journal note with a new section containing:
 *   - A heading with the workout name
 *   - A back-link to the originating collection
 *   - The raw wod block content
 *
 * This keeps every run anchored to a dated journal entry and lets the
 * result be linked to the note rather than the static collection file.
 */

import { getWodCollection } from '@/repositories/wod-collections';
import { playgroundDB, PlaygroundDBService } from './playgroundDB';

export interface AppendWorkoutOptions {
  /** Display name of the workout (e.g. 'Fran'). */
  workoutName: string;
  /** Collection slug used as a fallback source when no explicit note link is provided. */
  category: string;
  /** Optional display label for the source note link. */
  sourceNoteLabel?: string;
  /** Optional route to the source note. */
  sourceNotePath?: string;
  /** Raw text inside the wod fence (without backticks) or full page content. */
  wodContent: string;
  /**
   * Target date for the journal entry. Defaults to today.
   * Used by the Clone flow to schedule a workout on a future/past date.
   */
  date?: Date;
  /**
   * Whether to wrap the content in a ```wod block.
   * Defaults to true for content-only clones.
   */
  wrapInWod?: boolean;
}

/**
 * Appends a workout section to the given date's journal note (defaults to
 * today) and returns the journal noteId (`'journal/YYYY-MM-DD'`).
 *
 * If the note doesn't exist it is created with a date heading first.
 * If it already exists the section is appended after the existing content.
 */
export async function appendWorkoutToJournal({
  workoutName,
  category,
  sourceNoteLabel,
  sourceNotePath,
  wodContent,
  date,
  wrapInWod = true,
}: AppendWorkoutOptions): Promise<string> {
  const d = date ?? new Date();
  const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const noteId = PlaygroundDBService.pageId('journal', dateKey);

  const existing = await playgroundDB.getPage(noteId);
  const baseContent = existing?.content ?? `# ${dateKey}\n`;

  const resolvedSourceLabel = sourceNoteLabel?.trim() || category;
  const resolvedSourcePath = sourceNotePath?.trim() || `/collections/${encodeURIComponent(category)}`;
  const collection = getWodCollection(category);
  const siblingLinks = collection?.items
    .filter(item => item.id !== workoutName)
    .map(item => `[${category}-${item.id}](/workout/${encodeURIComponent(category)}/${encodeURIComponent(item.id)})`) ?? [];
  
  const lines = [
    `\n## ${workoutName}`,
    `Source: [${resolvedSourceLabel}](${resolvedSourcePath})`,
    collection ? `Collection: [${collection.id}](/collections/${encodeURIComponent(collection.id)})` : null,
    siblingLinks.length > 0 ? `Other Workouts: ${siblingLinks.join(' · ')}` : null,
    '',
  ].filter((line): line is string => line !== null);

  if (wrapInWod) {
    lines.push('```wod');
    lines.push(wodContent.trimEnd());
    lines.push('```');
  } else {
    lines.push(wodContent.trimEnd());
  }
  
  lines.push('');

  const section = lines.join('\n');

  const updatedContent = baseContent.trimEnd() + '\n' + section;

  await playgroundDB.savePage({
    id: noteId,
    name: dateKey,
    category: 'journal',
    content: updatedContent,
    updatedAt: Date.now(),
  });

  return noteId;
}
