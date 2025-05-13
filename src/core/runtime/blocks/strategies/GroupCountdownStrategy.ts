import { PrecompiledNode, ITimerRuntime, IRuntimeBlock } from "@/core/timer.types";
import { TimedGroupBlock } from "../TimedGroupBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";


export class GroupCountdownStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: PrecompiledNode[]): boolean {
    // For now, only handle arrays with exactly one node
    if (nodes.length !== 1) {
      return false;
    }

    const node = nodes[0];
    const duration = node.duration();
    const rounds = node.rounds();

    if (duration?.sign === "-" && duration.original != undefined && duration.original > 0
      && (rounds != null && rounds === 1)) {
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
