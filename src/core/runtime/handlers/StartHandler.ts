import { IRuntimeEvent, ITimerRuntime, IRuntimeAction, TimeSpanDuration } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetClockAction } from "../actions/OutputAction";
//import { completeButton, pauseButton } from "@/components/buttons";

export class StartHandler extends EventHandler {
  protected eventType: string = 'start';

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {
    return [
      new StartTimerAction(event),   
      new SetClockAction(new TimeSpanDuration(
        _runtime.current?.duration.original ?? 0, _runtime.current?.laps!), "primary")
    ];
  }
}
