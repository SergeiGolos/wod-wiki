import { PrecompiledNode, ITimerRuntime, IRuntimeBlock } from "@/core/timer.types";
import { TimedGroupBlock } from "../TimedGroupBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

export class TimedRepeaterBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: PrecompiledNode[]): boolean {
    // For now, only handle arrays with exactly one node
    if (nodes.length !== 1) {
      return false;
    }
    
    const node = nodes[0];
    const duration = node.duration();
    if (duration?.sign === "-"
      && (node?.rounds != null && node.rounds.length > 0
        && node.rounds() === 1)) {
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
      console.warn('TimedRepeaterBlockStrategy: Expected array with exactly one node');
      return undefined;
    }
    
    // Use the first (and only) node for compatibility with existing implementation
    return new TimedGroupBlock(nodes[0]);
  }
}
