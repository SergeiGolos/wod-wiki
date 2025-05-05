import {
  IRuntimeEvent,
  ITimerRuntime,
  IRuntimeAction,
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";
import { StopTimerAction } from "../actions/StopTimerAction";
import { SetButtonsAction } from "../outputs/SetButtonsAction";
import { GotoEndAction } from "../actions/GotoEndAction";
import { resetButton, saveButton } from "@/components/buttons/timerButtons";

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
      new GotoEndAction(),     
    ];
  }
}