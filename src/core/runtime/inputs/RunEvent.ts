import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { EventHandler } from "../EventHandler";
import { StartEvent } from "./StartEvent";
import { SetClockAction, SetTimeSpanAction } from "../outputs/SetClockAction";
import { NextStatementAction } from "../actions/PopBlockAction";
import { StartTimerAction } from "../actions/StartTimerAction";

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

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {    
    return [
      new NextStatementAction(),      
      new StartTimerAction(new StartEvent(event.timestamp)),
      new SetTimeSpanAction([{start: event, stop: undefined}], "total")
    ];
  }
}
