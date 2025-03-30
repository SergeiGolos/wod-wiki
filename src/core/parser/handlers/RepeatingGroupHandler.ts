import { IRuntimeAction, IRuntimeBlock, RuntimeEvent, StatementNode, TimerDisplay } from "@/types/timer.types";
import { IStatementHandler } from "./StatementHandler";
import { IRuntimeHandler } from "./RuntimeHandler";
import { fragmentToPart } from "../../utils";
import { SetButtonAction } from "../../runtime/actions/SetButtonAction";
import { SetDisplayAction } from "../../runtime/actions/SetDisplayAction";
import { TimerRuntime } from "../../runtime/timer.runtime";

/**
 * Handler for repeating group workout statements
 * 
 * This handler detects and processes workout blocks that involve
 * repeating a set of exercises for a specific number of rounds.
 */
export class RepeatingGroupHandler implements IStatementHandler {
  /**
   * Determines if this handler can process a repeating group node
   * @param node The statement node to check
   * @returns true if this node represents a repeating group workout, false otherwise
   */
  canHandle(node: StatementNode): boolean {
    if (!node || !node.fragments) {
      return false;
    }
    
    // Check if this is a repeating rounds-based node
    const rounds = fragmentToPart(node, "rounds");
    return !!rounds && node.children.length > 0;
  }
  
  /**
   * Creates a runtime handler for a repeating group node
   * @param node The repeating group statement node
   * @returns A repeating group runtime handler
   */
  createHandler(node: StatementNode): IRuntimeHandler {
    return new RepeatingGroupRuntimeHandler(node);
  }

  /**
   * Builds a runtime block with appropriate handlers for a repeating group node
   * @param block The current runtime block
   * @param node The statement node to process
   * @returns The updated runtime block with repeating group handlers
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
 * Runtime handler for repeating group workout blocks
 * 
 * Processes timer events for repeating group workouts and generates
 * appropriate actions to update the UI and track progress.
 */
class RepeatingGroupRuntimeHandler implements IRuntimeHandler {
  type = "repeating_group";
  private label: string;
  private currentRound = 1;
  private totalRounds: number;
  
  /**
   * Creates a new repeating group runtime handler
   * @param node The repeating group statement node
   */
  constructor(private node: StatementNode) {
    // Extract the rounds count from the rounds fragment
    const roundsValue = fragmentToPart(node, "rounds");
    this.totalRounds = roundsValue ? parseInt(roundsValue) : 1;
    
    // Set the display label
    const effortPart = fragmentToPart(node, "effort");
    this.label = effortPart || `${this.totalRounds} Rounds`;
  }
  
  /**
   * Processes timer events for repeating group workouts
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
        
        // Set up appropriate buttons for repeating group workouts
        actions.push(new SetButtonAction(runtimeEvent, [
          {
            label: "Next Round",
            onClick: () => {/* Will be handled by runtime */},
            variant: "primary",
            isActive: this.currentRound < this.totalRounds
          },
          {
            label: "Finish",
            onClick: () => {/* Will be handled by runtime */},
            variant: "secondary"
          }
        ]));
        break;
        
      case "tick":
        // Just update the elapsed time on each tick
        const elapsed = timestamp.getTime() - runtimeEvent.timestamp.getTime();
        actions.push(new SetDisplayAction(runtimeEvent, this.createDisplayState(elapsed, "active")));
        break;
        
      case "lap":
        // Increment round counter on lap event
        this.currentRound++;
        const completed = this.currentRound > this.totalRounds;
        
        // Update display with new round or completed state
        actions.push(new SetDisplayAction(runtimeEvent, 
          this.createDisplayState(0, completed ? "complete" : "active")));
        
        // Update buttons based on workout progress
        if (!completed) {
          actions.push(new SetButtonAction(runtimeEvent, [
            {
              label: "Next Round",
              onClick: () => {/* Will be handled by runtime */},
              variant: "primary",
              isActive: this.currentRound < this.totalRounds
            },
            {
              label: "Finish",
              onClick: () => {/* Will be handled by runtime */},
              variant: "secondary"
            }
          ]));
        } else {
          // All rounds completed
          actions.push(new SetButtonAction(runtimeEvent, [
            {
              label: "Restart",
              onClick: () => {/* Will be handled by runtime */},
              variant: "secondary"
            }
          ]));
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
    return {
      elapsed,
      state,
      label: this.label,
      round: this.currentRound,
      totalRounds: this.totalRounds,
    };
  }
}
