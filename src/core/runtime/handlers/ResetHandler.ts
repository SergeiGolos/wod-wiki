import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { ResetAction } from "../actions/ResetAction";
import { NotifyRuntimeAction } from "../actions/NotifyRuntimeAction";
import { DisplayEvent } from "../events/timer.events";
export class ResetHandler extends EventHandler {
  protected eventType: string = 'reset';

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {        
    return [
      new ResetAction(event),
      new NotifyRuntimeAction(new DisplayEvent(event.timestamp))
    ];
  }
}
