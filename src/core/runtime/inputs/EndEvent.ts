import {
  IRuntimeEvent,
  ITimerRuntime,
  IRuntimeAction,
} from "@/core/timer.types";
import { EventHandler } from "../EventHandler";
import { StopTimerAction } from "../actions/StopTimerAction";
import { GotoEndAction } from "../actions/GotoEndAction";
import { BlockContext } from "../blocks/BlockContext";

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
    const context: BlockContext = block.getContext();
    if (!context) {
      console.warn(`EndHandler: No context found for block ${block.blockKey}.`);
      return [];
    }
    // Create a result block for the final time
    return [
      new StopTimerAction({ name: "stop", timestamp: event.timestamp }, context),          
      new GotoEndAction(),     
    ];
  }
}