import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { StopTimerAction } from "../actions/StopTimerAction";
import { EventHandler } from "../EventHandler";
import { StopEvent } from "./StopEvent";
import { PushNextAction } from "../actions/PushNextAction";

export class CompleteEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'complete';
}

// todo: Complete on timer and countdowns are different.  this is the 
// timer version of complete.  A countdown version of complete is needed with a 
// rest state update.

export class CompleteHandler implements EventHandler {
    readonly eventType: string = 'complete';
  
    apply(event: IRuntimeEvent, _runtime: ITimerRuntime, _block: IRuntimeBlock): IRuntimeAction[] {       
      // The logic for handling remaining time and starting a rest period
      // has been moved to RestRemainderHandler.
      // This handler now only deals with the standard completion.

      // Default behavior: complete normally
      return [
        new StopTimerAction(new StopEvent(event.timestamp)),        
        new PushNextAction(),      
      ];
    }
  }
