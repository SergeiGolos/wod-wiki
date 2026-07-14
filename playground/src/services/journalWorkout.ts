import { getScriptCollection } from '@/repositories/script-collections';
import type { HistoryEntry } from '@/types/history';
import { formatDateKey } from './dateUtils';
import { journalNotes } from './journalNotes';

export interface CreateJournalNoteFromWorkoutOptions {
  workoutName: string;
  category: string;
  sourceNoteLabel?: string;
  sourceNotePath?: string;
  wodContent: string;
  date?: Date;
  wrapInWod?: boolean;
}

/**
 * Creates one independent Journal Note containing a cloned workout block.
 * Explicit creation never mutates an older date member; repeated execution of
 * this Note's block is represented by additional Results on its UUID.
 */
export async function createJournalNoteFromWorkout({
  workoutName,
  category,
  sourceNoteLabel,
  sourceNotePath,
  wodContent,
  date,
  wrapInWod = true,
}: CreateJournalNoteFromWorkoutOptions): Promise<HistoryEntry> {
  const journalDate = formatDateKey(date ?? new Date());
  const resolvedSourceLabel = sourceNoteLabel?.trim() || category;
  const resolvedSourcePath = sourceNotePath?.trim() || `/collections/${encodeURIComponent(category)}`;
  const collection = getScriptCollection(category);
  const lines = [
    `# ${workoutName}`,
    '',
    `Source: [${resolvedSourceLabel}](${resolvedSourcePath})`,
    collection ? `Collection: [${collection.id}](/collections/${encodeURIComponent(collection.id)})` : null,
    '',
  ].filter((line): line is string => line !== null);

  if (wrapInWod) {
    lines.push('```wod', wodContent.trimEnd(), '```');
  } else {
    lines.push(wodContent.trimEnd());
  }
  lines.push('');

  return journalNotes.create({
    journalDate,
    title: workoutName,
    rawContent: lines.join('\n'),
    createdFrom: { kind: category === 'feed' ? 'feed' : 'collection', ref: resolvedSourcePath },
  });
}
