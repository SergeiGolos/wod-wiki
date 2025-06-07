import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { StopTimerAction } from "../actions/StopTimerAction";
import { EventHandler } from "../EventHandler";
import { StopEvent } from "./StopEvent";
import { PushNextAction } from "../actions/PushNextAction";

export class SkipEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'skip';
}

/**
 * SkipHandler finishes the current rest/recovery period and moves to the next block.
 * This is used when a user wants to skip the remaining time in a rest period.
 */
export class SkipHandler extends EventHandler {
    protected eventType: string = 'skip';
  
    protected handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {       
      const block = runtime.trace.current();
      if (!block) {
        console.warn("SkipHandler: No current block found.");
        return [];
      }
      
      // Skip simply stops the timer and moves to next block
      return [
        new StopTimerAction(new StopEvent(event.timestamp)),        
        new PushNextAction(),      
      ];
    }
}
