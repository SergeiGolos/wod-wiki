
import { IRuntimeAction, TimerEvent } from "@/core/timer.types";
import { IRuntimeBlock, RuntimeEvent, RuntimeMetric, ITimerRuntime } from "@/core/timer.types";
import { EventHandler } from "./EventHandler";

/**
 * A simple implementation of RuntimeBlock that handles basic runtime events
 * such as start and stop.
 */

export class RuntimeBlock implements IRuntimeBlock {
  constructor(
    public blockId: number,
    public blockIndex: number,
    public parent?: IRuntimeBlock,
    public handlers: EventHandler[] = []
  ) { }
  
  metrics: RuntimeMetric[] = [];
  events: TimerEvent[] = [];
  onEvent(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    return this.handlers
      .map(handler => handler.apply(event, runtime))
      .flat();
  }
}
