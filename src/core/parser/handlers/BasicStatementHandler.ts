
import { IRuntimeAction, IRuntimeBlock, RuntimeEvent, StatementNode, TimerDisplay } from "@/types/timer.types";
import { IStatementHandler } from "./StatementHandler";
import { IRuntimeHandler } from "./RuntimeHandler";
import { TimerRuntime } from "../../runtime/timer.runtime";
import { SetDisplayAction } from "../../runtime/actions/SetDisplayAction";
import { SetButtonAction } from "../../runtime/actions/SetButtonAction";


/**
 * Handler for basic workout statements without specific structure
 * 
 * This handler processes simple workout statements that have fragments
 * but no children nodes or specific structure like reps or rounds.
 */
export class BasicStatementHandler implements IStatementHandler {
  /**
   * Determines if this handler can process a basic statement node
   * @param node The statement node to check
   * @returns true if this node represents a basic statement, false otherwise
   */
  canHandle(node: StatementNode): boolean {
    if (!node || !node.fragments) {
      return false;
    }
    
    // This handler manages statements that have fragments but no children
    // and don't have a more specific structure handled by other handlers
    return node.fragments.length > 0 && node.children.length === 0;
  }
  
  /**
   * Creates a runtime handler for a basic statement node
   * @param node The basic statement node
   * @returns A basic statement runtime handler
   */
  createHandler(node: StatementNode): IRuntimeHandler {
    return new BasicStatementRuntimeHandler(node);
  }

  /**
   * Builds a runtime block with appropriate handlers for a basic statement node
   * @param block The current runtime block
   * @param node The statement node to process
   * @returns The updated runtime block with basic statement handlers
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
          event.name
        );
        
        // Combine all actions
        return [...existingActions, ...handlerActions];
      }
    };
    
    return updatedBlock;
  }
}

/**
 * Runtime handler for basic statement workout blocks
 * 
 * Processes timer events for basic statements and generates
 * appropriate actions to update the UI.
 */
class BasicStatementRuntimeHandler implements IRuntimeHandler {
  type = "basic_statement";
  private effort: string;
  
  /**
   * Creates a new basic statement runtime handler
   * @param node The basic statement node
   */
  constructor(private node: StatementNode) {
    // Try to extract a meaningful label from the node
    // Look for an effort fragment first
    this.effort = node.fragments.find(f => f.type === "effort")?.toPart() || 
                 node.type || 
                 "Exercise";
  }
  
  /**
   * Processes timer events for basic statement workouts
   * @param timestamp The timestamp of the event
   * @param event The name of the event
   * @returns Actions to update the runtime state
   */
  onTimerEvent(timestamp: Date, event: string): IRuntimeAction[] {
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
        
        // Set up appropriate buttons
        actions.push(new SetButtonAction(runtimeEvent, [
          {
            label: "Complete",
            onClick: () => {/* Will be handled by runtime */},
            variant: "primary"
          }
        ]));
        break;
        
      case "tick":
        // Just update the elapsed time on each tick
        const elapsed = timestamp.getTime() - runtimeEvent.timestamp.getTime();
        actions.push(new SetDisplayAction(runtimeEvent, this.createDisplayState(elapsed, "active")));
        break;
        
      case "complete":
        // Final state when exercise is completed
        actions.push(new SetDisplayAction(runtimeEvent, this.createDisplayState(0, "complete")));
        
        // Update buttons for completed state
        actions.push(new SetButtonAction(runtimeEvent, [
          {
            label: "Next",
            onClick: () => {/* Will be handled by runtime */},
            variant: "primary"
          }
        ]));
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
    return {
      elapsed,
      state,
      label: this.effort,
    };
  }
}
