import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { EventHandler } from "../EventHandler";
import { PushNextAction } from "../actions/PushNextAction";
import { StartTimerAction } from "../actions/StartTimerAction";

// Runtime Execution

export class RunEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'run';
}

export class RunHandler extends EventHandler {
  protected eventType: string = 'run';

  protected handleEvent(_event: IRuntimeEvent, _runtime: ITimerRuntime): IRuntimeAction[] {    
    return [
      new PushNextAction(),
    ];
  }
}
