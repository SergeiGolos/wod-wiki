import {
  IRuntimeEvent,
  ITimerRuntime,
  IRuntimeAction,
  TimeSpanDuration,
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";
import { StopTimerAction } from "../actions/StopTimerAction";
import { SetDurationAction } from "../outputs/SetClockAction";
import { resetButton, saveButton } from "@/components/buttons/timerButtons";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { CompleteTimerAction } from "../actions/CompleteTimerAction";
import { GotoEndAction } from "../actions/GotoEndAction";
//import { SetButtonAction } from "../actions/SetButtonAction";

export class EndEvent implements IRuntimeEvent {
  constructor(timestamp?: Date) {
    this.timestamp = timestamp ?? new Date();
  }
  timestamp: Date;
  name = "end";
}

export class EndHandler extends EventHandler {
  protected eventType: string = "end";

  protected handleEvent(
    event: IRuntimeEvent,
    _runtime: ITimerRuntime
  ): IRuntimeAction[] {
    // Create a result block for the final time
    return [
      new StopTimerAction({ name: "stop", timestamp: event.timestamp }),
      new CompleteTimerAction(true),      
      new GotoEndAction(),

      new SetDurationAction(new TimeSpanDuration(0, []), "total"),
      new SetButtonsAction([resetButton, saveButton], "system"),
    ];
  }
}
