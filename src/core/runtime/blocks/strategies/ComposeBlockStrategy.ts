import { StatementNodeDetail, IRuntimeBlock, ITimerRuntime } from "@/core/timer.types";
import { ComposeBlock } from "../ComposeBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for the Compose pattern (+ operator)
 * All children are executed as a single unit per round
 * 
 * Example:
 * (3)
 *   + 10 Pullups
 *   + 20 Pushups
 *   + 30 Squats
 * 
 * Execution:
 * Round 1: Pullups, then Pushups, then Squats
 * Round 2: Pullups, then Pushups, then Squats
 * Round 3: Pullups, then Pushups, then Squats
 */
export class ComposeBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: StatementNodeDetail[]): boolean {
    // For now, only handle arrays with exactly one node
    if (nodes.length !== 1) {
      return false;
    }
    
    const node = nodes[0];
    
    // Handle repeating blocks with the Compose (+) operator
    if (node?.rounds != null && node.rounds > 1 && node.groupOperator === "+") {
      return true;
    }
    return false;
  }

  compile(
    nodes: StatementNodeDetail[],
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    // Only handle the array if it contains exactly one node
    if (nodes.length !== 1) {
      console.warn('ComposeBlockStrategy: Expected array with exactly one node');
      return undefined;
    }
    
    // Use the first (and only) node for compatibility with existing implementation
    return new ComposeBlock(nodes[0]);
  }
}
