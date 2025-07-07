import { IScriptRuntime } from "./IScriptRuntime";

/**
 * Base interface for runtime events that can be handled by the system.
 */
export interface IRuntimeEvent {
  /** Name/type of the event */  

  name: string;
  /** Timestamp when the event occurred */
  timestamp: number;
  /** Additional event data */
  data?: any;
}

/**
 * Interface for actions that can be performed by the runtime in response to events.
 */
export interface IRuntimeAction {
  /** Type of action to perform */
  type: string;
  /** Target of the action (optional) */
  target?: string;  
  /** Action payload/data */
  payload?: unknown;

  do(script: IScriptRuntime): void;
 
}

/**
 * Interface for handling runtime events and producing actions.
 * Each handler is responsible for a specific type of event processing.
 */
export interface EventHandler {
  /** Unique identifier for this handler */
  readonly id: string;
  
  /** Name of the handler for logging/debugging */
  readonly name: string;
  
  /**
   * Determines if this handler can process the given event.
   * @param event The event to check
   * @returns True if this handler can process the event
   */
  canHandle(event: IRuntimeEvent): boolean;
  
  /**
   * Handles the event and returns any actions to be performed.
   * @param event The event to handle
   * @param context Additional context for event processing
   * @returns Array of actions to be performed by the runtime
   */
  handle(event: IRuntimeEvent, context?: any): IRuntimeAction[];
}
