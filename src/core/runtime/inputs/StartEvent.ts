import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetClockAction } from "../outputs/SetClockAction";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { endButton, pauseButton } from "@/components/buttons/timerButtons";

// Timers

export class StartEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'start';
}

export class StartHandler extends EventHandler {
  protected eventType: string = 'start';

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {
    console.debug('StartHandler processing start event');
    return [
      new StartTimerAction(event),
      // Let StartTimerAction handle all timer displays through DisplayEvents
      // This avoids competing timer update mechanisms
      new SetButtonsAction([endButton, pauseButton], "system"),
    ];
  }
}
