import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";
import { SetButtonAction } from "../outputs/SetButtonAction";
import { endButton, pauseButton } from "@/components/buttons/timerButtons";

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
    return [
      new StartTimerAction(event),
      new SetButtonAction("system", [endButton, pauseButton]),
    ];
  }
}
