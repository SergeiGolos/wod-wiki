import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { EffortBlock } from "../EffortBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { RuntimeMetric } from "@/core/RuntimeMetric";

/**
 * Strategy for creating EffortBlock runtime blocks
 * Handles simple statements with duration and metrics but no children or repetitions
 * Phase 4: Updated to use pre-compiled metrics
 */

export class BlockEffortStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: JitStatement[]): boolean {
    // Must have at least one node
    if (nodes.length === 0) return false;
    
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
    compiledMetrics: RuntimeMetric[],
    legacySources: JitStatement[],
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    // Phase 4: Pass pre-compiled metrics to EffortBlock constructor
    return new EffortBlock(compiledMetrics, legacySources);
  }
}
