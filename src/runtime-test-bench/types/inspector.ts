/**
 * WodBlockInspector — type definitions for the metric cascade debug view.
 *
 * Two-tier model:
 *   Span  — one record per pipeline level (parser, dialect, plan, runtime, etc.)
 *   Entry — one record per metric × span (denormalized, dynamic MetricType)
 */

import type { IMetric } from '../../core/models/Metric';
import type { IProjectionEngine } from '../../timeline/analytics/analytics/IProjectionEngine';
import type { ProjectionResult } from '../../timeline/analytics/analytics/ProjectionResult';

// ─── Span levels ─────────────────────────────────────────────────────────────

/** All pipeline levels in timeline order. */
export type SpanLevel =
  | 'parser'
  | 'dialect'
  | 'plan'
  | 'compiler'
  | 'runtime'
  | 'processing'
  | 'collected'
  | 'summary';

/** Branches group related levels for display. */
export type SpanBranch = 'compile' | 'runtime' | 'analytics';

export const SPAN_BRANCH: Record<SpanLevel, SpanBranch> = {
  parser:     'compile',
  dialect:    'compile',
  plan:       'compile',
  compiler:   'runtime',
  runtime:    'runtime',
  processing: 'runtime',
  collected:  'runtime',
  summary:    'analytics',
};

// ─── Metric entry state ───────────────────────────────────────────────────────

/** How a metric value arrived at a given level. */
export type MetricEntryState =
  | 'set'        // ● explicitly set at this level
  | 'inherited'  // ↑ propagated from nearest ancestor
  | 'suppressed' // ✕ hidden at this level and below until re-set
  | 'estimate'   // ~ plan-time prediction, may be replaced
  | 'computed'   // derived formula (analytics/summary)
  | 'collected'  // user-provided post-runtime
  | 'pending';   // level has not run yet

export const STATE_SYMBOL: Record<MetricEntryState, string> = {
  set:        '●',
  inherited:  '↑',
  suppressed: '✕',
  estimate:   '~',
  computed:   '∑',
  collected:  '◎',
  pending:    '…',
};

// ─── Tier 1: Span ─────────────────────────────────────────────────────────────

export interface MetricSpan {
  readonly spanId: string;
  readonly level: SpanLevel;
  readonly branch: SpanBranch;
  readonly parentSpanId?: string;
  readonly label?: string;       // e.g. "Line: 1 '3x10 bench press'"
  readonly startedAt?: number;   // epoch ms
  readonly endedAt?: number;
}

// ─── Tier 2: Entry ────────────────────────────────────────────────────────────

export interface MetricEntry {
  readonly entryId: string;
  readonly spanId: string;
  readonly metricKey: string;         // e.g. 'reps', 'duration', 'intensity'
  readonly metricType: string;        // dynamic — e.g. 'count', 'duration', 'scale_1_10'
  readonly value?: unknown;
  readonly unit?: string;
  readonly state: MetricEntryState;
  readonly sourceMetric?: IMetric;    // original IMetric if applicable
}

// ─── Resolved row (view layer) ───────────────────────────────────────────────

/**
 * One row in a rendered metric table.
 * Resolved across multiple spans using inheritance rules.
 */
export interface ResolvedMetricRow {
  metricKey: string;
  metricType: string;
  unit?: string;
  cells: Partial<Record<SpanLevel, ResolvedCell>>;
}

export interface ResolvedCell {
  value?: unknown;
  state: MetricEntryState;
  displayValue: string;   // STATE_SYMBOL + formatted value
}

// ─── Analytics engine snapshot ───────────────────────────────────────────────

export type EngineStatus = 'pending' | 'running' | 'complete' | 'error';

export interface EngineSnapshot {
  engine: IProjectionEngine;
  status: EngineStatus;
  results: ProjectionResult[];
  error?: string;
}

// ─── Inspector state machine ─────────────────────────────────────────────────

export type InspectorPhase =
  | 'idle'
  | 'compile_ready'
  | 'plan_ready'
  | 'running'
  | 'processing'
  | 'collected'
  | 'analytics_ready'
  | 'complete';

export interface InspectorState {
  phase: InspectorPhase;
  dialect: string;
  content: string;

  /** Tier 1 — all spans indexed by spanId */
  spans: Record<string, MetricSpan>;

  /** Tier 2 — all entries indexed by entryId */
  entries: Record<string, MetricEntry>;

  /** Analytics engine snapshots */
  engines: EngineSnapshot[];

  /** Parse errors if any */
  errors: string[];
}

// ─── Inspector actions ────────────────────────────────────────────────────────

export type InspectorAction =
  | { type: 'SET_CONTENT'; payload: { content: string; dialect: string } }
  | { type: 'COMPILE_COMPLETE'; payload: { spans: MetricSpan[]; entries: MetricEntry[] } }
  | { type: 'PLAN_COMPLETE'; payload: { spans: MetricSpan[]; entries: MetricEntry[] } }
  | { type: 'RUNTIME_BLOCK_REPORTED'; payload: { spans: MetricSpan[]; entries: MetricEntry[] } }
  | { type: 'PROCESSING_COMPLETE'; payload: { spans: MetricSpan[]; entries: MetricEntry[] } }
  | { type: 'COLLECTED'; payload: { spans: MetricSpan[]; entries: MetricEntry[] } }
  | { type: 'ENGINE_STARTED'; payload: { engineName: string } }
  | { type: 'ENGINE_COMPLETE'; payload: { engineName: string; results: ProjectionResult[] } }
  | { type: 'ENGINE_ERROR'; payload: { engineName: string; error: string } }
  | { type: 'SUMMARY_COMPLETE'; payload: { spans: MetricSpan[]; entries: MetricEntry[] } }
  | { type: 'SET_ERRORS'; payload: string[] }
  | { type: 'RESET' };
