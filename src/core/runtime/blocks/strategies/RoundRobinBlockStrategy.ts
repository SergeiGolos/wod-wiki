import { StatementNodeDetail, IRuntimeBlock, ITimerRuntime } from "@/core/timer.types";
import { RoundRobinBlock } from "../RoundRobinBlock";
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";

/**
 * Strategy for the Round-Robin pattern (- operator)
 * Each iteration of the parent round moves to the next child in the list
 * 
 * Example:
 * (3)
 *   - 10 Pullups
 *   - 20 Pushups
 *   - 30 Squats
 * 
 * Execution:
 * Round 1: Pullups
 * Round 2: Pushups
 * Round 3: Squats
 */
export class RoundRobinBlockStrategy implements IRuntimeBlockStrategy {
  canHandle(node: StatementNodeDetail): boolean {
    // Handle repeating blocks with the Round-Robin (-) operator
    if (node?.rounds != null && node.rounds > 1 && node.groupOperator === "-") {
      return true;
    }
    return false;
  }

  compile(
    node: StatementNodeDetail,
    _runtime: ITimerRuntime    
  ): IRuntimeBlock | undefined {
    return new RoundRobinBlock(node);
  }
}
