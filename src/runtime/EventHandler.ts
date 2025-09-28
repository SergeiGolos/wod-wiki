import { IRuntimeAction } from "./IRuntimeAction";

export interface IRuntimeLog {
  message: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  timestamp: Date;
  context?: any;
}

/**
 * Represents the result of an event handler's attempt to process an event.
 */
export type EventHandlerResponse = {
  /** Whether this handler handled the event */
  handled: boolean;
  /** Whether to continue processing with other handlers (false = continue, true = abort/break/stop) */
  abort: boolean;
  /** Actions to be performed by the runtime */
  actions: IRuntimeAction[];
}

