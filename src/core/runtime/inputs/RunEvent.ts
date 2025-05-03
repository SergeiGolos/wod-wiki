import { IRuntimeEvent, ITimerRuntime, IRuntimeAction, TimeSpanDuration } from "@/core/timer.types";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { EventHandler } from "../EventHandler";
import { StartEvent } from "./StartEvent";
import { SetClockAction, SetTimeSpanAction } from "../outputs/SetClockAction";
import { NextStatementAction, PopBlockAction } from "../actions/PopBlockAction";

// Runtime Execution

export class RunEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'run';
}

export class RunHandler extends EventHandler {
  protected eventType: string = 'run';

  protected handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {    
    return [
      new NextStatementAction(),
      new SetTimeSpanAction([{start: event, stop: undefined}], "total"),  
      new SetClockAction("primary"),  
      new NotifyRuntimeAction(new StartEvent(event.timestamp))
    ];
  }
}
