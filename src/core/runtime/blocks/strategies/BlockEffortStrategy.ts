import { PrecompiledNode, ITimerRuntime, IRuntimeBlock } from "@/core/timer.types";
import { EffortBlock } from "../EffortBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for creating SingleBlock runtime blocks
 * Handles simple statements with duration and metrics but no children or repetitions
 */


export class BlockEffortStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: PrecompiledNode[]): boolean {    
    return nodes.every(node => {
      const rounds = node.rounds();
      const hasEffort = node.effort().length > 0;
      const hasRepetitions = node.repetitions().length > 0;
      const hasDuration = node.duration().original !== undefined;
      
      // Handle nodes with effort/repetitions and no children or rounds
      return rounds.length === 0 && 
             node.children.length === 0 && 
             (hasEffort || hasRepetitions || hasDuration);
    });
  }

  compile(
    nodes: PrecompiledNode[],
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    return new EffortBlock(nodes, undefined);
  }
}
