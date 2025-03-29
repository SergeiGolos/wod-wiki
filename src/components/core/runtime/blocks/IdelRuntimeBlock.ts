import { IRuntimeBlock, RuntimeEvent, RuntimeMetric, TimerRuntime } from "../timer.runtime";
import { NextChildStatementAction } from "../actions/NextChildStatementAction";
import { StartTimerAction } from "../actions/StartTimerAction";
import { IRuntimeAction, stopButton } from "../EventAction";
import { SetButtonAction } from "../actions/SetButtonAction";
import { TimerEvent } from "../../timer.types";

export class IdelRuntimeBlock implements IRuntimeBlock {
  /** Unique identifier for this block */
  public blockId: number;

  /** Position of this block within its parent container */
  public blockIndex: number;

  /** Optional label for this block */
  public label?: string;

  /** Reference to parent block if this is a nested block */
  public parent?: IRuntimeBlock;

  /** Current round and total rounds if this is part of a repeating structure */
  public round?: [number, number];

  /** Runtime metrics associated with this block */
  public metrics: RuntimeMetric[] = [];

  /** Timer events that occurred during this block's execution */
  public events: TimerEvent[] = [];

  /**
   * Creates a new SimpleRuntimeBlock
   *
   * @param id Unique identifier for this block
   * @param index Position of this block within its parent container
   * @param label Optional label for this block
   */
  constructor() {
    this.blockId = -1;
    this.blockIndex = -1;
    this.label = "Idel";
  }

  /**
   * Handle runtime events and return appropriate actions
   *
   * @param event The runtime event to handle
   * @param runtime Reference to the timer runtime
   * @returns Array of actions to be executed by the runtime
   */
  public onEvent(event: RuntimeEvent, runtime: TimerRuntime): IRuntimeAction[] {
    // Create an array to hold the actions we'll return
    const actions: IRuntimeAction[] = [];
    console.log("Event received in IdelRuntimeBlock: ", event);
    // Handle different event types
    
    switch (event.name) {
      case "start":
        // Handle start event
        console.log("Start event received in SimpleRuntimeBlock");
        actions.push(new NextChildStatementAction(0));        
        actions.push(new StartTimerAction(event));
        actions.push(new SetButtonAction(event, [stopButton]));           
        
        break;

      case "stop":
        // Handle stop event
        console.log("Stop event received in SimpleRuntimeBlock");

        // Create an inline action for handling stop
        actions.push(new NextChildStatementAction(0));
        actions.push(new SetButtonAction(event, [stopButton]));
        break;

      case "tick":
        // Handle periodic tick events (if needed)
        // This is where you would update timers, check conditions, etc.
        break;

      default:
        // Handle any other events
        console.log(`Unhandled event type: ${event.name}`);
        break;
    }

    return actions;
  }
}
