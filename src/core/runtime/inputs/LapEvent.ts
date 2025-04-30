import { IRuntimeEvent, ITimerRuntime, IRuntimeAction } from "@/core/timer.types";
import { EventHandler } from "@/core/runtime/EventHandler";
import { StartTimerAction } from "../actions/StartTimerAction";

export class LapEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'lap';
}

export class LapHandler extends EventHandler {
  protected eventType: string = 'lap';

  protected handleEvent(event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {
    // Create a result block for the lap
    // Assuming lap number can be derived from the current result count + 1        
    return [new StartTimerAction(event)];
  }
}