import { StatementNodeDetail, IRuntimeBlock, ITimerRuntime } from "@/core/timer.types";
import { ComposeBlock } from "../ComposeBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for the Compose pattern (+ operator)
 * All children are executed as a single unit per round
 * 
 * Example:
 * (3)
 *   + 10 Pullups
 *   + 20 Pushups
 *   + 30 Squats
 * 
 * Execution:
 * Round 1: Pullups, then Pushups, then Squats
 * Round 2: Pullups, then Pushups, then Squats
 * Round 3: Pullups, then Pushups, then Squats
 */
export class ComposeBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(node: StatementNodeDetail): boolean {
    // Handle repeating blocks with the Compose (+) operator
    if (node?.rounds != null && node.rounds > 1 && node.groupOperator === "+") {
      return true;
    }
    return false;
  }

  compile(
    node: StatementNodeDetail,
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    return new ComposeBlock(node);
  }
}
