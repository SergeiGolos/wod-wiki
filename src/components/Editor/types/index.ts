/**
 * Type definitions for markdown editor components
 */

import { ICodeStatement } from '../../../core/models/CodeStatement';
import type { ScriptRuntime } from '@/hooks/useRuntimeTimer';
import type { MdTimerRuntime } from '@/hooks/useRuntimeParser';
import { IMetric } from '../../../core/models/Metric';
import { IOutputStatement } from '../../../core/models/OutputStatement';
import type { ParseError } from '@/core';
export * from './section';
export type { WodDialect } from './section';
export { VALID_WOD_DIALECTS } from './section';
export type { DocumentItem, DocumentItemType } from '../utils/documentStructure';

/**
 * State of a WOD block
 */
export type WodBlockState =
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


import { MetricOrigin } from '../../../core/models/Metric';

/**
 * Workout metrics metrics collected during execution.
 * Uses unified IMetric format with MetricOrigin for consistency.
 * 
 * Replaces legacy WorkoutMetric ad-hoc format in Phase 3.
 */
export interface WorkoutMetricFragment {
  /** The code metrics representing this metrics */
  metric: IMetric;
  /** Origin classification (Collected, Recorded, etc.) */
  origin?: MetricOrigin;
  /** Timestamp when collected */
  timestamp?: number;
}

/**
 * Results from a completed workout.
 * Uses metric-based metrics for unified representation.
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

  /** Metrics collected from runtime (metrics-based format) */
  metrics: WorkoutMetricFragment[];

  /** The detailed runtime logs (splits, reps) */
  logs?: IOutputStatement[];

  /** Whether workout was completed or stopped early */
  completed: boolean;
}

/**
 * Represents a single WOD block within the markdown document
 */
export interface WodBlock {
  /** Unique identifier for this block */
  id: string;

  /** WOD dialect — determines which strategies are loaded */
  dialect?: import('./section').WodDialect;

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
  state: WodBlockState;

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
