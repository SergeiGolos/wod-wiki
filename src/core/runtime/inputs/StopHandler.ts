import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StopTimerAction } from "../actions/StopTimerAction";

import { SetClockAction } from "../outputs/SetClockAction";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { endButton, resumeButton } from "@/components/buttons/timerButtons";
// import { SetButtonAction } from "../actions/SetButtonAction";

export class StopHandler extends EventHandler {
  protected eventType: string = 'stop';

  protected handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {    
    if (runtime.current) {
      return [
        new StopTimerAction(event),
        new SetClockAction(runtime.current, "primary"),
        new SetButtonsAction([endButton, resumeButton], "system"),
      ];
    }
    return [];
  }
}
