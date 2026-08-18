import type { IMetric } from '../models/Metric';
import type { OutputStatementType } from '../models/OutputStatement';

/**
 * Plain-data snapshot of a runtime OutputStatement safe for JSON / IndexedDB
 * round-trips. Class methods and non-serialisable fields (Set, Map,
 * MetricContainer instances) are intentionally excluded.
 *
 * The live->stored converter `toStoredOutputStatement` lives in `@bitcobblers/wod-wiki-lang`
 * because it requires the hint evaluation protocol.
 */
export interface StoredOutputStatement {
  readonly id?: number;
  readonly line?: number;
  readonly text?: string;
  readonly dialect?: string;
  readonly outputType?: OutputStatementType;
  readonly timeSpan?: { started: number; ended?: number };
  /** Flat IMetric array — MetricContainer class not needed after serialisation. */
  readonly metrics: IMetric[] | { name?: string; type?: string; value?: unknown; unit?: string; origin?: string }[];
  /** Plain string array — Set<string> does not survive JSON serialisation. */
  readonly hints?: string[];
  readonly sourceBlockKey?: string;
  readonly stackLevel?: number;
  readonly parent?: number;
  readonly sourceStatementId?: number;
  readonly completionReason?: string;
  readonly timestamp?: number;
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
  duration?: number;

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
   * annotations) + Tier 2 (summary outputs, outputType 'analytics').
   */
  logs?: StoredOutputStatement[];

  /** Whether workout was completed or stopped early */
  completed: boolean;
}
