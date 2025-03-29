import { IStatementHandler } from "./StatementHandler";
import { IRuntimeHandler } from "./RuntimeHandler";
import { IRuntimeBlock, TimerRuntime } from "../../runtime/timer.runtime";
import { fragmentToPart } from "../../utils";
import { StatementNode } from "../../timer.types";

/**
 * Handler for repeating statement workout nodes
 * 
 * This handler detects and processes workout blocks that involve
 * repeating a specific exercise for a given number of repetitions.
 */
export class RepeatingStatementHandler implements IStatementHandler {
  /**
   * Determines if this handler can process a repeating statement node
   * @param node The statement node to check
   * @returns true if this node represents a repeating statement workout, false otherwise
   */
  canHandle(node: StatementNode): boolean {
    if (!node || !node.fragments) {
      return false;
    }
    
    // Check if this is a repeating reps-based node with no children
    const reps = fragmentToPart(node, "reps");
    return !!reps && node.children.length === 0;
  }
  
  /**
   * Creates a runtime handler for a repeating statement node
   * @param node The repeating statement node
   * @returns A repeating statement runtime handler
   */
  createHandler(node: StatementNode): IRuntimeHandler {
    return new RepeatingStatementRuntimeHandler(node);
  }

  /**
   * Builds a runtime block with appropriate handlers for a repeating statement node
   * @param block The current runtime block
   * @param node The statement node to process
   * @returns The updated runtime block with repeating statement handlers
   */
  build(block: IRuntimeBlock, node: StatementNode): IRuntimeBlock {
    // Check if this handler can process the node
    if (!this.canHandle(node)) {
      return block;
    }
    
    // Create handler for this node
    const handler = this.createHandler(node);
    
    // Update the block with this handler
    const updatedBlock: IRuntimeBlock = {
      ...block,
      // Preserve existing event handler and add our handler's logic
      onEvent: (event: RuntimeEvent, runtime: TimerRuntime) => {
        // Get existing actions if any
        const existingActions = typeof block.onEvent === 'function' 
          ? block.onEvent(event, runtime) 
          : [];
        
        // Add our handler's actions
        const handlerActions = handler.onTimerEvent(
          event.timestamp, 
          event.name, 
          [block]
        );
        
        // Combine all actions
        return [...existingActions, ...handlerActions];
      }
    };
    
    return updatedBlock;
  }
}

/**
 * Runtime handler for repeating statement workout blocks
 * 
 * Processes timer events for repeating statement workouts and generates
 * appropriate actions to update the UI and track progress.
 */
class RepeatingStatementRuntimeHandler implements IRuntimeHandler {
  type = "repeating_statement";
  private reps: number;
  private effort: string;
  private currentRep = 0;
  
  /**
   * Creates a new repeating statement runtime handler
   * @param node The repeating statement node
   */
  constructor(private node: StatementNode) {
    // Extract the reps count from the reps fragment
    const repsValue = fragmentToPart(node, "reps");
    this.reps = repsValue ? parseInt(repsValue) : 1;
    
    // Extract the effort description if available
    this.effort = fragmentToPart(node, "effort") || "";
  }
  
  /**
   * Processes timer events for repeating statement workouts
   * @param timestamp The timestamp of the event
   * @param event The name of the event
   * @param blocks Optional child blocks
   * @returns Actions to update the runtime state
   */
  onTimerEvent(timestamp: Date, event: string, blocks?: IRuntimeBlock[]): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    
    // Create a runtime event object
    const runtimeEvent = {
      name: event,
      timestamp
    };
    
    switch (event) {
      case "start":
        // When workout starts, update display with initial state
        actions.push(new SetDisplayAction(runtimeEvent, this.createDisplayState(0, "active")));
        
        // Set up appropriate buttons for repeating statement workouts
        actions.push(new SetButtonAction(runtimeEvent, [stopButton]));
        break;
        
      case "tick":
        // Just update the elapsed time on each tick
        const elapsed = timestamp.getTime() - runtimeEvent.timestamp.getTime();
        actions.push(new SetDisplayAction(runtimeEvent, this.createDisplayState(elapsed, "active")));
        break;
        
      case "lap":
        // Increment rep counter on lap event
        this.currentRep++;
        const completed = this.currentRep >= this.reps;
        
        // Update display with new rep count or completed state
        actions.push(new SetDisplayAction(runtimeEvent, 
          this.createDisplayState(0, completed ? "complete" : "active")));
        
        if (completed) {
          // All reps completed
          actions.push(new SetButtonAction(runtimeEvent, [resetButton]));
        }
        break;
        
      case "complete":
        // Final state when workout is completed
        actions.push(new SetDisplayAction(runtimeEvent, this.createDisplayState(0, "complete")));
        break;
    }
    
    return actions;
  }
  
  /**
   * Creates a display state object for the timer display
   * @param elapsed Elapsed time in milliseconds
   * @param state The current state ("ready", "active", "complete", etc.)
   * @returns A timer display object
   */
  private createDisplayState(elapsed: number, state: string): TimerDisplay {
    const label = this.effort 
      ? `${this.reps} ${this.effort}` 
      : `${this.reps} reps`;
      
    return {
      elapsed,
      state,
      label,
      completedReps: this.currentRep,
      targetReps: this.reps
    };
  }
}
