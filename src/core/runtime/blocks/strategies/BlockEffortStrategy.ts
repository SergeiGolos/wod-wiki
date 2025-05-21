import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { EffortBlock } from "../EffortBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for creating SingleBlock runtime blocks
 * Handles simple statements with duration and metrics but no children or repetitions
 */

export class BlockEffortStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: JitStatement[]): boolean {    
    return nodes.every(node => {
      const rounds = node.rounds();
      const hasEffort = node.efforts().length > 0;
      const hasRepetitions = node.repetitions().length > 0;
      const hasDuration = node.durations().length > 0;
      
      // Handle nodes with effort/repetitions and no children or rounds
      return rounds.length === 0 && 
             node.children.length === 0 && 
             (hasEffort || hasRepetitions || hasDuration);
    });
  }

  compile(
    nodes: JitStatement[],
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    return new EffortBlock(nodes);
  }
}
