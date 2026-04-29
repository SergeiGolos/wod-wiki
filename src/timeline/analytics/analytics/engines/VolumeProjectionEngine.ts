import { IAnalyticsStage } from '../../../../core/analytics/IAnalyticsStage';
import { extractMetrics } from '../../../../core/analytics/extractMetrics';
import { Exercise } from '../../../../exercise';
import { ProjectionResult } from '../ProjectionResult';
import { IMetric, MetricType } from '../../../../core/models/Metric';
import { IOutputStatement } from '../../../../core/models/OutputStatement';
import { TimeSpan } from '../../../../runtime/models/TimeSpan';

/**
 * Projection engine for calculating volume-based metrics.
 * 
 * Volume is calculated as: repetitions × resistance (weight)
 * This is a fundamental metric for strength training analysis.
 * 
 * Phase 4 Cleanup: Simplified to use metrics-based path exclusively.
 * 
 * @example
 * ```typescript
 * // Fragments: [Effort: Bench Press], [Rep: 10], [Resistance: 100kg]
 * // Result: Total Volume = 1000kg
 * ```
 */
export class VolumeProjectionEngine implements IAnalyticsStage {
  public readonly id = 'volume-projection';
  public readonly name = "VolumeProjectionEngine";

  project(outputs: IOutputStatement[]): ProjectionResult[] {
    const allMetrics = extractMetrics(outputs);
    const workoutResults = this.calculateFromWorkout(allMetrics);
    const exerciseResults = this._runPerExercise(allMetrics);
    return exerciseResults.length > 0 ? exerciseResults : workoutResults;
  }

  private _runPerExercise(metrics: IMetric[]): ProjectionResult[] {
    const grouped = new Map<string, IMetric[]>();
    let currentExerciseId: string | null = null;

    for (const metric of metrics) {
      if (metric.type === MetricType.Effort && typeof metric.value === 'string') {
        currentExerciseId = metric.value;
        if (!grouped.has(currentExerciseId)) grouped.set(currentExerciseId, []);
        continue;
      }
      if (currentExerciseId) grouped.get(currentExerciseId)!.push(metric);
    }

    const results: ProjectionResult[] = [];
    for (const [exerciseId, frags] of grouped.entries()) {
      const stubExercise = { name: exerciseId } as any;
      results.push(...this.calculateFromFragments(frags, exerciseId, stubExercise));
    }
    return results;
  }

  /**
   * Calculate volume from code metrics.
   * 
   * Extracts repetitions and resistance from metrics and calculates
   * total volume.
   * 
   * **Fragment Pairing:**
   * Fragments are processed sequentially. A set is calculated when both
   * Rep and Resistance metrics are encountered.
   * 
   * @param metrics Array of code metrics for a single exercise
   * @param exerciseId Exercise identifier
   * @param definition Exercise definition
   * @returns Array with single volume projection result, or empty if no valid data
   */
  calculateFromFragments(metrics: IMetric[], _exerciseId: string, definition: Exercise): ProjectionResult[] {
    if (metrics.length === 0) return [];

    let totalVolume = 0;
    let hasValidData = false;
    let totalSets = 0;

    // Group metrics into sets (count rep/resistance pairs)
    let currentReps: number | undefined;
    let currentResistance: number | undefined;

    for (const metric of metrics) {
      if (metric.type === MetricType.Rep && typeof metric.value === 'number') {
        currentReps = metric.value;
      } else if (metric.type === MetricType.Resistance && typeof metric.value === 'number') {
        currentResistance = metric.value;
      }

      // Calculate volume when we have both values
      if (currentReps !== undefined && currentResistance !== undefined) {
        totalVolume += currentReps * currentResistance;
        hasValidData = true;
        totalSets++;
        // Reset for next set
        currentReps = undefined;
        currentResistance = undefined;
      }
    }

    // Don't return a result if no valid data was found
    if (!hasValidData) {
      return [];
    }

    const now = new Date();

    return [{
      name: "Total Volume",
      value: totalVolume,
      unit: "kg",
      metricType: MetricType.Volume,
      timeSpan: new TimeSpan(now.getTime(), now.getTime()),
      metadata: {
        exerciseName: definition.name,
        totalSets,
        source: 'metrics',
      }
    }];
  }

  /**
   * Workout-level volume: sum reps × resistance across ALL exercises.
   */
  calculateFromWorkout(metrics: IMetric[]): ProjectionResult[] {
    let totalVolume = 0;
    let currentReps: number | undefined;
    let currentResistance: number | undefined;

    for (const m of metrics) {
      if (m.type === MetricType.Rep && typeof m.value === 'number') {
        currentReps = m.value;
      } else if (m.type === MetricType.Resistance) {
        const val = m.value as any;
        const amount = typeof val?.amount === 'number' ? val.amount : (typeof val === 'number' ? val : undefined);
        if (amount !== undefined) currentResistance = amount;
      }

      if (currentReps !== undefined && currentResistance !== undefined) {
        totalVolume += currentReps * currentResistance;
        currentReps = undefined;
        currentResistance = undefined;
      }
    }

    if (totalVolume === 0) return [];

    const now = new Date();
    return [{
      name: 'Volume Load',
      value: totalVolume,
      unit: 'kg',
      metricType: MetricType.Volume,
      timeSpan: new TimeSpan(now.getTime(), now.getTime()),
    }];
  }
}
