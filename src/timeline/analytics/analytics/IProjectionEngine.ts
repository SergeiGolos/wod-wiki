import type { Exercise } from '../../../exercise';
import type { ProjectionResult } from './ProjectionResult';
import type { IMetric } from '../../../core/models/Metric';

/**
 * Interface for projection engines that analyze runtime metrics.
 * 
 * Projection engines are specialized analyzers that take raw runtime metrics
 * and exercise context to produce meaningful analytical insights.
 * 
 * Each engine implements a specific type of analysis (e.g., volume, power, intensity)
 * and can be registered with the AnalysisService to run as part of a projection suite.
 * 
 * Engines work directly with IMetric for metrics analysis.
 * paths for metrics consolidation.
 */
export interface IProjectionEngine {
  /** Unique name identifying this projection engine */
  readonly name: string;

  /**
   * Calculate projections from code metrics.
   * 
   * This is the metrics-based calculation method introduced in Phase 2.
   * Engines must work directly with metric.
   * 
   * @param metrics Array of code metrics to analyze
   * @param exerciseId The exercise identifier
   * @param definition Exercise definition providing context
   * @returns Array of projection results (may be empty if analysis not applicable)
   */
  calculateFromFragments(metrics: IMetric[], exerciseId: string, definition: Exercise): ProjectionResult[];
}
