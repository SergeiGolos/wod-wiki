import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { EventHandler } from "../EventHandler";
import { GotoEvent, StartEvent } from "../timer.events";

export class RunHandler extends EventHandler {
  protected eventType: string = 'run';

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {
    const actions: IRuntimeAction[] = [];
    actions.push(new NotifyRuntimeAction(new GotoEvent(event.timestamp, 0)));
    actions.push(new NotifyRuntimeAction(new StartEvent(event.timestamp)));

    return actions;
  }
}
