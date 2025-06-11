import { ITimerRuntime } from "@/core/ITimerRuntime";
import { JitStatement } from "@/core/types/JitStatement";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { RuntimeMetric } from "@/core/types/RuntimeMetric";
import { EffortBlock } from "../EffortBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for creating EffortBlock runtime blocks
 * Handles simple statements with effort or repetition fragments but no children or repetitions
 */

export class BlockCompoundStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: JitStatement[]): boolean {    
    return nodes.every(node => {
      const rounds = node.rounds();
      return rounds.length === 0 && node.children.length === 0;
    });
  }
  compile(
    compiledMetrics: RuntimeMetric[],
    legacySources: JitStatement[],
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    return new EffortBlock(compiledMetrics, legacySources);
  }
}
