import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNode,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";

/**
 * Implements a block that repeats execution of child nodes.
 * Supports two modes:
 * 1. Standard repetition - each child goes through all parent rounds
 * 2. Round-robin - each iteration of the parent round moves to the next child
 */
export class RepeatingBlock extends RuntimeBlock implements IRuntimeBlock {
  private roundRobinMode: boolean = false;
  private currentChildIndex: number = 0;
  private currentRound: number = 0;
  private totalRounds: number = 1; // Default to 1 if not specified
  
  constructor(source: StatementNode) {
    super("repeating", source.id, source);
    // If rounds are specified in the source node, use that value
    
  }

  /**
   * Set whether this block should operate in round-robin mode
   * @param enabled True to enable round-robin mode, false for standard repetition
   */
  setRoundRobinMode(enabled: boolean): void {
    this.roundRobinMode = enabled;
  }

  /**
   * Load the block and return initial actions
   * @param runtime Current timer runtime
   * @returns Array of runtime actions
   */
  visit(runtime: ITimerRuntime): IRuntimeAction[] {
    // Reset counters when the block is loaded        
    return [];
  }

  leave(_runtime: ITimerRuntime): IRuntimeAction[] {
    return [];
  }
  
  /**
   * Get the next statement to execute
   * @param runtime Current timer runtime
   * @returns The next statement node or undefined if finished
   */
  next(): StatementNode | undefined {
    return undefined;    
  }
}
