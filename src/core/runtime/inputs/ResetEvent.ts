import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { EventHandler } from "@/core/runtime/EventHandler";
import { ResetAction } from "../actions/ResetAction";

export class ResetEvent implements IRuntimeEvent {
    constructor(timestamp?: Date) {
        this.timestamp = timestamp ?? new Date();
    }
    timestamp: Date;
    name = 'reset';
}

export class ResetHandler implements EventHandler {
  readonly eventType: string = 'reset';

  apply(event: IRuntimeEvent, _runtime: ITimerRuntime, _block: IRuntimeBlock): IRuntimeAction[] {        
    return [
      new ResetAction(event),                  
    ];
  }
}
