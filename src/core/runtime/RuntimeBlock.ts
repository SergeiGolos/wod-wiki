
import { IRuntimeAction, StatementNode } from "@/core/timer.types";
import { IRuntimeBlock, RuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { EventHandler } from "./EventHandler";

/**
 * A simple implementation of RuntimeBlock that handles basic runtime events
 * such as start and stop.
 */

export class RuntimeBlock implements IRuntimeBlock {
  constructor(
    public blockId: number,    
    public blockKey: string,
    public stack: StatementNode[],
    public handlers: EventHandler[] = []
  ) { }
    
public events: RuntimeEvent[] = [];
  
  onEvent(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {
    return this.handlers
      .map(handler => handler.apply(event, this.stack, runtime))
      .flat();
  }
}
