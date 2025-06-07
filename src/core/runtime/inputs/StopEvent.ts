import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
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

export class StopHandler implements EventHandler {
  readonly eventType: string = 'stop';

  apply(event: IRuntimeEvent, _runtime: ITimerRuntime, _block: IRuntimeBlock): IRuntimeAction[] {    
    return [
      new StopTimerAction(event),      
      new SetButtonAction("system", [endButton, resumeButton]),
    ];
  }
}