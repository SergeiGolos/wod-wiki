/**
 * Pure JSON Intermediate Representation (IR) Schemas & Envelope
 *
 * Implements wayfinder #955 and research asset `docs/research/json-ir-schemas-2026-08-17.md`.
 * Freezes the existing result vocabulary (QueryResult, RowsQueryResult, FindQueryResult,
 * StoredOutputStatement, AnalyticsDataPoint, WorkoutResult, StatementNode) in a
 * versioned envelope safe for JSON round-trips.
 */

import type { IMetric } from '@/core/models/Metric';
import { MetricType } from '@/core/models/Metric';
import type { ICodeStatement } from '@/core/models/CodeStatement';
import type { WhiteboardScript } from '@/parser/WhiteboardScript';
import { getHints } from '@/core/metrics/hints';
import type { AnalyticsDataPoint, Note, NoteSegment, BlockIndexRow, WorkoutResult } from '@/types/storage';
import type { StoredOutputStatement, WorkoutResults } from '@/components/Editor/types';

import type { IEffort } from '@/effort-registry';

export type IrKind =
  | 'fact-set'
  | 'result-set'
  | 'note-set'
  | 'corpus'
  | 'query-result'
  | 'find-result'
  | 'rows-result'
  | 'parse-tree'
  | 'execution-log';

/**
 * Universal JSON envelope for all headless IR fixtures and output artifacts.
 */
export interface WodWikiIRFile<T> {
  $schema: 'https://wod-wiki.dev/ir/v1.json';
  kind: IrKind;
  generatedAt: number;     // epoch ms
  source?: string;         // provenance: "cli:wod", "cli:wod parse", "cli:wod run", "cli:wod query", etc.
  data: T;
}

/**
 * Plain AST Statement node for headless Whiteboard Script parse trees.
 */
export interface StatementNode {
  id: number;
  type: string;                  // statement kind: group, duration, action, property, text, root, statement
  raw: string;                   // source text of the statement
  from: number;
  to: number;                    // source span
  metrics: IMetric[];            // flat — container resolved to plain metric array
  hints?: string[];              // plain string array of hint markers
  children: StatementNode[];
}

/**
 * Execution log payload from headless workout runtime state machine runs.
 */
export interface ExecutionLog {
  results: WorkoutResults;
  statements: StoredOutputStatement[];
}

/**
 * Composite corpus dataset containing historical notes, blocks, results, and facts.
 */
export interface CorpusIRData {
  facts?: AnalyticsDataPoint[];
  results?: WorkoutResult[];
  logs?: StoredOutputStatement[];
  notes?: Note[];
  segments?: NoteSegment[];
  blocks?: BlockIndexRow[];
  tags?: Record<string, string[]>;
  efforts?: IEffort[];
}

export type FactSetIRData = AnalyticsDataPoint[];
export interface ResultSetIRData {
  results: WorkoutResult[];
  logs?: StoredOutputStatement[];
}
export interface NoteSetIRData {
  notes?: Note[];
  segments?: NoteSegment[];
  blocks?: BlockIndexRow[];
  tags?: Record<string, string[]>;
}

/**
 * Factory to create a versioned IR envelope.
 */
export function createIRFile<T>(
  kind: IrKind,
  data: T,
  source?: string,
  generatedAt: number = Date.now(),
): WodWikiIRFile<T> {
  return {
    $schema: 'https://wod-wiki.dev/ir/v1.json',
    kind,
    generatedAt,
    ...(source ? { source } : {}),
    data,
  };
}

/**
 * Type guard to check if an object conforms to the WodWikiIRFile envelope.
 */
export function isIRFile<T = unknown>(value: unknown): value is WodWikiIRFile<T> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<WodWikiIRFile<T>>;
  return (
    candidate.$schema === 'https://wod-wiki.dev/ir/v1.json' &&
    typeof candidate.kind === 'string' &&
    typeof candidate.generatedAt === 'number' &&
    'data' in candidate
  );
}

/**
 * Converts a live ICodeStatement into a plain-data StatementNode.
 */
export function statementToNode(stmt: ICodeStatement, idMap: Map<number, ICodeStatement>): StatementNode {
  const hints = getHints(stmt.metrics);
  const rawMetrics: IMetric[] = stmt.metrics.rawMetrics.map((m) => ({
    type: m.type,
    value: m.value,
    image: m.image,
    origin: m.origin,
    label: (m as any).label,
    unit: m.unit,
  }));

  const childIds = stmt.children ? stmt.children.flat() : [];
  const children = childIds
    .map((id) => idMap.get(id))
    .filter((s): s is ICodeStatement => Boolean(s))
    .map((s) => statementToNode(s, idMap));

  let type = 'statement';
  if (stmt.hasMetric(MetricType.Group)) {
    type = 'group';
  } else if (stmt.hasMetric(MetricType.Duration)) {
    type = 'duration';
  } else if (stmt.hasMetric(MetricType.Action)) {
    type = 'action';
  } else if (stmt.hasMetric(MetricType.Intensity)) {
    type = 'intensity';
  } else if (stmt.hasMetric(MetricType.Text)) {
    type = 'text';
  }

  return {
    id: stmt.id,
    type,
    raw: (stmt.meta as { raw?: string })?.raw ?? '',
    from: stmt.meta?.startOffset ?? 0,
    to: stmt.meta?.endOffset ?? 0,
    metrics: rawMetrics,
    ...(hints.length > 0 ? { hints } : {}),
    children,
  };
}

/**
 * Builds a StatementNode tree from a parsed WhiteboardScript.
 */
export function buildStatementTree(script: WhiteboardScript): StatementNode {
  const idMap = new Map(script.statements.map((s) => [s.id, s]));
  const topLevel = script.statements.filter((s) => s.parent === undefined || !idMap.has(s.parent));

  if (topLevel.length === 1 && topLevel[0].children.length > 0) {
    return statementToNode(topLevel[0], idMap);
  }

  return {
    id: 0,
    type: 'root',
    raw: script.source,
    from: 0,
    to: script.source.length,
    metrics: [],
    children: topLevel.map((s) => statementToNode(s, idMap)),
  };
}
