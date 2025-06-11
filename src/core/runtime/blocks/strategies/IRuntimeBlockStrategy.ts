import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/types/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { RuntimeMetric } from "@/core/types/RuntimeMetric";

/**
 * Interface for runtime block compilation strategies
 * Implements the Strategy pattern for different block types
 * Phase 4: Updated to support pre-compiled metrics with legacy source compatibility
 */
export interface IRuntimeBlockStrategy {
  /**
   * Check if this strategy applies to the given precompiled nodes
   * @param nodes Array of precompiled nodes to check
   * @returns True if this strategy can handle the nodes
   */
  canHandle(nodes: JitStatement[], runtime: ITimerRuntime): boolean;
  
  /**
   * Compile statement nodes into a runtime block
   * Phase 4: Now receives pre-compiled metrics and legacy sources
   * @param compiledMetrics Pre-compiled metrics from fragment compilation
   * @param legacySources Array of original statement nodes (for backward compatibility)
   * @param runtime The runtime instance   
   * @returns A compiled runtime block or undefined if compilation fails
   */
  compile(
    compiledMetrics: RuntimeMetric[],
    legacySources: JitStatement[], 
    runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined;
}