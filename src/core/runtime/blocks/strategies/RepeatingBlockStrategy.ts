import { StatementNodeDetail, IRuntimeBlock, ITimerRuntime } from "@/core/timer.types";
import { RepeatingBlock } from "../RepeatingBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for the standard Repeat pattern (no operator)
 * Each child individually goes through all rounds before moving to the next child
 */
export class RepeatingBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: StatementNodeDetail[]): boolean {
    // For now, only handle arrays with exactly one node
    if (nodes.length !== 1) {
      return false;
    }
    
    const node = nodes[0];
    
    // Only handle repeating blocks with no specific operator (standard Repeat pattern)
    if (node?.rounds != null && node.rounds > 1 && node.groupOperator === undefined) {
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
      console.warn('RepeatingBlockStrategy: Expected array with exactly one node');
      return undefined;
    }
    
    // Use the first (and only) node for compatibility with existing implementation
    return new RepeatingBlock(nodes[0]);
  }
}


