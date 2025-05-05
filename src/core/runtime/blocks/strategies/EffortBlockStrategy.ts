import { StatementNodeDetail, ITimerRuntime, IRuntimeBlock } from "@/core/timer.types";
import { EffortBlock } from "../EffortBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for creating SingleBlock runtime blocks
 * Handles simple statements with duration and metrics but no children or repetitions
 */


export class EffortBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(node: StatementNodeDetail): boolean {
    return node.rounds === 1 && node.children?.length === 0;
  }

  compile(
    node: StatementNodeDetail,
    _runtime: ITimerRuntime
  ): IRuntimeBlock | undefined {

    return new EffortBlock(node);
  }
}
