import { v4 as uuidv4 } from 'uuid';

import { toShortId } from '@/lib/idUtils';
import { IndexedDBContentProvider } from '@/services/content/IndexedDBContentProvider';
import { indexedDBService } from '@/services/db/IndexedDBService';
import type { HistoryEntry } from '@/types/history';
import type { AnalyticsDataPoint, Attachment, Note, ResultOrigin, WorkoutResult } from '@/types/storage';
import { MetricType } from '@/core/models/Metric';

import { resolveAttachmentInput } from './attachmentInput';
import type { INotePersistence } from './INotePersistence';
import {
  replayResultAnalytics,
  resolveCanonicalMetricKey,
} from '@/services/analytics/workoutDerivation';
import { createParser } from '@/parser/parserInstance';
import type { ScriptBlock } from '@/components/Editor/types';
import {
  NotePersistenceError,
  type CreateNoteInput,
  type GetNoteOptions,
  type NoteLocator,
  type NoteMutation,
  type NotePersistenceStorage,
  type NoteQuery,
  type ResultSelection,
} from './types';

function sortNewest(results: WorkoutResult[]): WorkoutResult[] {
  return [...results].sort((a, b) => b.createdAt - a.createdAt);
}

function limitResults(results: WorkoutResult[], limit?: number): WorkoutResult[] {
  return limit == null ? results : results.slice(0, limit);
}


/**
 * Identity of the block a result belongs to, stamped on every fact row.
 */
export interface SummaryFactIdentity {
  noteId: string;
  resultId: string;
  /** FK to NoteSegment.id (positional section id of the block run). */
  segmentId?: string;
  /** NoteSegment.version at record time. */
  segmentVersion?: number;
  /** Content-stable cross-note join key. */
  blockContentId?: string;
  /** Which surface produced the result; trend queries exclude 'playground' by default. */
  origin?: ResultOrigin;
  /** FK to the `page` store (copied from the parent note). */
  pageId?: string;
}

/**
 * Convert Tier-2 summary outputs (outputType 'analytics') in a result's logs
 * into persisted fact rows — one row per result × Canonical Metric Key.
 *
 * The analytics store holds SUMMARY FACTS ONLY (CONTEXT.md, 2026-07-20):
 * per-segment data (Tier 0 + Tier 1) is not denormalized here — it stays in
 * WorkoutResult.data.logs, the authoritative source for a single workout.
 *
 * These rows exist for cross-workout queries ("compare total volume across my
 * last 30 Fran runs"). If this write fails or is skipped, the workout result
 * remains fully functional.
 */
export function normalizeSummaryFacts(
  logs: readonly { outputType: string; metrics: readonly { type: string; value?: unknown; image?: string; unit?: string }[]; timeSpan: { started: number; ended?: number } }[],
  identity: SummaryFactIdentity,
): AnalyticsDataPoint[] {
  const now = Date.now();
  const rows: AnalyticsDataPoint[] = [];

  for (const output of logs) {
    if (output.outputType !== 'analytics') continue;
    const label = output.metrics.find(m => m.type === MetricType.Label);
    const value = output.metrics.find(m => m.type !== MetricType.Label && typeof m.value === 'number');
    if (!label || !value) continue;

    const projectionName = String(label.value ?? label.image ?? '');
    if (!projectionName) continue;
    const metricKey = resolveCanonicalMetricKey(projectionName);

    rows.push({
      id: `${identity.resultId}-${metricKey}-${now}`,
      noteId: identity.noteId,
      blockContentId: identity.blockContentId,
      origin: identity.origin,
      pageId: identity.pageId,
      grain: 'summary',
      segmentId: identity.segmentId ?? '',
      segmentVersion: identity.segmentVersion ?? 0,
      resultId: identity.resultId,
      type: metricKey,
      value: value.value as number,
      unit: value.unit,
      label: projectionName,
      metricKey,
      metricLabel: projectionName,
      metricUnit: value.unit,
      timestamp: output.timeSpan.started ?? now,
      createdAt: now,
    });
  }

  return rows;
}

export class IndexedDBNotePersistence implements INotePersistence {
  constructor(
    private readonly storage: NotePersistenceStorage = indexedDBService,
    private readonly contentProvider = new IndexedDBContentProvider(),
  ) {}

  async createNote(input: CreateNoteInput): Promise<HistoryEntry> {
    const existing = await this.storage.getNote(input.id);
    if (existing) {
      throw new Error(`Note already exists: ${input.id}`);
    }
    return this.contentProvider.saveEntry({
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
      const projection = query.projection ?? 'summary';
      return Promise.all(
        query.ids.map(id => this.getNote(id, {
          projection,
          // Mirror the list branch: history-detail means "every result for the
          // note", not the default 'latest' single-result projection. Without
          // this, callers like the canvas that load via listNotes({ids}) get an
          // entry with no extendedResults, so the inline results bar never
          // hydrates on reload.
          ...(projection === 'history-detail' && { resultSelection: { mode: 'all-for-note' as const } }),
        })),
      );
    }

    let entries = await this.contentProvider.getEntries(query);
    if (query.journalDate) {
      entries = entries.filter(entry => entry.journalDate === query.journalDate);
    }
    if (query.kind) {
      entries = entries.filter(entry => entry.type === query.kind);
    }
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
    let note = await this.resolveNote(locator);
    if (!note) {
      // Recording a result onto a note that has no row yet (e.g. a static
      // canvas surface whose body is file-backed, never written to the store):
      // lazily create a minimal note so the result has a home. Without this,
      // mutateNote threw NOTE_NOT_FOUND and the recorder's .catch swallowed it,
      // so the result was never persisted and nothing hydrated on reload.
      // Scoped to result writes — content/attachment mutations still require an
      // existing note.
      if (mutation.workoutResult) {
        const id = this.locatorToId(locator);
        const now = Date.now();
        note = { id, title: id, createdAt: now, type: mutation.noteType ?? mutation.metadata?.type };
        await this.storage.saveNote(note);
      } else {
        throw new NotePersistenceError('NOTE_NOT_FOUND', `Note not found: ${this.describeLocator(locator)}`);
      }
    }

    const resultId = mutation.workoutResult?.id ?? (mutation.workoutResult ? uuidv4() : undefined);
    const patch = {
      ...mutation.metadata,
      rawContent: mutation.rawContent,
      results: mutation.workoutResult?.data,
      segmentId: mutation.workoutResult?.segmentId,  // NoteSegment FK (positional section id)
      blockId: mutation.workoutResult?.blockId,  // line-based position key
      blockContentId: mutation.workoutResult?.blockContentId,  // content-stable join key
      version: mutation.workoutResult?.version,  // LEGACY — retired computeVersion path
      origin: mutation.workoutResult?.origin,  // which surface produced the result
      resultId,
    };

    if (Object.values(patch).some(value => value !== undefined)) {
      await this.contentProvider.updateEntry(note.id, patch);
    }

    // Summary facts: extracted from Tier-2 ('analytics') outputs already in
    // the result's logs — no separate analytics channel (CONTEXT.md 2026-07-20).
    const resultLogs = mutation.workoutResult?.data.logs;
    if (resultId && resultLogs?.length) {
      // Resolve AFTER updateEntry so a same-mutation content edit is reflected
      // in the segment version stamped on fact rows.
      const segmentId = mutation.workoutResult?.segmentId;
      const segmentVersion = segmentId
        ? (await this.storage.getLatestSegmentVersion(segmentId))?.version
        : undefined;
      const points = normalizeSummaryFacts(resultLogs, {
        noteId: note.id,
        resultId,
        segmentId,
        segmentVersion,
        blockContentId: mutation.workoutResult?.blockContentId,
        origin: mutation.workoutResult?.origin,
        pageId: note.pageId,
      });
      if (points.length > 0) {
        // Non-load-bearing: WorkoutResult.data.logs is the authoritative source.
        await this.storage.saveAnalyticsPoints(points);
      }
    }

    if (mutation.attachments?.add) {
      for (const input of mutation.attachments.add) {
        const attachment = await resolveAttachmentInput(input);
        await this.storage.saveAttachment({
          id: attachment.id ?? uuidv4(),
          noteId: note.id,
          pageId: note.pageId,
          resultId,
          label: attachment.label,
          mimeType: attachment.mimeType,
          data: attachment.data,
          timeSpan: attachment.timeSpan,
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

  /**
   * Re-derivation cascade (Candidate 5 / spec §7) — the replay seam consumer.
   *
   * Loads the exact NoteSegment incarnation the result was recorded against
   * (for engine context), replays data.logs through the headless
   * AnalyticsEngine (strip Tier-1 'analyzed' annotations → re-run realtime
   * processors → re-run summary processors), writes back data.logs with
   * regenerated Tier-2 outputs, then purges and re-normalizes the summary
   * fact rows.
   *
   * Lives on the concrete class (not INotePersistence): the provider-delegated
   * adapter has no direct store access to drive the cascade.
   */
  async rederiveResultAnalytics(resultId: string): Promise<WorkoutResult> {
    const result = await this.storage.getResultById(resultId);
    if (!result) {
      throw new NotePersistenceError('RESULT_NOT_FOUND', `Result not found: ${resultId}`);
    }

    // Engine context comes from the stored segment (replay deep-dive Gap A):
    // pinned incarnation first, latest as fallback for rows recorded before
    // segmentVersion was stamped.
    const segment = result.segmentId
      ? (result.segmentVersion != null && this.storage.getSegment
          ? await this.storage.getSegment(result.segmentId, result.segmentVersion)
          : undefined) ?? await this.storage.getLatestSegmentVersion(result.segmentId)
      : undefined;
    const scriptBlock = segment?.data as ScriptBlock | null | undefined;
    if (!scriptBlock) {
      throw new NotePersistenceError(
        'SEGMENT_NOT_FOUND',
        `Cannot re-derive result ${resultId}: no NoteSegment with a scriptBlock for segmentId '${result.segmentId ?? '<none>'}'`,
      );
    }

    const block = scriptBlock.statements?.length
      ? scriptBlock
      : { ...scriptBlock, statements: createParser().read(scriptBlock.content).statements };

    const derivedLogs = replayResultAnalytics(result, block);
    const updated: WorkoutResult = {
      ...result,
      data: { ...result.data, logs: derivedLogs },
    };
    await this.storage.saveResult(updated);

    // Re-normalize summary facts from the canonical derived logs (single
    // derivation policy — the fact table must agree with data.logs).
    if (this.storage.deleteAnalyticsPointsForResult) {
      await this.storage.deleteAnalyticsPointsForResult(result.id);
    }
    const points = normalizeSummaryFacts(derivedLogs, {
      noteId: updated.noteId,
      resultId: result.id,
      segmentId: updated.segmentId,
      segmentVersion: updated.segmentVersion,
      blockContentId: updated.blockContentId,
      origin: updated.origin,
      pageId: updated.pageId,
    });
    if (points.length > 0) {
      await this.storage.saveAnalyticsPoints(points);
    }

    return updated;
  }

  private async resolveNote(locator: NoteLocator): Promise<Note | undefined> {
    if (typeof locator === 'string') {
      return this.resolveByAnyId(locator);
    }
    if (locator.id) {
      return this.resolveByAnyId(locator.id);
    }
    if (locator.slug) {
      return this.resolveByAnyId(locator.slug);
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
    const bySlug = await this.storage.getNoteBySlug?.(id);
    if (bySlug) return bySlug;
    const notes = await this.storage.getAllNotes();
    return notes.find(note => note.slug === id || toShortId(note.id) === id || note.title.toLowerCase() === id.toLowerCase());
  }

  private describeLocator(locator: NoteLocator): string {
    return typeof locator === 'string'
      ? locator
      : locator.id ?? locator.slug ?? locator.shortId ?? locator.title ?? '<empty locator>';
  }

  private locatorToId(locator: NoteLocator): string {
    if (typeof locator === 'string') return locator;
    return locator.id ?? locator.slug ?? locator.shortId ?? locator.title ?? '';
  }

  /**
   * Cross-note "similar workouts" read path (Candidate 1 / cross-note-result-
   * aggregation ADR): every result recorded against the same blockContentId,
   * across all notes. Playground-origin rows are excluded by default — pass
   * includePlayground to reveal them. Sorted newest-first.
   */
  async getSimilarWorkoutResults(
    blockContentId: string,
    options: { excludeNoteId?: string; includePlayground?: boolean; limit?: number } = {},
  ): Promise<WorkoutResult[]> {
    let results = await this.storage.getResultsByContentId(blockContentId);
    if (options.excludeNoteId) {
      results = results.filter(r => r.noteId !== options.excludeNoteId);
    }
    if (!options.includePlayground) {
      results = results.filter(r => r.origin !== 'playground');
    }
    return limitResults(sortNewest(results), options.limit);
  }

  private async selectResults(note: Note, selection: ResultSelection = { mode: 'latest' }): Promise<Partial<HistoryEntry>> {    if (selection.mode === 'by-result-id') {
      const result = await this.storage.getResultById(selection.resultId);
      if (!result) {
        throw new NotePersistenceError('RESULT_NOT_FOUND', `Result not found: ${selection.resultId}`);
      }
      if (result.noteId !== note.id) {
        throw new NotePersistenceError(
          'RESULT_NOTE_MISMATCH',
          `Result ${selection.resultId} does not belong to note ${note.id}`,
        );
      }
      return { results: result.data };
    }

    if (selection.mode === 'latest-for-section' || selection.mode === 'all-for-section') {
      const results = sortNewest(await this.storage.getResultsForSection(note.id, selection.blockContentId));
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
