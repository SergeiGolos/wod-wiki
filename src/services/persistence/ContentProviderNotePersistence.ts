import { v4 as uuidv4 } from 'uuid';

import type { IContentProvider } from '@/types/content-provider';
import type { HistoryEntry } from '@/types/history';
import type { WorkoutResult } from '@/types/storage';

import { resolveAttachmentInput } from './attachmentInput';
import type { INotePersistence } from './INotePersistence';
import {
  NotePersistenceError,
  type GetNoteOptions,
  type NoteLocator,
  type NoteMutation,
  type NoteQuery,
  type ResultSelection,
} from './types';

function locatorToId(locator: NoteLocator): string {
  if (typeof locator === 'string') return locator;
  return locator.id ?? locator.shortId ?? locator.title ?? '';
}

function sortNewest(results: WorkoutResult[]): WorkoutResult[] {
  return [...results].sort((a, b) => b.completedAt - a.completedAt);
}

function selectResults(entry: HistoryEntry, selection?: ResultSelection): Partial<HistoryEntry> {
  const all = sortNewest(entry.extendedResults ?? []);
  const resolvedSelection = selection ?? { mode: 'latest' as const };
  const mode = resolvedSelection.mode;

  if (mode === 'by-result-id') {
    const result = all.find(r => r.id === resolvedSelection.resultId);
    if (!result) {
      throw new NotePersistenceError('RESULT_NOT_FOUND', `Result not found: ${resolvedSelection.resultId}`);
    }
    return { results: result.data };
  }

  if (mode === 'latest-for-section' || mode === 'all-for-section') {
    const matches = all.filter(r => r.sectionId === resolvedSelection.sectionId || r.segmentId === resolvedSelection.sectionId);
    if (mode === 'all-for-section') {
      const limited = resolvedSelection.limit ? matches.slice(0, resolvedSelection.limit) : matches;
      return { results: limited[0]?.data, extendedResults: limited };
    }
    return { results: matches[0]?.data };
  }

  if (mode === 'all-for-note') {
    const limited = resolvedSelection.limit ? all.slice(0, resolvedSelection.limit) : all;
    return { results: limited[0]?.data, extendedResults: limited };
  }

  return { results: all[0]?.data };
}

export class ContentProviderNotePersistence implements INotePersistence {
  constructor(private readonly provider: IContentProvider) {}

  async getNote(locator: NoteLocator, options: GetNoteOptions = {}): Promise<HistoryEntry> {
    const entry = await this.provider.getEntry(locatorToId(locator));
    if (!entry) {
      throw new NotePersistenceError('NOTE_NOT_FOUND', `Note not found: ${locatorToId(locator)}`);
    }

    const projection = options.projection ?? 'workbench';
    const includeAttachments = options.includeAttachments ?? false;
    const selected = projection === 'summary'
      ? {}
      : selectResults(entry, options.resultSelection);
    const attachments = includeAttachments
      ? await this.provider.getAttachments(entry.id)
      : undefined;

    return {
      ...entry,
      ...selected,
      sections: options.includeSections === false ? undefined : entry.sections,
      attachments,
    };
  }

  async listNotes(query: NoteQuery = {}): Promise<HistoryEntry[]> {
    const entries = query.ids
      ? await Promise.all(query.ids.map(id => this.getNote(id, { projection: query.projection })))
      : await this.provider.getEntries(query);

    let filtered = entries;
    if (query.search) {
      const search = query.search.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.title.toLowerCase().includes(search) ||
        entry.rawContent.toLowerCase().includes(search)
      );
    }
    if (query.offset || query.limit) {
      filtered = filtered.slice(query.offset ?? 0, (query.offset ?? 0) + (query.limit ?? filtered.length));
    }
    return filtered;
  }

  async mutateNote(locator: NoteLocator, mutation: NoteMutation): Promise<HistoryEntry> {
    const id = locatorToId(locator);
    const patch = {
      ...mutation.metadata,
      rawContent: mutation.rawContent,
      results: mutation.workoutResult?.data,
      sectionId: mutation.workoutResult?.sectionId,
      resultId: mutation.workoutResult?.id ?? (mutation.workoutResult ? uuidv4() : undefined),
    };

    let entry = Object.values(patch).some(value => value !== undefined)
      ? await this.provider.updateEntry(id, patch)
      : await this.getNote(locator);

    if (mutation.attachments?.add) {
      await Promise.all(mutation.attachments.add.map(async input => {
        const attachment = await resolveAttachmentInput(input);
        return this.provider.saveAttachment(entry.id, {
          id: attachment.id,
          label: attachment.label,
          mimeType: attachment.mimeType,
          data: attachment.data,
          timeSpan: attachment.timeSpan,
        });
      }));
    }
    if (mutation.attachments?.remove) {
      await Promise.all(mutation.attachments.remove.map(attachmentId => this.provider.deleteAttachment(attachmentId)));
    }

    entry = await this.getNote(entry.id, { includeAttachments: Boolean(mutation.attachments) });
    return entry;
  }

  async deleteNote(locator: NoteLocator): Promise<void> {
    await this.provider.deleteEntry(locatorToId(locator));
  }
}
