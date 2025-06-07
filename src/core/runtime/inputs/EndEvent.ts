import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { EventHandler } from "../EventHandler";
import { StopTimerAction } from "../actions/StopTimerAction";

export class EndEvent implements IRuntimeEvent {
  constructor(timestamp?: Date) {
    this.timestamp = timestamp ?? new Date();
  }
  timestamp: Date;
  name = "end";
}

export class EndHandler implements EventHandler {
  readonly eventType: string = "end";
  apply(
    event: IRuntimeEvent,
    _runtime: ITimerRuntime,
    _block: IRuntimeBlock
  ): IRuntimeAction[] {
    // Create a result block for the final time
    return [
      new StopTimerAction({ name: "stop", timestamp: event.timestamp })       
      // TODO new GotoEndAction(),     
    ];
  }
}