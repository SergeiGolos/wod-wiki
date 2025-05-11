import { IRuntimeBlock, ITimerRuntime, StatementNodeDetail } from "../../../timer.types";

/**
 * Interface for runtime block compilation strategies
 * Implements the Strategy pattern for different block types
 */
export interface IRuntimeBlockStrategy {
  /**
   * Check if this strategy applies to the given statement nodes
   * @param nodes Array of statement nodes to check
   * @returns True if this strategy can handle the nodes
   */
  canHandle(nodes: StatementNodeDetail[]): boolean;
  
  /**
   * Compile statement nodes into a runtime block
   * @param nodes Array of statement nodes to compile
   * @param runtime The runtime instance   
   * @returns A compiled runtime block or undefined if compilation fails
   */
  compile(
    nodes: StatementNodeDetail[], 
    runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined;
}