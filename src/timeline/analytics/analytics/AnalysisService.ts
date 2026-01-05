import { ExerciseDefinitionService } from '../../../services';
import { IProjectionEngine } from './IProjectionEngine';
import { ProjectionResult } from './ProjectionResult';
import { FragmentType } from '../../../core/models/CodeFragment';
import type { ICodeFragment } from '../../../core/models/CodeFragment';

/**
 * Central service for running analytical projections on runtime metrics.
 * 
 * The AnalysisService coordinates between the metric collection layer,
 * exercise definition lookup, and registered projection engines to produce
 * a comprehensive analysis of workout performance.
 * 
 * Phase 4 Cleanup: Simplified to use fragment-based path exclusively.
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
   * Run all registered projection engines on the provided fragments.
   * 
   * This is the fragment-based projection method introduced in Phase 2.
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
        const engineResults = engine.calculateFromFragments(exerciseFragments, exerciseId, definition);
        results.push(...engineResults);
      }
    }

    return results;
  }

  /**
   * Group fragments by exercise ID for targeted analysis.
   * 
   * Exercise ID is extracted from Effort fragments. Fragments are grouped
   * based on the most recently encountered Effort fragment before them.
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
        grouped.get(currentExerciseId)!.push(fragment);
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
