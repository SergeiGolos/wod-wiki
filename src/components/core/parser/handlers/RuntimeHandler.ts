import { IRuntimeAction } from "../../runtime/EventAction";
import { IRuntimeBlock } from "../../runtime/timer.runtime";

/**
 * Interface for runtime handlers that process timer events and produce runtime actions
 * 
 * This follows the strategy pattern where different handlers can be used to process
 * different types of timer events for different statement node types.
 */
export interface IRuntimeHandler {
  /**
   * The type of the runtime handler, used for debugging and logging
   */
  type: string;
  
  /**
   * Processes a timer event and produces actions to update the runtime state
   * @param timestamp The timestamp of the event
   * @param event The name of the event (e.g., "start", "tick", "lap", "complete")
   * @param blocks Optional child blocks that may be affected by this event
   * @returns An array of runtime actions to be applied
   */
  onTimerEvent(timestamp: Date, event: string, blocks?: IRuntimeBlock[]): IRuntimeAction[];
}
