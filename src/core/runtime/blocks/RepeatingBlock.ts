import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNodeDetail,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { PushStatementAction } from "../actions/PushStatementAction";

/**
 * Implements a block that repeats execution of child nodes.
 * Supports two modes:
 * 1. Standard repetition - each child goes through all parent rounds
 * 2. Round-robin - each iteration of the parent round moves to the next child
 */
export class RepeatingBlock extends RuntimeBlock implements IRuntimeBlock {
  
  constructor(source: StatementNodeDetail) {
    super(source);
    // If rounds are specified in the source node, use that value
    
  }

  /**
   * Set whether this block should operate in round-robin mode
   * @param enabled True to enable round-robin mode, false for standard repetition
   */
  setRoundRobinMode(): void {
  }

  /**
   * Load the block and return initial actions
   * @param runtime Current timer runtime
   * @returns Array of runtime actions
   */
  enter(runtime: ITimerRuntime): IRuntimeAction[] {
    // Reset counters when the block is loaded                
    return this.next(runtime);
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
  
  /**
   * Get the next runtime actions to execute
   * @param runtime Current timer runtime
   * @returns Array of runtime actions
   */
  next(runtime: ITimerRuntime): IRuntimeAction[] {
     const id = this.source.children[this.index % this.source.children.length];
     const statement = runtime.script.getId(id)[0];
     return statement ? [new PushStatementAction(statement)] : [];
  }
}
