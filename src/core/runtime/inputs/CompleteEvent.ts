import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
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


export class CompleteHandler extends EventHandler {
    protected eventType: string = 'complete';
  
    protected handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {       
      const block = runtime.trace.current();
      if (!block) {
        console.warn("CompleteHandler: No current block found.");
        return [];
      }
      return [
        new StopTimerAction(new StopEvent(event.timestamp)),        
        new PushNextAction(),      
      ];
    }
  }
