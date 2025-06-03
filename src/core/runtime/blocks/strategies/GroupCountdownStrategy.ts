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
export class GroupCountdownStrategy implements IRuntimeBlockStrategy {
  /**
   * Check if this strategy can handle the given nodes
   * Criteria: Has duration AND has children (group scenario)
   */
  canHandle(nodes: JitStatement[], runtime: ITimerRuntime): boolean {
    // Must have at least one node
    if (nodes.length === 0) return false;
    
    return nodes.every(node => {
      const hasDuration = node.durations().length > 0;
      const hasChildren = node.children.length > 0;
      
      return hasDuration && hasChildren;
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
    
    return new TimedGroupBlock(nodes[0]);
  }
}