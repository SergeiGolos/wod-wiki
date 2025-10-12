import { RuntimeMetric } from '../runtime/RuntimeMetric';
import { ExerciseDefinitionService } from '../services/ExerciseDefinitionService';
import { IProjectionEngine } from './IProjectionEngine';
import { ProjectionResult } from './ProjectionResult';

/**
 * Central service for running analytical projections on runtime metrics.
 * 
 * The AnalysisService coordinates between the metric collection layer,
 * exercise definition lookup, and registered projection engines to produce
 * a comprehensive analysis of workout performance.
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
   * Groups metrics by exercise and runs projections for each group.
   * 
   * @param metrics Array of runtime metrics to analyze
   * @returns Array of projection results from all engines
   */
  public runAllProjections(metrics: RuntimeMetric[]): ProjectionResult[] {
    if (!this.exerciseService) {
      console.warn('AnalysisService: No exercise service configured');
      return [];
    }

    const results: ProjectionResult[] = [];
    
    // Group metrics by exercise ID
    const metricsByExercise = this.groupMetricsByExercise(metrics);
    
    // Run projections for each exercise
    for (const [exerciseId, exerciseMetrics] of metricsByExercise.entries()) {
      const definition = this.exerciseService.findById(exerciseId);
      
      if (!definition) {
        console.warn(`AnalysisService: No definition found for exercise: ${exerciseId}`);
        continue;
      }

      // Run all registered engines
      for (const engine of this.engines) {
        const engineResults = engine.calculate(exerciseMetrics, definition);
        results.push(...engineResults);
      }
    }
    
    return results;
  }

  /**
   * Group metrics by exercise ID for targeted analysis.
   * 
   * @param metrics Array of runtime metrics
   * @returns Map of exercise ID to metrics
   */
  private groupMetricsByExercise(metrics: RuntimeMetric[]): Map<string, RuntimeMetric[]> {
    const grouped = new Map<string, RuntimeMetric[]>();
    
    for (const metric of metrics) {
      if (!metric.exerciseId) continue;
      
      const existing = grouped.get(metric.exerciseId) || [];
      existing.push(metric);
      grouped.set(metric.exerciseId, existing);
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
