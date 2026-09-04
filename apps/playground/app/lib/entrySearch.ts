/**
 * StreamQueryEngine — unified query intake across content, efforts, and rows planes.
 * (Tickets #833/#834 deepened per Wayfinder Ticket 001).
 *
 * Provides a single, deep intake seam that:
 *   1. Accepts any valid find or rows WQL query string or AST (find:note,
 *      find:block, find:effort, rows:all, rows:segment, rows:event).
 *   2. Dispatches to the appropriate query service method (runFind,
 *      runFindEffort, or runRows) transparently behind a single seam.
 *   3. Maps all returned records into an extended, uniform Entry model
 *      carrying optional execution metrics or effort metadata.
 *   4. Preserves secondary text searching (e.g. searching block bodies
 *      alongside note titles when text: is present).
 *
 * Invalid WQL (parse error or non-find/non-rows query) resolves to an empty list;
 * callers surface the error separately via their own parse.
 */
import { queryService } from '@/services/queryService';
import {
  parseQuery,
  isFindQuery,
  isRowsQuery,
  type AnyParsedQuery,
  type ParsedFindQuery,
  type ParsedRowsQuery,
  type FindQueryResult,
  type RowsQueryResult,
} from '@bitcobblers/wod-wiki-engine';
import type { Note } from '@/types/storage';
import {
  toEntry,
  blockToEntry,
  noteFromBlock,
  effortToEntry,
  rowsQueryResultToEntries,
  type Entry,
} from './entryMapper';

export interface StreamQueryService {
  runFind(parsed: ParsedFindQuery, options?: unknown): Promise<FindQueryResult>;
  runFindEffort?(parsed: ParsedFindQuery): Promise<FindQueryResult>;
  runRows?(parsed: ParsedRowsQuery, options?: unknown): Promise<RowsQueryResult>;
}

export interface StreamQueryEngineOptions {
  service?: StreamQueryService;
  noteTitleResolver?: (noteId: string) => Promise<string | undefined> | string | undefined;
}

function isStreamQueryService(value: unknown): value is StreamQueryService {
  return typeof value === 'object' && value !== null && 'runFind' in value;
}

export class StreamQueryEngine {
  private customService?: StreamQueryService;
  private noteTitleResolver?: (noteId: string) => Promise<string | undefined> | string | undefined;

  constructor(serviceOrOptions?: StreamQueryService | StreamQueryEngineOptions) {
    if (isStreamQueryService(serviceOrOptions)) {
      this.customService = serviceOrOptions;
    } else {
      this.customService = serviceOrOptions?.service;
      this.noteTitleResolver = serviceOrOptions?.noteTitleResolver;
    }
  }

  private get service(): StreamQueryService {
    return this.customService ?? queryService;
  }
  async query(input: string | AnyParsedQuery): Promise<Entry[]> {
    const parsed: AnyParsedQuery = typeof input === 'string' ? parseQuery(input) : input;
    if (!parsed || parsed.error) return [];

    // 1. Content and Effort Discovery Planes (find:)
    if (isFindQuery(parsed)) {
      // find:effort — queries the effort registry via runFindEffort
      if (parsed.target === 'effort') {
        const result = this.service.runFindEffort
          ? await this.service.runFindEffort(parsed)
          : await this.service.runFind(parsed);
        return (result.efforts ?? []).map(effortToEntry);
      }

      // find:block — one Entry per block, newest first (#855).
      if (parsed.target === 'block') {
        const result = await this.service.runFind(parsed);
        return [...result.blocks].sort((a, b) => b.createdAt - a.createdAt).map(blockToEntry);
      }

      // find:note (or other content target)
      const hasText = parsed.filters.some(f => f.key === 'text' && !f.negate);
      const primaryPromise = this.service.runFind(parsed);

      // When free-text is present, also run find:block to search body text.
      const blockParsed: ParsedFindQuery | null = hasText && parsed.target === 'note'
        ? (typeof input === 'string'
            ? (parseQuery(input.replace(/^find:note/, 'find:block')) as ParsedFindQuery)
            : {
                ...parsed,
                target: 'block',
                raw: parsed.raw ? parsed.raw.replace(/^find:note/, 'find:block') : 'find:block',
              })
        : null;

      const blockPromise = (blockParsed && isFindQuery(blockParsed) && !blockParsed.error)
        ? this.service.runFind(blockParsed)
        : Promise.resolve(null);

      const [primaryResult, blockResult] = await Promise.all([primaryPromise, blockPromise]);
      const noteMap = new Map<string, Note>();

      for (const note of primaryResult.notes) {
        noteMap.set(note.id, note);
      }
      for (const block of primaryResult.blocks) {
        if (!noteMap.has(block.noteId)) noteMap.set(block.noteId, noteFromBlock(block));
      }
      if (blockResult?.blocks) {
        for (const block of blockResult.blocks) {
          if (!noteMap.has(block.noteId)) noteMap.set(block.noteId, noteFromBlock(block));
        }
      }

      return Array.from(noteMap.values()).map(toEntry);
    }

    // 2. Execution Analytics Telemetry Plane (rows:)
    if (isRowsQuery(parsed)) {
      if (!this.service.runRows) return [];
      const result = await this.service.runRows(parsed);

      let noteTitles: Map<string, string> | undefined;
      if (this.noteTitleResolver && result.runs) {
        noteTitles = new Map();
        for (const run of result.runs) {
          if (!noteTitles.has(run.noteId)) {
            const title = await this.noteTitleResolver(run.noteId);
            if (title) noteTitles.set(run.noteId, title);
          }
        }
      }

      return rowsQueryResultToEntries(result, { noteTitles });
    }

    // Unsupported query family (e.g. aggregate queries)
    return [];
  }
}

export const defaultStreamQueryEngine = new StreamQueryEngine();

/**
 * Shared entry point for resolving WQL query strings or ASTs into Entry[] across
 * all planes (content, efforts, and telemetry rows).
 */
export async function searchEntries(
  input: string | AnyParsedQuery,
  engine: StreamQueryEngine = defaultStreamQueryEngine,
): Promise<Entry[]> {
  return engine.query(input);
}
