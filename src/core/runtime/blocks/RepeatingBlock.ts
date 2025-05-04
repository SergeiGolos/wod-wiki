import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNode,
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
  visit(runtime: ITimerRuntime): IRuntimeAction[] {
    // Reset counters when the block is loaded        
    const statement = this.next(runtime);
    if(!statement) return [];
    return [
      new PushStatementAction(statement)
    ];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
  
  /**
   * Get the next statement to execute
   * @param runtime Current timer runtime
   * @returns The next statement node or undefined if finished
   */
  next(runtime: ITimerRuntime): StatementNode | undefined {
     const id = this.source.children[this.index % this.source.children.length];
     return runtime.script.getId(id)[0];
  }
}
