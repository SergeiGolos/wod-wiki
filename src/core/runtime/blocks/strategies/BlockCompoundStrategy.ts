import { PrecompiledNode, ITimerRuntime, IRuntimeBlock } from "@/core/timer.types";
import { EffortBlock } from "../EffortBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for creating EffortBlock runtime blocks
 * Handles simple statements with effort or repetition fragments but no children or repetitions
 */


export class BlockCompoundStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: PrecompiledNode[]): boolean {    
    return nodes.every(node => {
      const rounds = node.rounds();
      return rounds.length === 0 && node.children.length === 0;
    });
  }

  compile(
    nodes: PrecompiledNode[],
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    return new EffortBlock(nodes);
  }
}
