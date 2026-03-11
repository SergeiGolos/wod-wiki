import type { Exercise } from '../../../exercise';
import type { ProjectionResult } from './ProjectionResult';
import type { IMetric } from '../../../core/models/Metric';

/**
 * Interface for projection engines that analyze runtime metrics.
 *
 * Projection engines form the aggregation pipeline (Pipeline B). They operate
 * on collected IMetric arrays — either per-exercise or over the whole workout —
 * and produce ProjectionResult summaries that surface in the tracker UI.
 *
 * Two calculation paths:
 *  - calculateFromFragments: per-exercise analysis (needs exercise definition)
 *  - calculateFromWorkout:   workout-level totals (no exercise context needed)
 *
 * Engines may implement one or both paths.
 */
export interface IProjectionEngine {
  /** Unique name identifying this projection engine */
  readonly name: string;

  /**
   * Per-exercise projection. Called by AnalysisService for each exercise group.
   *
   * @param metrics Metrics scoped to a single exercise
   * @param exerciseId The exercise identifier
   * @param definition Exercise definition for context
   */
  calculateFromFragments?(metrics: IMetric[], exerciseId: string, definition: Exercise): ProjectionResult[];

  /**
   * Workout-level projection. Called by AnalysisService.runWorkoutProjections()
   * with ALL metrics from the session so far.
   *
   * @param metrics All accumulated metrics for the workout
   */
  calculateFromWorkout?(metrics: IMetric[]): ProjectionResult[];
}
