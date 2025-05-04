import { IRuntimeBlock, ITimerRuntime, StatementNode, StatementNodeDetail } from "../../../timer.types";
import { RuntimeScript } from "../../RuntimeScript";

/**
 * Interface for runtime block compilation strategies
 * Implements the Strategy pattern for different block types
 */
export interface IRuntimeBlockStrategy {
  /**
   * Check if this strategy applies to the given statement node
   * @param node The statement node to check
   * @returns True if this strategy can handle the node
   */
  canHandle(node: StatementNodeDetail): boolean;
  
  /**
   * Compile a statement node into a runtime block
   * @param node The statement node to compile
   * @param script The runtime script containing all statements   
   * @returns A compiled runtime block or undefined if compilation fails
   */
  compile(
    node: StatementNodeDetail, 
    runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined;
}