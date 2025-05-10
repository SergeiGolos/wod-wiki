import { StatementNodeDetail, IRuntimeBlock, ITimerRuntime } from "@/core/timer.types";
import { RepeatingBlock } from "../RepeatingBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for the standard Repeat pattern (no operator)
 * Each child individually goes through all rounds before moving to the next child
 */
export class RepeatingBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(node: StatementNodeDetail): boolean {
    // Only handle repeating blocks with no specific operator (standard Repeat pattern)
    if (node?.rounds != null && node.rounds > 1 && node.groupOperator === undefined) {
      return true;
    }
    return false;
  }

  compile(
    node: StatementNodeDetail,
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    return new RepeatingBlock(node);
  }
}


