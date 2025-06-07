import { IRuntimeAction } from "@/core/IRuntimeAction";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { IRuntimeEvent } from "@/core/IRuntimeEvent";
import { EventHandler } from "../EventHandler";
import { StopTimerAction } from "../actions/StopTimerAction";

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
    runtime: ITimerRuntime
  ): IRuntimeAction[] {
    const block = runtime.trace.current();
    if (!block) {
      console.warn("EndHandler: No current block found.");
      return [];
    }
    // Create a result block for the final time
    return [
      new StopTimerAction({ name: "stop", timestamp: event.timestamp })       
      // TODO new GotoEndAction(),     
    ];
  }
}