import { StatementNodeDetail, IRuntimeBlock, ITimerRuntime } from "@/core/timer.types";
import { RoundRobinBlock } from "../RoundRobinBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for the Round-Robin pattern (- operator)
 * Each iteration of the parent round moves to the next child in the list
 * 
 * Example:
 * (3)
 *   - 10 Pullups
 *   - 20 Pushups
 *   - 30 Squats
 * 
 * Execution:
 * Round 1: Pullups
 * Round 2: Pushups
 * Round 3: Squats
 */
export class RoundRobinBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: StatementNodeDetail[]): boolean {
    // For now, only handle arrays with exactly one node
    if (nodes.length !== 1) {
      return false;
    }
    
    const node = nodes[0];
    
    // Handle repeating blocks with the Round-Robin (-) operator
    if (node?.rounds != null && node.rounds > 1 && node.groupOperator === "-") {
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
      console.warn('RoundRobinBlockStrategy: Expected array with exactly one node');
      return undefined;
    }
    
    // Use the first (and only) node for compatibility with existing implementation
    return new RoundRobinBlock(nodes[0]);
  }
}
