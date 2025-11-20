import { RuntimeMetric } from '../runtime/RuntimeMetric';
import { Exercise } from '../exercise';
import { ProjectionResult } from './ProjectionResult';

/**
 * Interface for projection engines that analyze runtime metrics.
 * 
 * Projection engines are specialized analyzers that take raw runtime metrics
 * and exercise context to produce meaningful analytical insights.
 * 
 * Each engine implements a specific type of analysis (e.g., volume, power, intensity)
 * and can be registered with the AnalysisService to run as part of a projection suite.
 */
export interface IProjectionEngine {
  /** Unique name identifying this projection engine */
  readonly name: string;
  
  /**
   * Calculate projections from runtime metrics.
   * 
   * @param metrics Array of runtime metrics to analyze
   * @param definition Exercise definition providing context
   * @returns Array of projection results (may be empty if analysis not applicable)
   */
  calculate(metrics: RuntimeMetric[], definition: Exercise): ProjectionResult[];
}
