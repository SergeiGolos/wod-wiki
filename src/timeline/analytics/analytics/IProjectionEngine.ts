import { RuntimeMetric } from '../runtime/RuntimeMetric';
import { Exercise } from '../exercise';
import { ProjectionResult } from './ProjectionResult';
import { ICodeFragment } from '../../../core/models/CodeFragment';

/**
 * Interface for projection engines that analyze runtime metrics.
 * 
 * Projection engines are specialized analyzers that take raw runtime metrics
 * and exercise context to produce meaningful analytical insights.
 * 
 * Each engine implements a specific type of analysis (e.g., volume, power, intensity)
 * and can be registered with the AnalysisService to run as part of a projection suite.
 * 
 * Phase 2 Update: Engines now support both RuntimeMetric (legacy) and ICodeFragment (new)
 * paths for metrics consolidation.
 */
export interface IProjectionEngine {
  /** Unique name identifying this projection engine */
  readonly name: string;
  
  /**
   * Calculate projections from runtime metrics.
   * 
   * @deprecated Use calculateFromFragments() for new code. This method is maintained
   * for backward compatibility during Phase 2 migration and will be removed in Phase 4.
   * 
   * @param metrics Array of runtime metrics to analyze
   * @param definition Exercise definition providing context
   * @returns Array of projection results (may be empty if analysis not applicable)
   */
  calculate(metrics: RuntimeMetric[], definition: Exercise): ProjectionResult[];
  
  /**
   * Calculate projections from code fragments.
   * 
   * This is the new fragment-based calculation method introduced in Phase 2.
   * Engines should implement this method to work directly with fragments instead
   * of converting from RuntimeMetric.
   * 
   * @param fragments Array of code fragments to analyze
   * @param exerciseId The exercise identifier
   * @param definition Exercise definition providing context
   * @returns Array of projection results (may be empty if analysis not applicable)
   */
  calculateFromFragments?(fragments: ICodeFragment[], exerciseId: string, definition: Exercise): ProjectionResult[];
}
