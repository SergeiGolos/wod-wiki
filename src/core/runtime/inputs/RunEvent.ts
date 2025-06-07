import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
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

export class RunHandler implements EventHandler {
  readonly eventType: string = 'run';

  apply(_event: IRuntimeEvent, _runtime: ITimerRuntime, _block: IRuntimeBlock): IRuntimeAction[] {    
    return [
      new PushNextAction(),
    ];
  }
}
