import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { RepeatingBlock } from "../RepeatingBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { RuntimeMetric } from "@/core/RuntimeMetric";

/**
 * Strategy for the standard Repeat pattern (no operator)
 * Each child individually goes through all rounds before moving to the next child
 */
export class GroupRepeatingStrategy implements IRuntimeBlockStrategy {  canHandle(nodes: JitStatement[]): boolean {
    // Only handle arrays with exactly one node
    if (nodes.length !== 1) {
      return false;
    }
    
    const node = nodes[0];
    const rounds = node.rounds();
    
    // Handle repeating blocks with rounds > 1 and children
    // This now includes both:
    // 1. Pure rounds: "(3) { exercises }" - rounds only
    // 2. Rounds + time: "(3) :5m { exercises }" - rounds with timer inheritance
    return rounds.length > 0 && 
           rounds[0].count > 1 && 
           node.children.length > 0;
  }  compile(
    compiledMetrics: RuntimeMetric[],
    legacySources: JitStatement[],
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    // Only handle the array if it contains exactly one node
    if (legacySources.length !== 1) {
      console.warn('RepeatingBlockStrategy: Expected array with exactly one node');
      return undefined;
    }
    
    // Phase 4: Pass pre-compiled metrics to RepeatingBlock constructor
    return new RepeatingBlock(compiledMetrics, [legacySources[0]]);
  }
}


