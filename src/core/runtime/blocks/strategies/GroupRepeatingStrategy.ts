import { PrecompiledNode, IRuntimeBlock, ITimerRuntime } from "@/core/timer.types";
import { RepeatingBlock } from "../RepeatingBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for the standard Repeat pattern (no operator)
 * Each child individually goes through all rounds before moving to the next child
 */
export class GroupRepeatingStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: PrecompiledNode[]): boolean {
    // For now, only handle arrays with exactly one node
    if (nodes.length !== 1) {
      return false;
    }
    
    const node = nodes[0];
    const rounds = node.rounds();
    // Only handle repeating blocks with no specific operator (standard Repeat pattern)
    if (rounds != null && rounds > 1) {
      return true;
    }
    return false;
  }

  compile(
    nodes: PrecompiledNode[],
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    // Only handle the array if it contains exactly one node
    if (nodes.length !== 1) {
      console.warn('RepeatingBlockStrategy: Expected array with exactly one node');
      return undefined;
    }
    
    return new RepeatingBlock([nodes[0]]);
  }
}


