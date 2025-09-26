import { IRuntimeAction } from "./IRuntimeAction";
import { IScriptRuntime } from "./IScriptRuntime";

export interface IRuntimeLog {
  message: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  timestamp: Date;
  context?: any;
}

/**
 * Base interface for runtime events that can be handled by the system.
 */
export interface IRuntimeEvent {
  /** Name/type of the event */  

  name: string;
  /** Timestamp when the event occurred */
  timestamp: Date;
  /** Additional event data */
  data?: any;  
}

/**
 * Represents the result of an event handler's attempt to process an event.
 */
export type HandlerResponse = {
  /** Whether this handler handled the event */
  handled: boolean;
  /** Whether to continue processing with other handlers (false = continue, true = abort/break/stop) */
  abort: boolean;
  /** Actions to be performed by the runtime */
  actions: IRuntimeAction[];
}

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
  handler(event: IRuntimeEvent, runtime: IScriptRuntime): HandlerResponse;
}
