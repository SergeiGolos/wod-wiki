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
   * Run all registered projection engines on the provided metrics.
   * 
   * This is the metrics-based projection method introduced in Phase 2.
   * Groups metrics by exercise ID (from metadata) and runs projections for each group.
   * 
   * @param metrics Array of code metrics to analyze
   * @returns Array of projection results from all engines
   */
  public runAllProjectionsFromFragments(metrics: IMetric[]): ProjectionResult[] {
    if (!this.exerciseService) {
      return [];
    }

    const results: ProjectionResult[] = [];

    // Group metrics by exercise ID (from metadata)
    const metricByExercise = this.groupFragmentsByExercise(metrics);

    // Run projections for each exercise
    for (const [exerciseId, exerciseFragments] of metricByExercise.entries()) {
      const definition = this.exerciseService.findById(exerciseId);

      if (!definition) {
        continue;
      }

      // Run all registered engines
      for (const engine of this.engines) {
        const engineResults = engine.calculateFromFragments(exerciseFragments, exerciseId, definition);
        results.push(...engineResults);
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
