import { EventHandlerResponse } from "./EventHandler";
import { IEvent } from "./IEvent";
import { IScriptRuntime } from "./IScriptRuntime";

/**
 * Interface for handling runtime events and producing actions.
 * Each handler is responsible for a specific type of event processing.
 *
 * Instead of separate canHandle and handle methods, implementors should return a HandlerResponse
 * indicating if the event was handled, whether to continue, and any actions to perform.
 */

export interface IEventHandler {
  /** Unique identifier for this handler */
  readonly id: string;

  /** Name of the handler for logging/debugging */
  readonly name: string;

  /**
   * Handles the event and returns a HandlerResponse indicating the result.
   * @param event The event to handle
   * @param context Additional context for event processing
   * @returns HandlerResponse describing handling state, continuation, and actions
   */
  handler(event: IEvent, runtime: IScriptRuntime): EventHandlerResponse;
}
