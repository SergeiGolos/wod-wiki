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
  blockPreview,
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
  /**
   * When true, a find:note run also fetches the same query's block plane
   * (identical scope — no broadening) and attaches each note's excerpt lines
   * plus its first wod block's content id. The feed's rich preview cards and
   * their Run action consume this; one extra query per executed WQL, not per item.
   */
  noteBlockInfo?: boolean;
}

function isStreamQueryService(value: unknown): value is StreamQueryService {
  return typeof value === 'object' && value !== null && 'runFind' in value;
}

export class StreamQueryEngine {
  private customService?: StreamQueryService;
  private noteTitleResolver?: (noteId: string) => Promise<string | undefined> | string | undefined;
  private noteBlockInfo: boolean;

  constructor(serviceOrOptions?: StreamQueryService | StreamQueryEngineOptions) {
    if (isStreamQueryService(serviceOrOptions)) {
      this.customService = serviceOrOptions;
    } else {
      this.customService = serviceOrOptions?.service;
      this.noteTitleResolver = serviceOrOptions?.noteTitleResolver;
      this.noteBlockInfo = serviceOrOptions?.noteBlockInfo ?? false;
    }
  }

  private get service(): StreamQueryService {
    return this.customService ?? queryService;
  }

  /** Same engine with note block info attached — the feed mode's rich
   *  previews and Run targets. Shares the underlying service and title
   *  resolver; no second query-state seam. */
  withNoteBlockInfo(): StreamQueryEngine {
    const next = new StreamQueryEngine({
      service: this.service,
      noteTitleResolver: this.noteTitleResolver,
      noteBlockInfo: true,
    });
    // The feed's companion wraps the same engine; an instance-level `query`
    // override (the tests' seam for stubbing results directly) must survive
    // the wrap or feed-mode callers would silently re-run the real query.
    if (Object.prototype.hasOwnProperty.call(this, 'query')) {
      next.query = this.query;
    }
    return next;
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

      // When free-text is present — or the caller asked for note block info —
      // also run find:block to search body text / collect per-note previews.
      const blockParsed: ParsedFindQuery | null = (hasText || this.noteBlockInfo) && parsed.target === 'note'
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

      const entries = Array.from(noteMap.values()).map(toEntry);
      if (this.noteBlockInfo && blockResult?.blocks) {
        // Per note: prose preview lines (feed reading depth — bounded, the
        // card collapses/ expands) and the first wod block's content id and
        // script — the feed's excerpt and Run target.
        const EXCERPT_LINE_CAP = 6;
        const previewByNote = new Map<string, string[]>();
        const wodByNote = new Map<string, { blockContentId: string; content: string }>();
        for (const block of [...blockResult.blocks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
          const preview = previewByNote.get(block.noteId);
          if (preview) {
            const room = EXCERPT_LINE_CAP - preview.length;
            if (room > 0) preview.push(...blockPreview(block.rawContent).slice(0, room));
          } else {
            previewByNote.set(block.noteId, blockPreview(block.rawContent));
          }
          if (!wodByNote.has(block.noteId) && block.dataType === 'wod' && block.blockContentId) {
            wodByNote.set(block.noteId, { blockContentId: block.blockContentId, content: block.rawContent });
          }
        }
        for (const entry of entries) {
          const preview = previewByNote.get(entry.id);
          if (preview && preview.length > 0) entry.excerpt = preview.slice(0, EXCERPT_LINE_CAP);
          const wod = wodByNote.get(entry.id);
          if (wod && !entry.wodBlock) entry.wodBlock = wod;
          if (wod && !entry.blockContentId) entry.blockContentId = wod.blockContentId;
        }
      }

      return entries;
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
