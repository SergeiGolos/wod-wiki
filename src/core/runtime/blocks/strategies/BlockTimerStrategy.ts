import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/types/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { TimerBlock } from "../TimerBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { RuntimeMetric } from "@/core/types/RuntimeMetric";

/**
 * Strategy for creating TimerBlock runtime blocks
 * Handles statements with duration only (no effort, reps, children, or rounds)
 * Phase 4: Updated to use pre-compiled metrics
 * 
 * Examples:
 * - "30s"
 * - "2m"  
 * - "1m30s"
 */
export class BlockTimerStrategy implements IRuntimeBlockStrategy {
  /**
   * Check if this strategy can handle the given nodes
   * Criteria: Has duration, but no effort, reps, children, or rounds
   */
  canHandle(nodes: JitStatement[], runtime: ITimerRuntime): boolean {
    // Must have at least one node
    if (nodes.length === 0) return false;
    
    return nodes.every(node => {
      const hasDuration = node.durations().length > 0;
      const hasEffort = node.efforts().length > 0;
      const hasRepetitions = node.repetitions().length > 0;
      const hasChildren = node.children.length > 0;
      const hasRounds = node.rounds().length > 0;
      
      // Must have duration, but nothing else
      return hasDuration && !hasEffort && !hasRepetitions && !hasChildren && !hasRounds;
    });
  }
  /**
   * Compile the nodes into a TimerBlock
   * Phase 4: Updated to receive pre-compiled metrics and legacy sources
   */  compile(
    compiledMetrics: RuntimeMetric[],
    legacySources: JitStatement[],
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    // Phase 4: Pass pre-compiled metrics to TimerBlock constructor
    return new TimerBlock(compiledMetrics, legacySources);
  }
}