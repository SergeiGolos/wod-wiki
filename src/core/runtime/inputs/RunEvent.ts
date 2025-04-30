import { IRuntimeEvent, ITimerRuntime, IRuntimeAction, TimeSpanDuration } from "@/core/timer.types";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { EventHandler } from "../EventHandler";
import { StartEvent } from "./StartEvent";
import { SetDurationAction } from "../outputs/SetClockAction";
import { NextStatementEvent } from "./NextStatementEvent";
import { StartTimerAction } from "../actions/StartTimerAction";
import { GoToNextAction } from "../actions/GoToNextAction";

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
      new GoToNextAction(),
      new StartTimerAction({ name: "start", timestamp: event.timestamp }),
      new SetDurationAction(new TimeSpanDuration(0, [{start: event, stop: undefined}]), "total"),    
    ];
  }
}
