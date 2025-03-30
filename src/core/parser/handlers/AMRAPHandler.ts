import { IRuntimeAction, IRuntimeBlock, RuntimeEvent, StatementNode, TimerDisplay } from "@/types/timer.types";
import { IStatementHandler } from "./StatementHandler";
import { IRuntimeHandler } from "./RuntimeHandler";
import { fragmentToPart } from "../../utils";
import { SetButtonAction } from "../../runtime/actions/SetButtonAction";
import { SetDisplayAction } from "../../runtime/actions/SetDisplayAction";
import { TimerRuntime } from "../../runtime/timer.runtime";

/**
 * Handler for AMRAP (As Many Rounds As Possible) workout statements
 * 
 * This handler detects and processes AMRAP-style workout blocks where
 * an effort fragment indicates an AMRAP workout structure.
 */
export class AMRAPHandler implements IStatementHandler {
  /**
   * Determines if this handler can process an AMRAP node
   * @param node The statement node to check
   * @returns true if this node represents an AMRAP workout, false otherwise
   */
  canHandle(node: StatementNode): boolean {
    if (!node || !node.fragments) {
      return false;
    }
    
    // Check if this is an AMRAP-style node
    const amrap = fragmentToPart(node, "effort");
    return !!amrap && node.children.length > 0;
  }
  
  /**
   * Creates a runtime handler for an AMRAP node
   * @param node The AMRAP statement node
   * @returns An AMRAP runtime handler
   */
  createHandler(node: StatementNode): IRuntimeHandler {
    return new AMRAPRuntimeHandler(node);
  }

  /**
   * Builds a runtime block with appropriate handlers for an AMRAP node
   * @param block The current runtime block
   * @param node The statement node to process
   * @returns The updated runtime block with AMRAP handlers
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
 * Runtime handler for AMRAP workout blocks
 * 
 * Processes timer events for AMRAP workouts and generates
 * appropriate actions to update the UI and track progress.
 */
class AMRAPRuntimeHandler implements IRuntimeHandler {
  type = "amrap";
  private amrapLabel: string;
  private currentRound = 1;
  
  /**
   * Creates a new AMRAP runtime handler
   * @param node The AMRAP statement node
   */
  constructor(private node: StatementNode) {
    // Extract the AMRAP label from the effort fragment
    this.amrapLabel = fragmentToPart(node, "effort") || "AMRAP";
  }
  
  /**
   * Processes timer events for AMRAP workouts
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
        // When AMRAP starts, update display with initial state
        actions.push(new SetDisplayAction(runtimeEvent, this.createDisplayState(0, "active")));
        
        // Set up appropriate buttons for AMRAP workouts
        actions.push(new SetButtonAction(runtimeEvent, [ ]));
        break;
        
      case "tick":
        // Just update the elapsed time on each tick
        const elapsed = timestamp.getTime() - runtimeEvent.timestamp.getTime();
        actions.push(new SetDisplayAction(runtimeEvent, this.createDisplayState(elapsed, "active")));
        break;
        
      case "lap":
        // Increment round counter on lap event
        this.currentRound++;
        actions.push(new SetDisplayAction(runtimeEvent, this.createDisplayState(0, "active")));
        break;
        
      case "complete":
        // Final state when AMRAP is completed
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
      label: `AMRAP ${this.amrapLabel}`,
      round: this.currentRound,
      totalRounds: 0, // AMRAP doesn't have a fixed total number of rounds
    };
  }
}
