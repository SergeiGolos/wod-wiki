import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StopTimerAction } from "../actions/StopTimerAction";
import { SetButtonAction } from "../outputs/SetButtonAction";
import { endButton, resumeButton } from "@/components/buttons/timerButtons";

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
    if (!block) {      
      console.warn("StopHandler: No current block found.");
      return [];
    }
    return [
      new StopTimerAction(event),      
      new SetButtonAction("system", [endButton, resumeButton]),
    ];
  }
}