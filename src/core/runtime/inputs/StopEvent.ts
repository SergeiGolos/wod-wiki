import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StopTimerAction } from "../actions/StopTimerAction";

import { SetClockAction } from "../outputs/SetClockAction";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { endButton, resumeButton } from "@/components/buttons/timerButtons";
// import { SetButtonAction } from "../actions/SetButtonAction";

export class StopEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'stop';
}

export class StopHandler extends EventHandler {
  protected eventType: string = 'stop';

  protected handleEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {    
    const block = runtime.trace.current();
    if (block) {
      return [
        new StopTimerAction(event),
        new SetClockAction(block, "primary"),
        new SetButtonsAction([endButton, resumeButton], "system"),
      ];
    }
    return [];
  }
}
