import { ExerciseDefinitionService } from '../../../services';
import { IProjectionEngine } from './IProjectionEngine';
import { ProjectionResult } from './ProjectionResult';
import { MetricType } from '../../../core/models/Metric';
import type { IMetric } from '../../../core/models/Metric';

/**
 * Central service for running analytical projections on runtime metrics.
 * 
 * The AnalysisService coordinates between the metric collection layer,
 * exercise definition lookup, and registered projection engines to produce
 * a comprehensive analysis of workout performance.
 * 
 * Phase 4 Cleanup: Simplified to use metrics-based path exclusively.
 */
export class AnalysisService {
  private engines: IProjectionEngine[] = [];
  private exerciseService?: ExerciseDefinitionService;

  /**
   * Register a projection engine with the service.
   * 
   * @param engine The projection engine to register
   */
  public registerEngine(engine: IProjectionEngine): void {
    this.engines.push(engine);
  }

  /**
   * Set the exercise definition service for context lookup.
   * 
   * @param service The exercise definition service
   */
  public setExerciseService(service: ExerciseDefinitionService): void {
    this.exerciseService = service;
  }

  /**
   * Run per-exercise projections on the provided metrics.
   *
   * Groups metrics by exercise ID (from Effort metrics) and calls
   * `calculateFromFragments` on engines that implement it.
   * Requires an exercise service to be set; returns [] otherwise.
   *
   * @param metrics Array of metrics to analyze
   */
  public runAllProjectionsFromFragments(metrics: IMetric[]): ProjectionResult[] {
    if (!this.exerciseService) {
      return [];
    }

    const results: ProjectionResult[] = [];
    const metricByExercise = this.groupFragmentsByExercise(metrics);

    for (const [exerciseId, exerciseFragments] of metricByExercise.entries()) {
      const definition = this.exerciseService.findById(exerciseId);
      if (!definition) continue;

      for (const engine of this.engines) {
        if (engine.calculateFromFragments) {
          try {
            results.push(...engine.calculateFromFragments(exerciseFragments, exerciseId, definition));
          } catch (err) {
            console.error(`[AnalysisService] Error in engine '${engine.name}' (per-exercise):`, err);
          }
        }
      }
    }

    return results;
  }

  /**
   * Run workout-level projections on all accumulated metrics.
   *
   * Calls `calculateFromWorkout` on every engine that implements it.
   * Does not require exercise grouping or definition lookup.
   *
   * @param metrics All metrics collected so far in the workout session
   */
  public runWorkoutProjections(metrics: IMetric[]): ProjectionResult[] {
    const results: ProjectionResult[] = [];

    for (const engine of this.engines) {
      if (engine.calculateFromWorkout) {
        try {
          results.push(...engine.calculateFromWorkout(metrics));
        } catch (err) {
          console.error(`[AnalysisService] Error in engine '${engine.name}' (workout):`, err);
        }
      }
    }

    return results;
  }

  /**
   * Group metrics by exercise ID for targeted analysis.
   * 
   * Exercise ID is extracted from Effort metrics. Fragments are grouped
   * based on the most recently encountered Effort metrics before them.
   * 
   * @param metrics Array of code metrics
   * @returns Map of exercise ID to metrics
   */
  private groupFragmentsByExercise(metrics: IMetric[]): Map<string, IMetric[]> {
    const grouped = new Map<string, IMetric[]>();
    let currentExerciseId: string | null = null;

    for (const metric of metrics) {
      // Check if this is an Effort metric (contains exercise ID)
      if (metric.type === MetricType.Effort && typeof metric.value === 'string') {
        currentExerciseId = metric.value;
        // Initialize array for this exercise if not exists
        if (!grouped.has(currentExerciseId)) {
          grouped.set(currentExerciseId, []);
        }
        continue; // Don't include the Effort metric itself
      }

      // Add metric to current exercise group
      if (currentExerciseId) {
        grouped.get(currentExerciseId)!.push(metric);
      }
    }

    return grouped;
  }

  /**
   * Get all registered engines.
   * 
   * @returns Array of registered projection engines
   */
  public getEngines(): IProjectionEngine[] {
    return [...this.engines];
  }

  /**
   * Clear all registered engines.
   */
  public clearEngines(): void {
    this.engines = [];
  }
}
