import { IRuntimeAction, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { StopTimerAction } from "../actions/StopTimerAction";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { NextStatementEvent } from "./NextStatementEvent";
import { EventHandler } from "../EventHandler";
import { StopEvent } from "./StopEvent";

export class CompleteEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'complete';
}
export class CompleteHandler extends EventHandler {
    protected eventType: string = 'complete';
  
    protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {       
      return [
        new StopTimerAction(new StopEvent(event.timestamp)),        
        new NotifyRuntimeAction(new NextStatementEvent(event.timestamp))
      ];
    }
  }
