import {
  IRuntimeAction,
  IRuntimeBlock,
  ITimerRuntime,
  StatementNode,
} from "@/core/timer.types";
import { RuntimeBlock } from "./RuntimeBlock";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { GoToChildAction, GoToNextAction } from "../actions/GoToNextAction";

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
  load(runtime: ITimerRuntime): IRuntimeAction[] {
    // Reset counters when the block is loaded
    this.currentChildIndex = 0;
    this.currentRound = 0;
    
    // Set up UI buttons for this block
    return [new GoToChildAction()];
  }

  /**
   * Get the next statement to execute
   * @param runtime Current timer runtime
   * @returns The next statement node or undefined if finished
   */
  next(runtime: ITimerRuntime): StatementNode | undefined {
    // If there are no children, nothing to execute
    if (!this.source?.children || this.source.children.length === 0) {
      return undefined;
    }
    
    // Check if we've finished all rounds
    if (this.currentRound >= this.totalRounds) {
      return undefined;
    }
    
    // Get the array of child IDs
    const childIds = this.source.children;
    
    // Handle round robin mode (each iteration moves to next child)
    if (this.roundRobinMode) {
      // Get the current child ID
      const childId = childIds[this.currentChildIndex];
      
      // Find the statement node for this child
      const childNode = runtime.script.getId(childId);
      
      // Increment to the next child for the next call
      this.currentChildIndex++;
      
      // If we've gone through all children, move to the next round
      if (this.currentChildIndex >= childIds.length) {
        this.currentChildIndex = 0;
        this.currentRound++;
      }
      
      return childNode.length > 0 ? childNode[0] : undefined;
    } 
    // Standard repetition (each child goes through all rounds before moving to next child)
    else {
      // Get the current child ID
      const childId = childIds[this.currentChildIndex];
      
      // Find the statement node for this child
      const childNode = runtime.script.getId(childId);
      
      // Increment the round counter
      this.currentRound++;
      
      // If we've completed all rounds for this child, move to the next child
      if (this.currentRound >= this.totalRounds) {
        this.currentRound = 0;
        this.currentChildIndex++;
        
        // If we've gone through all children, we're done
        if (this.currentChildIndex >= childIds.length) {
          return undefined;
        }
      }
      
      return childNode.length > 0 ? childNode[0] : undefined;
    }
  }
}
