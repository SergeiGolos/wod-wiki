import { PrecompiledNode, ITimerRuntime, IRuntimeBlock } from "@/core/timer.types";
import { EffortBlock } from "../EffortBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for creating SingleBlock runtime blocks
 * Handles simple statements with duration and metrics but no children or repetitions
 */


export class BlockCompoundStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: PrecompiledNode[]): boolean {    
    return nodes.every(node => node.rounds() === 1 && node.children?.length === 0);
  }

  compile(
    nodes: PrecompiledNode[],
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    return new EffortBlock(nodes);
  }
}
