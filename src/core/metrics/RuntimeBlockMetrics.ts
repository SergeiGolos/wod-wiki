import { ITimerRuntime } from "../ITimerRuntime";
import { RuntimeMetric } from "../RuntimeMetric";
import { RuntimeMetricBuilder } from "./RuntimeMetricBuilder";

/**
 * Base implementation of the metrics method for runtime blocks.
 * Provides a default implementation that can be extended or used directly.
 */
export class RuntimeBlockMetrics {
  /**
   * Generates metrics for a runtime block using the RuntimeMetricBuilder.
   * 
   * @param runtime The timer runtime
   * @param sources An array of JitStatement sources
   * @returns An array of RuntimeMetric objects
   */
  public static buildMetrics(
    runtime: ITimerRuntime,
    sources: any[]
  ): RuntimeMetric[] {
    // Create a new builder and add all sources
    const builder = new RuntimeMetricBuilder();
    builder.addStatements(sources);
    
    // Build metrics using the runtime's blockKey
    return builder.build(runtime.blockKey);
  }
}