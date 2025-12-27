import { RuntimeMetric } from '../runtime/RuntimeMetric';
import { ExerciseDefinitionService } from '../services/ExerciseDefinitionService';
import { IProjectionEngine } from './IProjectionEngine';
import { ProjectionResult } from './ProjectionResult';
import { ICodeFragment, FragmentType } from '../../../core/models/CodeFragment';

/**
 * Central service for running analytical projections on runtime metrics.
 * 
 * The AnalysisService coordinates between the metric collection layer,
 * exercise definition lookup, and registered projection engines to produce
 * a comprehensive analysis of workout performance.
 * 
 * Phase 2 Update: Supports both RuntimeMetric (legacy) and ICodeFragment (new)
 * paths during the metrics consolidation migration.
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
   * @deprecated Use runAllProjectionsFromFragments() for new code. This method
   * is maintained for backward compatibility during Phase 2 migration.
   * 
   * @param metrics Array of runtime metrics to analyze
   * @returns Array of projection results from all engines
   */
  public runAllProjections(metrics: RuntimeMetric[]): ProjectionResult[] {
    if (!this.exerciseService) {
      return [];
    }

    const results: ProjectionResult[] = [];
    
    // Group metrics by exercise ID
    const metricsByExercise = this.groupMetricsByExercise(metrics);
    
    // Run projections for each exercise
    for (const [exerciseId, exerciseMetrics] of metricsByExercise.entries()) {
      const definition = this.exerciseService.findById(exerciseId);
      
      if (!definition) {
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
   * Run all registered projection engines on the provided fragments.
   * 
   * This is the new fragment-based projection method introduced in Phase 2.
   * Groups fragments by exercise ID (from metadata) and runs projections for each group.
   * 
   * @param fragments Array of code fragments to analyze
   * @returns Array of projection results from all engines
   */
  public runAllProjectionsFromFragments(fragments: ICodeFragment[]): ProjectionResult[] {
    if (!this.exerciseService) {
      return [];
    }

    const results: ProjectionResult[] = [];
    
    // Group fragments by exercise ID (from metadata)
    const fragmentsByExercise = this.groupFragmentsByExercise(fragments);
    
    // Run projections for each exercise
    for (const [exerciseId, exerciseFragments] of fragmentsByExercise.entries()) {
      const definition = this.exerciseService.findById(exerciseId);
      
      if (!definition) {
        continue;
      }

      // Run all registered engines
      for (const engine of this.engines) {
        // Prefer fragment-based calculation if available
        if (engine.calculateFromFragments) {
          const engineResults = engine.calculateFromFragments(exerciseFragments, exerciseId, definition);
          results.push(...engineResults);
        }
        // Fallback to legacy method not supported in fragment path
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
   * Group fragments by exercise ID for targeted analysis.
   * 
   * Exercise ID is extracted from Effort fragments. Fragments are grouped
   * based on the most recently encountered Effort fragment before them.
   * Fragments without a preceding Effort fragment are skipped.
   * 
   * @param fragments Array of code fragments
   * @returns Map of exercise ID to fragments
   */
  private groupFragmentsByExercise(fragments: ICodeFragment[]): Map<string, ICodeFragment[]> {
    const grouped = new Map<string, ICodeFragment[]>();
    let currentExerciseId: string | null = null;
    
    for (const fragment of fragments) {
      // Check if this is an Effort fragment (contains exercise ID)
      if (fragment.fragmentType === FragmentType.Effort && typeof fragment.value === 'string') {
        currentExerciseId = fragment.value;
        // Initialize array for this exercise if not exists
        if (!grouped.has(currentExerciseId)) {
          grouped.set(currentExerciseId, []);
        }
        continue; // Don't include the Effort fragment itself
      }
      
      // Add fragment to current exercise group
      if (currentExerciseId) {
        const existing = grouped.get(currentExerciseId) || [];
        existing.push(fragment);
        grouped.set(currentExerciseId, existing);
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
