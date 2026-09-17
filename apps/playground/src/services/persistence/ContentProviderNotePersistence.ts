import { v7 as uuidv7 } from 'uuid';

import type { IContentProvider } from '@/types/content-provider';
import type { HistoryEntry } from '@/types/history';
import type { Session } from '@/types/storage';
import type { Sessions } from '@/components/Editor/types';

import { resolveAttachmentInput } from './attachmentInput';
import type { INotePersistence } from './INotePersistence';
import { sessionToPayload } from './sessionPayload';
import {
  NotePersistenceError,
  type CreateNoteInput,
  type GetNoteOptions,
  type NoteLocator,
  type NoteMutation,
  type NoteQuery,
  type ResultSelection,
} from './types';

function locatorToId(locator: NoteLocator): string {
  if (typeof locator === 'string') return locator;
  return locator.id ?? locator.slug ?? locator.shortId ?? locator.title ?? '';
}

function sortNewest(results: Session[]): Session[] {
  return [...results].sort((a, b) => b.createdAt - a.createdAt);
}

function selectResults(entry: HistoryEntry, selection?: ResultSelection): Partial<HistoryEntry> {
  const all = sortNewest(entry.extendedResults ?? []);
  const resolvedSelection = selection ?? { mode: 'latest' as const };
  const mode = resolvedSelection.mode;

  // The provider path has no event-store access, so an explicitly selected
  // session reconstructs its payload from the row's scalar fields. The
  // default (latest) selection prefers the payload the provider already
  // built, which carries the event-derived logs.
  const payloadFor = (session: Session | undefined): Sessions | undefined =>
    session ? sessionToPayload(session) : undefined;

  if (mode === 'by-result-id') {
    const result = all.find(r => r.id === resolvedSelection.resultId);
    if (!result) {
      throw new NotePersistenceError('RESULT_NOT_FOUND', `Result not found: ${resolvedSelection.resultId}`);
    }
    return { results: payloadFor(result) };
  }

  if (mode === 'latest-for-section' || mode === 'all-for-section') {
    const matches = all.filter(r => r.blockContentId === resolvedSelection.blockContentId);
    if (mode === 'all-for-section') {
      const limited = resolvedSelection.limit ? matches.slice(0, resolvedSelection.limit) : matches;
      return { results: payloadFor(limited[0]), extendedResults: limited };
    }
    return { results: payloadFor(matches[0]) };
  }

  if (mode === 'all-for-note') {
    const limited = resolvedSelection.limit ? all.slice(0, resolvedSelection.limit) : all;
    return { results: payloadFor(limited[0]), extendedResults: limited };
  }

  return { results: entry.results ?? payloadFor(all[0]) };
}

export class ContentProviderNotePersistence implements INotePersistence {
  constructor(private readonly provider: IContentProvider) {}

  async createNote(input: CreateNoteInput): Promise<HistoryEntry> {
    return this.provider.saveEntry({
      id: input.id,
      title: input.title,
      rawContent: input.rawContent,
      tags: input.tags ?? [],
      targetDate: input.targetDate,
      journalDate: input.journalDate,
      type: input.type ?? 'note',
      slug: input.slug,
      sourceId: input.sourceId,
    });
  }

  async getNote(locator: NoteLocator, options: GetNoteOptions = {}): Promise<HistoryEntry> {
    const entry = await this.provider.getEntry(locatorToId(locator));
    if (!entry) {
      throw new NotePersistenceError('NOTE_NOT_FOUND', `Note not found: ${locatorToId(locator)}`);
    }

    const projection = options.projection ?? 'workbench';
    const includeAttachments = options.includeAttachments ?? false;
    const selected = projection === 'summary'
      ? { results: undefined, extendedResults: undefined }
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
    if (query.journalDate) {
      filtered = filtered.filter(entry => entry.journalDate === query.journalDate);
    }
    if (query.kind) {
      filtered = filtered.filter(entry => entry.type === query.kind);
    }
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
      blockId: mutation.workoutResult?.blockId,
      blockContentId: mutation.workoutResult?.blockContentId,
      version: mutation.workoutResult?.version,
      segmentId: mutation.workoutResult?.segmentId,
      origin: mutation.workoutResult?.origin,
      resultId: mutation.workoutResult?.id ?? (mutation.workoutResult ? uuidv7() : undefined),
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
