/**
 * Headless WQL Query Command Runner
 *
 * Evaluates WQL queries against in-memory stores sourced from --corpus,
 * --stdin-log, or --stdin-facts, and emits a versioned IR envelope.
 */

function getFs() {
  if (typeof globalThis.process?.versions?.node === 'undefined' && typeof (globalThis as any).Bun === 'undefined') {
    throw new Error('File system operations are only supported in Node / Bun environments');
  }
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
  type FactQueryStore,
  type NoteQueryStore,
  type BlockQueryStore,
  type ResultLogStore,
  type EffortQueryStore,
} from '@/services/analytics/query';
import type { AnalyticsDataPoint, Note, BlockIndexRow, WorkoutResult } from '@/types/storage';
import type { WorkoutResults } from '@/components/Editor/types';
import type { IEffort } from '@/effort-registry';
import { bundledEfforts } from '@/effort-registry/data/bundled-efforts';
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
  facts: AnalyticsDataPoint[];
  results: WorkoutResult[];
  notes: Note[];
  blocks: BlockIndexRow[];
  efforts: IEffort[];
  noteTags: Record<string, string[]>;
}

function factsFromExecutionLog(log: ExecutionLog, resultId: string = 'stdin-result-1'): AnalyticsDataPoint[] {
  const facts: AnalyticsDataPoint[] = [];
  for (const s of log.statements) {
    for (const m of s.metrics) {
      const numVal = typeof m.value === 'number' ? m.value : Number(m.value);
      facts.push({
        id: `fact-${s.id}-${m.type}-${facts.length + 1}`,
        noteId: 'stdin-note-1',
        blockContentId: s.sourceBlockKey || 'stdin-block-1',
        segmentId: s.sourceBlockKey || 'stdin-seg-1',
        segmentVersion: 1,
        resultId,
        grain: s.outputType === 'analytics' ? 'summary' : 'segment',
        type: m.type,
        value: Number.isNaN(numVal) ? 0 : numVal,
        unit: m.unit,
        label: (m as any).label || m.type,
        metricKey: m.type,
        metricLabel: (m as any).label || m.type,
        timestamp: s.timeSpan.started,
        createdAt: s.timeSpan.started,
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
    throw new Error(`Failed to parse JSON input: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function buildStoresFromData(data: LoadedData) {
  const factStore: FactQueryStore = {
    getFactsByMetric: async (key: string) =>
      data.facts.filter((f) => f.metricKey === key || f.type === key),
    getFactsByTimeRange: async (start: number, end: number) =>
      data.facts.filter((f) => f.timestamp >= start && f.timestamp <= end),
    getNoteTagLabels: async (noteId: string) => [...(data.noteTags[noteId] ?? [])],
  };

  const noteStore: NoteQueryStore = {
    getAllNotes: async () => [...data.notes],
    getNoteIdsForTag: async (tag: string) => {
      const matching = new Set<string>();
      for (const [noteId, tags] of Object.entries(data.noteTags)) {
        if (tags.includes(tag)) matching.add(noteId);
      }
      return matching;
    },
  };

  const blockStore: BlockQueryStore = {
    getAllBlocks: async () => [...data.blocks],
  };

  const resultStore: ResultLogStore = {
    getResultsByContentId: async (contentId: string) =>
      data.results.filter((r) => r.blockContentId === contentId),
    getResultById: async (resultId: string) =>
      data.results.find((r) => r.id === resultId),
    getResultsForNote: async (noteId: string) =>
      data.results.filter((r) => r.noteId === noteId),
  };

  const effortStore: EffortQueryStore = {
    getAllEfforts: async () => [...data.efforts],
  };

  return { factStore, noteStore, blockStore, resultStore, effortStore };
}

export function loadQueryData(options: QueryCliOptions): LoadedData {
  const data: LoadedData = {
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
          createdAt: corpus.logs[0]?.timeSpan.started ?? Date.now(),
          data: {
            startTime: corpus.logs[0]?.timeSpan.started ?? Date.now(),
            endTime: corpus.logs[corpus.logs.length - 1]?.timeSpan.ended ?? Date.now(),
            duration: 0,
            completed: true,
            logs: corpus.logs,
          },
        };
        data.results = [syntheticResult];
      }
    }
  } else if (options.stdinLog) {
    const payload = extractPayload(options.stdinLog) as ExecutionLog | WorkoutResults;
    let executionLog: ExecutionLog;
    if ('results' in payload && 'statements' in payload) {
      executionLog = payload as ExecutionLog;
    } else if ('logs' in payload) {
      const wr = payload as WorkoutResults;
      executionLog = { results: wr, statements: wr.logs ?? [] };
    } else {
      executionLog = { results: payload as WorkoutResults, statements: [] };
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
        logs: executionLog.statements,
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

  const data = loadQueryData(options);
  const stores = buildStoresFromData(data);
  const service = new QueryService(
    stores.factStore,
    stores.noteStore,
    stores.blockStore,
    stores.resultStore,
    stores.effortStore,
  );

  if (isFindQuery(parsed)) {
    const result = await service.runFind(parsed);
    return createIRFile('find-result', result, options.sourceLabel ?? 'cli:wod query');
  }

  if (isRowsQuery(parsed)) {
    const result = await service.runRows(parsed);
    return createIRFile('rows-result', result, options.sourceLabel ?? 'cli:wod query');
  }

  const result = await service.runQuery(wqlString, {
    preferredUnit: options.preferredUnit,
  });
  return createIRFile('query-result', result, options.sourceLabel ?? 'cli:wod query');
}
