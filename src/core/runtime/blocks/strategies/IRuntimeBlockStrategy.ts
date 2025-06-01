import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";

/**
 * Interface for runtime block compilation strategies
 * Implements the Strategy pattern for different block types
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
   * @param nodes Array of precompiled nodes to compile
   * @param runtime The runtime instance   
   * @returns A compiled runtime block or undefined if compilation fails
   */
  compile(
    nodes: JitStatement[], 
    runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined;
}