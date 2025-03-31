import { IStatementHandler } from "../../../../core/parser/handlers/StatementHandler";
import { SetButtonAction } from "../../../../core/runtime/actions/SetButtonAction";
import { SetDisplayAction } from "../../../../core/runtime/actions/SetDisplayAction";
import { TimerRuntime } from "../../../../core/runtime/timer.runtime";
import { StatementNode, IRuntimeHandler, IRuntimeBlock, RuntimeEvent, IRuntimeAction, TimerDisplayBag } from "../../../../core/timer.types";

/**
 * Handler for single unit workout statements
 * 
 * This handler is a fallback for workout statements that don't match 
 * any other handler criteria but still need runtime processing.
 */
export class SingleUnitHandler implements IStatementHandler {
  /**
   * Determines if this handler can process a single unit node
   * @param node The statement node to check
   * @returns true if this node represents a single unit that no other handler can process, false otherwise
   */
  canHandle(node: StatementNode): boolean {
    if (!node) {
      return false;
    }
    
    // This is our fallback handler, so it handles any node with no children
    // that doesn't have specific fragments that would be handled by other handlers
    return node.children.length === 0;
  }
  
  /**
   * Creates a runtime handler for a single unit node
   * @param node The single unit statement node
   * @returns A single unit runtime handler
   */
  createHandler(node: StatementNode): IRuntimeHandler {
    return new SingleUnitRuntimeHandler(node);
  }

  /**
   * Builds a runtime block with appropriate handlers for a single unit node
   * @param block The current runtime block
   * @param node The statement node to process
   * @returns The updated runtime block with single unit handlers
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
 * Runtime handler for single unit workout blocks
 * 
 * Processes timer events for single unit workouts and generates
 * appropriate actions to update the UI.
 */
class SingleUnitRuntimeHandler implements IRuntimeHandler {
  type = "single_unit";
  private label: string;
  
  /**
   * Creates a new single unit runtime handler
   * @param node The single unit statement node
   */
  constructor(private node: StatementNode) {
    // Try to extract a meaningful label from the node
    this.label = node.type || "Single Unit";
  }
  
  /**
   * Processes timer events for single unit workouts
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
        // Final state when unit is completed
        actions.push(new SetDisplayAction(runtimeEvent, this.createDisplayState(0, "complete")));
        
        // Update buttons for completed state
        actions.push(new SetButtonAction(runtimeEvent, [
          {
            label: "Next",
            onClick: () => [],
            variant: "secondary"
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
  private createDisplayState(elapsed: number, state: string): TimerDisplayBag {
    return {
      elapsed,
      state,
      label: this.label
    };
  }
}
