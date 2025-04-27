import { IRuntimeEvent, ITimerRuntime, IRuntimeAction, TimeSpanDuration } from "@/core/timer.types";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { EventHandler } from "../EventHandler";
import { StartEvent } from "./StartEvent";
import { SetDurationAction } from "../outputs/SetClockAction";
import { NextStatementEvent } from "./NextStatementEvent";

export class RunHandler extends EventHandler {
  protected eventType: string = 'run';

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    actions.push(new NotifyRuntimeAction(new NextStatementEvent(event.timestamp, 0)));
    actions.push(new NotifyRuntimeAction(new StartEvent(event.timestamp)));
    actions.push(new SetDurationAction(new TimeSpanDuration(0, [{start: event, stop: undefined}]), "total"));
    return actions;
  }
}
