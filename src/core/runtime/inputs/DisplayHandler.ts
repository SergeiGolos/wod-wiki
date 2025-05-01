import { IRuntimeAction, IRuntimeBlock, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { EventHandler } from "../EventHandler";
import { DisplayEvent } from "./DisplayEvent";
import { SetDurationAction } from "../outputs/SetClockAction";

/**
 * Handles DisplayEvents and converts them to appropriate UI update actions
 */
export class DisplayHandler extends EventHandler {
  // Override the eventType from parent class
  protected eventType: string = 'display';
  
  match(event: IRuntimeEvent): boolean {
    const isDisplay = event.name === 'display';
    console.debug(`DisplayHandler.match: Event [${event.name}] matched: ${isDisplay}`);
    return isDisplay;
  }

  /**
   * Convert DisplayEvents to SET_CLOCK actions that update the UI
   */
  protected handleEvent(
    event: IRuntimeEvent,
    runtime: ITimerRuntime
  ): IRuntimeAction[] {
    console.debug(`DisplayHandler.handleEvent processing event:`, event);
    
    if (!(event instanceof DisplayEvent)) {
      console.warn('DisplayHandler received non-DisplayEvent:', event);
      return [];
    }

    const displayEvent = event as DisplayEvent;
    console.debug(`DisplayHandler creating SET_CLOCK action for target=${displayEvent.target}`);
    
    // Create the SET_CLOCK action
    const action = new SetDurationAction(displayEvent.span, displayEvent.target);
    console.debug(`DisplayHandler created action:`, action);
    
    return [action];
  }
  
  /**
   * Override the parent class handle method to ensure we're using our handleEvent method
   */
  handle(
    runtime: ITimerRuntime,
    block: IRuntimeBlock,
    event: IRuntimeEvent
  ): IRuntimeAction[] {
    if (!this.match(event)) {
      return [];
    }
    return this.handleEvent(event, runtime);
  }
}
