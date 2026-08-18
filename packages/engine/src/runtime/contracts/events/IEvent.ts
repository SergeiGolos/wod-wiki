/**
 * Base interface for runtime events that can be handled by the system.
 */

export interface IEvent {
  /** Name/type of the event */
  name: string;
  /** Timestamp when the event occurred */
  timestamp: Date;
  /** Additional event data */
  data?: unknown;
}
