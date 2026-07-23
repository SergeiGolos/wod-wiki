/**
 * Type definitions for markdown editor components
 */

import { ICodeStatement } from '../../../core/models/CodeStatement';
import type { ScriptRuntime } from '@/hooks/useRuntimeTimer';
import type { MdTimerRuntime } from '@/hooks/useRuntimeParser';
import { IMetric } from '../../../core/models/Metric';
import { IOutputStatement, OutputStatementType } from '../../../core/models/OutputStatement';
import { getHints } from '../../../core/metrics/hints';
import type { ParseError } from '@/core';
export * from './section';
export type { FenceDialect } from './section';
export { VALID_FENCE_DIALECTS } from './section';
export type { DocumentItem, DocumentItemType } from '../utils/documentStructure';

/**
 * State of a WOD block
 */
export type ScriptBlockState =
  | 'idle'       // Not parsed yet
  | 'parsing'    // Parse in progress
  | 'parsed'     // Successfully parsed
  | 'error'      // Parse error
  | 'starting'   // Runtime initializing
  | 'running'    // Workout in progress
  | 'paused'     // Workout paused
  | 'completed'  // Workout finished
  | 'stopped';   // Workout stopped early

/**
 * Parse error information - re-exported from core types
 */
export type { ParseError } from '@/core';


/**
 * Plain-data snapshot of a runtime OutputStatement safe for JSON / IndexedDB
 * round-trips. Class methods and non-serialisable fields (Set, Map,
 * MetricContainer instances) are intentionally excluded.
 *
 * Use `toStoredOutputStatement()` to create one from a live IOutputStatement.
 */
export interface StoredOutputStatement {
  readonly id: number;
  readonly outputType: OutputStatementType;
  readonly timeSpan: { started: number; ended?: number };
  /** Flat IMetric array — MetricContainer class not needed after serialisation. */
  readonly metrics: IMetric[];
  /** Plain string array — Set<string> does not survive JSON serialisation. */
  readonly hints?: string[];
  readonly sourceBlockKey: string;
  readonly stackLevel: number;
  readonly parent?: number;
  readonly sourceStatementId?: number;
  readonly completionReason?: string;
}

/**
 * Convert a live IOutputStatement into a StoredOutputStatement.
 *
 * Normalises non-serialisable types (`Set` → `string[]`, `MetricContainer` → `IMetric[]`)
 * so the result survives a JSON / IndexedDB round-trip without data loss.
 */
export function toStoredOutputStatement(output: IOutputStatement): StoredOutputStatement {
  return {
    id: output.id,
    outputType: output.outputType,
    timeSpan: { started: output.timeSpan.started, ended: output.timeSpan.ended },
    metrics: output.metrics.toArray(),
    hints: (() => { const h = getHints(output); return h.length ? h : undefined; })(),
    sourceBlockKey: output.sourceBlockKey,
    stackLevel: output.stackLevel,
    parent: output.parent,
    sourceStatementId: output.sourceStatementId,
    completionReason: output.completionReason,
  };
}

/**
 * Results from a completed workout.
 */
export interface WorkoutResults {
  /** When workout started */
  startTime: number;

  /** When workout ended */
  endTime: number;

  /** Total elapsed time (ms) */
  duration: number;

  /** Rounds completed (for rounds-based workouts) */
  roundsCompleted?: number;

  /** Total rounds (for rounds-based workouts) */
  totalRounds?: number;

  /** Reps completed (for rep-based workouts) */
  repsCompleted?: number;

  /**
   * Plain-data runtime output log — safe for IndexedDB storage and JSON
   * round-trips. Populated by serialising live IOutputStatement values via
   * `toStoredOutputStatement()` at workout completion.
   *
   * Single stream holding ALL tiers: Tier 0 (raw tracking) + Tier 1 (inline
   * annotations) + Tier 2 (summary outputs, outputType 'analytics'). The
   * outputType filter discriminates Tier 2 — there is deliberately no
   * separate analytics property (CONTEXT.md, 2026-07-20).
   */
  logs?: StoredOutputStatement[];

  /** Whether workout was completed or stopped early */
  completed: boolean;
}

/**
 * Represents a single WOD block within the markdown document
 */
export interface ScriptBlock {
  /** Unique identifier for this block */
  id: string;
  /** Content-stable identity — hash of fenced content, survives line moves (see `blockContentId`). */
  contentId?: string;

  /** WOD dialect — determines which strategies are loaded */
  dialect?: import('./section').FenceDialect;

  /** Line number where ```wod/```log/```plan appears (0-indexed) */
  startLine: number;

  /** Line number where closing ``` appears (0-indexed) */
  endLine: number;

  /** Raw text content of the WOD block (without backticks) */
  content: string;

  /** Parser instance for this block (lazy-initialized) */
  parser?: MdTimerRuntime;

  /** Parsed statements (populated after parsing) */
  statements?: ICodeStatement[];

  /** Parse errors, if any */
  errors?: ParseError[];

  /** Runtime instance (only when workout is active) */
  runtime?: ScriptRuntime;

  /** Execution state */
  state: ScriptBlockState;

  /** Monaco widget/zone IDs for cleanup */
  widgetIds: {
    overlay?: string;
    clockZone?: string;
    resultsZone?: string;
  };

  /** Collected workout data (after completion) */
  results?: WorkoutResults;

  /** Block version */
  version: number;

  /** Creation timestamp */
  createdAt: number;
}
