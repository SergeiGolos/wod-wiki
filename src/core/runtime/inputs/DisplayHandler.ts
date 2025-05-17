import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { EventHandler } from "../EventHandler";

/**
 * Handles DisplayEvents and converts them to appropriate UI update actions
 */
export class DisplayHandler extends EventHandler {
  // Override the eventType from parent class
  protected eventType: string = 'display';
  
  match(event: IRuntimeEvent): boolean {
    return event.name === 'display';
  }

  /**
   * Convert DisplayEvents to SET_CLOCK actions that update the UI
   */
  protected handleEvent(
    _event: IRuntimeEvent,
    _runtime: ITimerRuntime
  ): IRuntimeAction[] {
    return [];
  }
  
  /**
   * Override the parent class handle method to ensure we're using our handleEvent method
   */
  handle(
    runtime: ITimerRuntime,
    event: IRuntimeEvent
  ): IRuntimeAction[] {
    if (!this.match(event)) {
      return [];
    }
    return this.handleEvent(event, runtime);
  }
}
