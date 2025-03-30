
import { IRuntimeAction, TimerEvent } from "@/core/timer.types";
import { IRuntimeBlock, RuntimeBlockHandler, RuntimeEvent, RuntimeMetric, ITimerRuntime } from "@/core/timer.types";



/**
 * A simple implementation of RuntimeBlock that handles basic runtime events
 * such as start and stop.
 */

export class RuntimeBlock implements IRuntimeBlock {
  constructor(
    public blockId: number,
    public blockIndex: number,
    public label?: string,
    public parent?: IRuntimeBlock,
    public round?: [number, number]
  ) { }

  metrics: RuntimeMetric[] = [];
  events: TimerEvent[] = [];
  handlers: RuntimeBlockHandler[] = [];
  onEvent(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    return this.handlers.map(handler => handler.apply(event, runtime)).flat();
  }
}
