/**
 * Headless WQL Query Command Runner
 *
 * Evaluates WQL queries against in-memory stores sourced from --corpus,
 * --stdin-log, or --stdin-facts, and emits a versioned IR envelope.
 */

function getFs() {
  if (typeof globalThis.process?.versions?.node === 'undefined' && typeof (globalThis as { Bun?: unknown }).Bun === 'undefined') {
    throw new Error('File system operations are only supported in Node / Bun environments');
  }
  // eslint-disable-next-line no-restricted-syntax -- lazy CJS require keeps node builtins out of browser bundles
  return require('fs');
}
import {
  QueryService,
  parseQuery,
  isFindQuery,
  isRowsQuery,
  type QueryResult,
  type RowsQueryResult,
  type FindQueryResult,
  type NoteQueryStore,
  type BlockQueryStore,
  type EffortQueryStore,
  type IEffort as WqlEffort,
} from '@bitcobblers/wod-wiki-wql';
import { factRowsToEventRows, inMemoryEventStore } from '../store';
import { toEventRows, toSummaryEventRows } from '@bitcobblers/wod-wiki-wql';
import type { AnalyticsDataPoint, Note, BlockIndexRow, WorkoutResult, UnifiedEventRecord } from '@bitcobblers/wod-wiki-core';
import type { WorkoutResults } from '@bitcobblers/wod-wiki-core';
import type { IEffort } from '@bitcobblers/wod-wiki-lang';
import { bundledEfforts } from '@bitcobblers/wod-wiki-lang';
import { createIRFile, isIRFile, type WodWikiIRFile, type ExecutionLog, type CorpusIRData } from '../ir';
export class WqlSyntaxError extends Error {
  constructor(
    public readonly query: string,
    public readonly syntaxError: string,
  ) {
    super(`WQL Syntax Error in "${query}": ${syntaxError}`);
    this.name = 'WqlSyntaxError';
  }
}

export interface QueryCliOptions {
  corpusPath?: string;
  stdinLog?: string;
  stdinFacts?: string;
  preferredUnit?: string;
  sourceLabel?: string;
}

interface LoadedData {
  eventRecords: UnifiedEventRecord[];
  facts: AnalyticsDataPoint[];
  results: WorkoutResult[];
  notes: Note[];
  blocks: BlockIndexRow[];
  efforts: IEffort[];
  noteTags: Record<string, string[]>;
}

function factsFromExecutionLog(log: ExecutionLog, resultId: string = 'stdin-result-1'): AnalyticsDataPoint[] {
  const facts: AnalyticsDataPoint[] = [];
  for (const s of log.logs) {
    const started = s.timeSpan?.started ?? s.timestamp ?? Date.now();
    for (const m of s.metrics) {
      const mType = m.type || 'metric';
      const numVal = typeof m.value === 'number' ? m.value : Number(m.value);
      facts.push({
        id: `fact-${s.id ?? 0}-${mType}-${facts.length + 1}`,
        noteId: 'stdin-note-1',
        blockContentId: s.sourceBlockKey || 'stdin-block-1',
        segmentId: s.sourceBlockKey || 'stdin-seg-1',
        segmentVersion: 1,
        resultId,
        grain: s.outputType === 'analytics' ? 'summary' : 'event',
        type: mType,
        value: Number.isNaN(numVal) ? 0 : numVal,
        unit: m.unit,
        label: (m as unknown as { label?: string }).label || mType,
        metricKey: mType,
        metricLabel: (m as unknown as { label?: string }).label || mType,
        timestamp: started,
        createdAt: started,
      });
    }
  }
  return facts;
}

function extractPayload(rawJson: string): unknown {
  try {
    const parsed = JSON.parse(rawJson);
    if (isIRFile(parsed)) {
      return parsed.data;
    }
    return parsed;
  } catch (err) {
    throw new Error(`Failed to parse JSON input: ${err instanceof Error ? err.message : String(err)}`, { cause: err });
  }
}

function buildStoresFromData(data: LoadedData) {
  // One event stream: direct event records, legacy fact fixtures wrapped
  // as summary rows, plus results-derived event + summary rows.
  const identity = (r: (typeof data.results)[number]) => ({
    noteId: r.noteId,
    resultId: r.id,
    segmentId: r.segmentId,
    segmentVersion: r.segmentVersion,
    blockContentId: r.blockContentId,
    origin: r.origin,
    pageId: r.pageId,
    workoutTimestamp: r.createdAt,
  });
  const events = [
    ...data.eventRecords,
    ...factRowsToEventRows(data.facts),
    ...data.results.flatMap((r) => {
      const logs = r.data.logs ?? [];
      return [...toEventRows(logs, identity(r)), ...toSummaryEventRows(logs, identity(r))];
    }),
  ];

  const eventStore = inMemoryEventStore(events);

  const noteStore: NoteQueryStore = {
    getAllNotes: async () => [...data.notes],
    getNoteIdsForTag: async (tag: string) => {
      const matching = new Set<string>();
      for (const [noteId, tags] of Object.entries(data.noteTags)) {
        if (tags.includes(tag)) matching.add(noteId);
      }
      return matching;
    },
    getNoteTagLabels: async (noteId: string) => [...(data.noteTags[noteId] ?? [])],
  };

  const blockStore: BlockQueryStore = {
    getAllBlocks: async () => [...data.blocks],
  };

  const effortStore: EffortQueryStore = {
    getAllEfforts: async () => [...data.efforts] as unknown as WqlEffort[],
  };

  return { eventStore, noteStore, blockStore, effortStore };
}

export function loadQueryData(options: QueryCliOptions): LoadedData {
  const data: LoadedData = {
    eventRecords: [],
    facts: [],
    results: [],
    notes: [],
    blocks: [],
    efforts: [...bundledEfforts],
    noteTags: {},
  };

  if (options.corpusPath) {
    const fs = getFs();
    if (!fs.existsSync(options.corpusPath)) {
      throw new Error(`Corpus file not found at path: ${options.corpusPath}`);
    }
    const raw = fs.readFileSync(options.corpusPath, 'utf-8');
    const payload = extractPayload(raw);

    if (Array.isArray(payload)) {
      data.facts = payload as AnalyticsDataPoint[];
    } else if (payload && typeof payload === 'object') {
      const obj = payload as Record<string, unknown>;
      if (obj.kind === 'event-journal' || Array.isArray(obj.records)) {
        if (Array.isArray(obj.records)) {
          data.eventRecords = obj.records as UnifiedEventRecord[];
        }
        if (Array.isArray(obj.notes)) {
          data.notes = obj.notes as Note[];
          for (const n of obj.notes as Array<{ id?: string; tags?: string[] }>) {
            if (n && typeof n === 'object' && n.id && Array.isArray(n.tags)) {
              data.noteTags[n.id] = n.tags;
            }
          }
        }
      } else if (obj.facts || obj.results || obj.notes || obj.blocks || obj.efforts || obj.tags || obj.logs) {
        const corpus = payload as CorpusIRData;
        if (corpus.facts) data.facts = corpus.facts;
        if (corpus.results) data.results = corpus.results;
        if (corpus.notes) data.notes = corpus.notes;
        if (corpus.blocks) data.blocks = corpus.blocks;
        if (corpus.efforts) data.efforts = corpus.efforts;
        if (corpus.tags) data.noteTags = corpus.tags;

        // If logs are provided without separate results, synthesize results
        if (corpus.logs && (!corpus.results || corpus.results.length === 0)) {
          const syntheticResult: WorkoutResult = {
            id: 'corpus-result-1',
            noteId: 'corpus-note-1',
            blockContentId: 'corpus-block-1',
            origin: 'journal',
            createdAt: corpus.logs[0]?.timeSpan?.started ?? Date.now(),
            data: {
              startTime: corpus.logs[0]?.timeSpan?.started ?? Date.now(),
              endTime: corpus.logs[corpus.logs.length - 1]?.timeSpan?.ended ?? Date.now(),
              duration: 0,
              completed: true,
              logs: corpus.logs,
            },
          };
          data.results = [syntheticResult];
        }
      } else {
        throw new Error(`Unrecognized corpus payload shape in "${options.corpusPath}" (expected event-journal, fact-set, or CorpusIRData)`);
      }
    }
  } else if (options.stdinLog) {
    const payload = extractPayload(options.stdinLog) as ExecutionLog | WorkoutResults;
    let executionLog: ExecutionLog;
    const rawLogs = payload.logs ?? ('statements' in payload ? payload.statements : undefined) ?? [];
    if ('results' in payload) {
      executionLog = { results: payload.results, logs: rawLogs, statements: rawLogs };
    } else {
      executionLog = { results: payload, logs: rawLogs, statements: rawLogs };
    }

    const resultId = 'stdin-result-1';
    const workoutResult: WorkoutResult = {
      id: resultId,
      noteId: 'stdin-note-1',
      blockContentId: 'stdin-block-1',
      origin: 'journal',
      createdAt: executionLog.results.startTime,
      data: {
        ...executionLog.results,
        logs: executionLog.logs,
      },
    };
    data.results = [workoutResult];
    data.facts = factsFromExecutionLog(executionLog, resultId);
  } else if (options.stdinFacts) {
    const payload = extractPayload(options.stdinFacts);
    if (Array.isArray(payload)) {
      data.facts = payload as AnalyticsDataPoint[];
    } else if (payload && typeof payload === 'object' && 'facts' in (payload as Record<string, unknown>)) {
      data.facts = (payload as { facts: AnalyticsDataPoint[] }).facts;
    }
  } else {
    throw new Error('No input dataset provided. Specify --corpus <path>, --stdin-log, or --stdin-facts.');
  }

  return data;
}

/**
 * Runs a WQL query against the provided in-memory dataset and returns a versioned IR envelope.
 */
export async function runQueryCli(
  wqlString: string,
  options: QueryCliOptions = {},
): Promise<WodWikiIRFile<QueryResult | RowsQueryResult | FindQueryResult>> {
  const parsed = parseQuery(wqlString);
  if (parsed.error) {
    throw new WqlSyntaxError(wqlString, parsed.error);
  }

  const stores = buildStoresFromData(loadQueryData(options));
  const service = new QueryService(
    stores.eventStore,
    stores.noteStore,
    stores.blockStore,
    stores.effortStore,
  );

  if (isFindQuery(parsed)) {
    const result = await service.runFind(parsed);
    return createIRFile('find-result', result, { source: options.sourceLabel ?? 'cli:wod query' });
  }

  if (isRowsQuery(parsed)) {
    const result = await service.runRows(parsed);
    return createIRFile('rows-result', result, { source: options.sourceLabel ?? 'cli:wod query' });
  }

  const result = await service.runQuery(wqlString, {
    preferredUnit: options.preferredUnit,
  });
  return createIRFile('query-result', result, { source: options.sourceLabel ?? 'cli:wod query' });
}
