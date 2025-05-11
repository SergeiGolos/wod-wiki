import { StatementNodeDetail, ITimerRuntime, IRuntimeBlock } from "@/core/timer.types";
import { EffortBlock } from "../EffortBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for creating SingleBlock runtime blocks
 * Handles simple statements with duration and metrics but no children or repetitions
 */


export class EffortBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(nodes: StatementNodeDetail[]): boolean {    
    return nodes.every(node => node.rounds === 1 && node.children?.length === 0);
  }

  compile(
    nodes: StatementNodeDetail[],
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {
    return new EffortBlock(nodes);
  }
}
