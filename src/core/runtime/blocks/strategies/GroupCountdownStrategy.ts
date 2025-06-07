import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { TimedGroupBlock } from "../TimedGroupBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for creating TimedGroupBlock runtime blocks for countdown scenarios
 * Handles groups with time constraints (AMRAPs, EMOMs, etc.)
 * 
 * Examples:
 * - "5m AMRAP { pullups; pushups }"
 * - "12m EMOM { 10 burpees }"
 * - "20m { run 400m; rest }"
 */
export class GroupCountdownStrategy implements IRuntimeBlockStrategy {  /**
   * Check if this strategy can handle the given nodes
   * Criteria: Has duration AND has children (group scenario) BUT NOT rounds
   * This strategy handles pure time-limited scenarios like AMRAPs, EMOMs
   * Rounds + time scenarios should be handled by GroupRepeatingStrategy
   */
  canHandle(nodes: JitStatement[], runtime: ITimerRuntime): boolean {
    // Must have at least one node
    if (nodes.length === 0) return false;
    
    return nodes.every(node => {
      const hasDuration = node.durations().length > 0;
      const hasChildren = node.children.length > 0;
      const hasRounds = node.rounds().length > 0 && node.rounds()[0].count > 1;
      
      // Only handle duration + children WITHOUT rounds
      // This leaves rounds + time scenarios for GroupRepeatingStrategy
      return hasDuration && hasChildren && !hasRounds;
    });
  }

  /**
   * Compile the nodes into a TimedGroupBlock
   */
  compile(
    nodes: JitStatement[],
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    // TimedGroupBlock expects a single JitStatement
    if (nodes.length !== 1) {
      console.warn('GroupCountdownStrategy: Expected array with exactly one node');
      return undefined;
    }
    
    return new TimedGroupBlock([nodes[0]]);
  }
}