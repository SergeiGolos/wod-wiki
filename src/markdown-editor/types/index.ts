/**
 * Type definitions for markdown editor components
 */

import { ICodeStatement } from '../../core/models/CodeStatement';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { MdTimerRuntime } from '../../parser/md-timer';
import { ICodeFragment } from '../../core/models/CodeFragment';
import { MetricBehavior } from '../../types/MetricBehavior';
export * from './section';
export type { WodDialect } from './section';
export { VALID_WOD_DIALECTS } from './section';

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
 * Parse error information
 */
export interface ParseError {
  /** Line number (1-indexed for display) */
  line?: number;

  /** Column number (1-indexed for display) */
  column?: number;

  /** Error message */
  message: string;

  /** Severity level */
  severity: 'error' | 'warning' | 'info';

  /** Code excerpt showing the error */
  excerpt?: string;
}

/**
 * Workout metric fragment collected during execution.
 * Uses unified ICodeFragment format with MetricBehavior for consistency.
 * 
 * Replaces legacy WorkoutMetric ad-hoc format in Phase 3.
 */
export interface WorkoutMetricFragment {
  /** The code fragment representing this metric */
  fragment: ICodeFragment;
  /** Behavior classification (Collected, Recorded, etc.) */
  behavior?: MetricBehavior;
  /** Timestamp when collected */
  timestamp?: number;
}

/**
 * Results from a completed workout.
 * Uses fragment-based metrics for unified representation.
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

  /** Metrics collected from runtime (fragment-based format) */
  metrics: WorkoutMetricFragment[];

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
