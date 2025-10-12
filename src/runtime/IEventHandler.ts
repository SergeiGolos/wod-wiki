import { IEvent } from "./IEvent";
import { IScriptRuntime } from "./IScriptRuntime";
import { IRuntimeAction } from "./IRuntimeAction";

/**
 * @deprecated Use IRuntimeAction[] directly instead
 * Legacy event handler response type for backward compatibility.
 */
export type EventHandlerResponse = {
  handled: boolean;
  abort: boolean;
  actions: IRuntimeAction[];
};

/**
 * Interface for handling runtime events and producing actions.
 * Each handler is responsible for a specific type of event processing.
 *
 * Handlers return an array of actions to execute. An empty array means
 * the handler did not handle the event or has no actions to perform.
 * 
 * For error handling, use the ErrorAction to push errors to runtime.errors.
 */

export interface IEventHandler {
  /** Unique identifier for this handler */
  readonly id: string;

  /** Name of the handler for logging/debugging */
  readonly name: string;

  /**
   * Handles the event and returns an array of actions to execute.
   * @param event The event to handle
   * @param runtime Runtime context for event processing
   * @returns Array of actions to execute (empty if event not handled)
   */
  handler(event: IEvent, runtime: IScriptRuntime): IRuntimeAction[];
}
