import { v4 as uuidv4 } from 'uuid';

import { toShortId } from '@/lib/idUtils';
import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider';
import { indexedDBService } from '@/services/db/IndexedDBService';
import type { HistoryEntry } from '@/types/history';
import type { AnalyticsDataPoint, Attachment, Note, WorkoutResult } from '@/types/storage';

import type { INotePersistence } from './INotePersistence';
import {
  NotePersistenceError,
  type AnalyticsSegmentInput,
  type GetNoteOptions,
  type NoteLocator,
  type NoteMutation,
  type NotePersistenceStorage,
  type NoteQuery,
  type ResultSelection,
} from './types';

function sortNewest(results: WorkoutResult[]): WorkoutResult[] {
  return [...results].sort((a, b) => b.completedAt - a.completedAt);
}

function limitResults(results: WorkoutResult[], limit?: number): WorkoutResult[] {
  return limit == null ? results : results.slice(0, limit);
}

function sameNote(resultNoteId: string, noteId: string): boolean {
  return resultNoteId === noteId || resultNoteId.endsWith(`-${noteId}`) || noteId.endsWith(`-${resultNoteId}`);
}

function normalizeAnalyticsSegments(
  segments: AnalyticsSegmentInput[],
  noteId: string,
  resultId?: string,
): AnalyticsDataPoint[] {
  const now = Date.now();
  const resolvedResultId = resultId ?? '';
  const points: AnalyticsDataPoint[] = [];

  for (const segment of segments) {
    const segmentId = String(segment.id);
    if (segment.elapsed != null && segment.elapsed > 0) {
      points.push({
        id: `${segmentId}-elapsed-${now}`,
        noteId,
        segmentId,
        segmentVersion: 0,
        resultId: resolvedResultId,
        type: 'elapsed',
        value: segment.elapsed,
        unit: 's',
        label: `${segment.name ?? 'Segment'} – Elapsed`,
        timestamp: segment.absoluteStartTime ?? now,
        createdAt: now,
      });
    }

    for (const [key, value] of Object.entries(segment.metric)) {
      if (typeof value !== 'number') continue;
      points.push({
        id: `${segmentId}-${key}-${now}`,
        noteId,
        segmentId,
        segmentVersion: 0,
        resultId: resolvedResultId,
        type: key,
        value,
        unit: '',
        label: `${segment.name ?? 'Segment'} – ${key}`,
        timestamp: segment.absoluteStartTime ?? now,
        createdAt: now,
      });
    }
  }

  return points;
}

export class IndexedDBNotePersistence implements INotePersistence {
  constructor(
    private readonly storage: NotePersistenceStorage = indexedDBService,
    private readonly contentProvider = new IndexedDBContentProvider(),
  ) {}

  async getNote(locator: NoteLocator, options: GetNoteOptions = {}): Promise<HistoryEntry> {
    const note = await this.resolveNote(locator);
    if (!note) {
      throw new NotePersistenceError('NOTE_NOT_FOUND', `Note not found: ${this.describeLocator(locator)}`);
    }

    const projection = options.projection ?? 'workbench';
    const includeSections = options.includeSections ?? projection !== 'summary';
    const includeAttachments = options.includeAttachments ?? false;
    const baseEntry = await this.contentProvider.getEntry(note.id);
    if (!baseEntry) {
      throw new NotePersistenceError('NOTE_NOT_FOUND', `Note not found: ${this.describeLocator(locator)}`);
    }

    const resultProjection = projection === 'summary'
      ? {}
      : await this.selectResults(note, options.resultSelection);
    const attachments = includeAttachments
      ? await this.storage.getAttachmentsForNote(note.id)
      : undefined;

    return {
      ...baseEntry,
      ...resultProjection,
      sections: includeSections ? baseEntry.sections : undefined,
      attachments,
    };
  }

  async listNotes(query: NoteQuery = {}): Promise<HistoryEntry[]> {
    if (query.ids && query.ids.length > 0) {
      return Promise.all(
        query.ids.map(id => this.getNote(id, { projection: query.projection ?? 'summary' })),
      );
    }

    let entries = await this.contentProvider.getEntries(query);
    if (query.search) {
      const search = query.search.toLowerCase();
      entries = entries.filter(entry =>
        entry.title.toLowerCase().includes(search) ||
        entry.rawContent.toLowerCase().includes(search)
      );
    }
    if (query.projection === 'history-detail') {
      entries = await Promise.all(entries.map(entry =>
        this.getNote(entry.id, {
          projection: 'history-detail',
          resultSelection: { mode: 'all-for-note' },
        })
      ));
    }
    if (query.offset || query.limit) {
      entries = entries.slice(query.offset ?? 0, (query.offset ?? 0) + (query.limit ?? entries.length));
    }
    return entries;
  }

  async mutateNote(locator: NoteLocator, mutation: NoteMutation): Promise<HistoryEntry> {
    const note = await this.resolveNote(locator);
    if (!note) {
      throw new NotePersistenceError('NOTE_NOT_FOUND', `Note not found: ${this.describeLocator(locator)}`);
    }

    const resultId = mutation.workoutResult?.id ?? (mutation.workoutResult ? uuidv4() : undefined);
    const patch = {
      ...mutation.metadata,
      rawContent: mutation.rawContent,
      results: mutation.workoutResult?.data,
      sectionId: mutation.workoutResult?.sectionId,
      resultId,
    };

    if (Object.values(patch).some(value => value !== undefined)) {
      await this.contentProvider.updateEntry(note.id, patch);
    }

    const analyticsSegments = mutation.analytics?.segments ?? mutation.workoutResult?.analyticsSegments;
    if (analyticsSegments && analyticsSegments.length > 0) {
      const points = normalizeAnalyticsSegments(
        analyticsSegments,
        note.id,
        mutation.analytics?.resultId ?? resultId,
      );
      await this.storage.saveAnalyticsPoints(points);
    }

    if (mutation.attachments?.add) {
      for (const file of mutation.attachments.add) {
        await this.storage.saveAttachment({
          id: uuidv4(),
          noteId: note.id,
          label: file.name,
          mimeType: file.type,
          data: await file.arrayBuffer(),
          timeSpan: { start: Date.now(), end: Date.now() },
          createdAt: Date.now(),
        } satisfies Attachment);
      }
    }
    if (mutation.attachments?.remove) {
      await Promise.all(mutation.attachments.remove.map(id => this.storage.deleteAttachment(id)));
    }

    return this.getNote(note.id, {
      projection: 'workbench',
      resultSelection: { mode: 'latest' },
      includeAttachments: Boolean(mutation.attachments),
    });
  }

  async deleteNote(locator: NoteLocator): Promise<void> {
    const note = await this.resolveNote(locator);
    if (!note) {
      throw new NotePersistenceError('NOTE_NOT_FOUND', `Note not found: ${this.describeLocator(locator)}`);
    }
    await this.contentProvider.deleteEntry(note.id);
  }

  private async resolveNote(locator: NoteLocator): Promise<Note | undefined> {
    if (typeof locator === 'string') {
      return this.resolveByAnyId(locator);
    }
    if (locator.id) {
      return this.resolveByAnyId(locator.id);
    }
    const notes = await this.storage.getAllNotes();
    if (locator.shortId) {
      return notes.find(note => toShortId(note.id) === locator.shortId);
    }
    const title = locator.title;
    if (title) {
      return notes.find(note => note.title.toLowerCase() === title.toLowerCase());
    }
    return undefined;
  }

  private async resolveByAnyId(id: string): Promise<Note | undefined> {
    const direct = await this.storage.getNote(id);
    if (direct) return direct;
    const notes = await this.storage.getAllNotes();
    return notes.find(note => toShortId(note.id) === id || note.title.toLowerCase() === id.toLowerCase());
  }

  private describeLocator(locator: NoteLocator): string {
    return typeof locator === 'string'
      ? locator
      : locator.id ?? locator.shortId ?? locator.title ?? '<empty locator>';
  }

  private async selectResults(note: Note, selection: ResultSelection = { mode: 'latest' }): Promise<Partial<HistoryEntry>> {
    if (selection.mode === 'by-result-id') {
      const result = await this.storage.getResultById(selection.resultId);
      if (!result) {
        throw new NotePersistenceError('RESULT_NOT_FOUND', `Result not found: ${selection.resultId}`);
      }
      if (!sameNote(result.noteId, note.id)) {
        throw new NotePersistenceError(
          'RESULT_NOTE_MISMATCH',
          `Result ${selection.resultId} does not belong to note ${note.id}`,
        );
      }
      return { results: result.data };
    }

    if (selection.mode === 'latest-for-section' || selection.mode === 'all-for-section') {
      const results = sortNewest(await this.storage.getResultsForSection(note.id, selection.sectionId));
      if (selection.mode === 'all-for-section') {
        const extendedResults = limitResults(results, selection.limit);
        return { results: extendedResults[0]?.data, extendedResults };
      }
      return { results: results[0]?.data };
    }

    const results = sortNewest(await this.storage.getResultsForNote(note.id));
    if (selection.mode === 'all-for-note') {
      const extendedResults = limitResults(results, selection.limit);
      return { results: extendedResults[0]?.data, extendedResults };
    }

    return { results: results[0]?.data };
  }
}

export { normalizeAnalyticsSegments };
