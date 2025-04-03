
import { IRuntimeAction, StatementNode } from "@/core/timer.types";
import { IRuntimeBlock, RuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { EventHandler } from "./EventHandler";

/**
 * A simple implementation of RuntimeBlock that handles basic runtime events
 * such as start and stop.
 */

export class RuntimeBlock implements IRuntimeBlock {
  constructor(      
    public blockKey: string,
    public stack: StatementNode[],
    public handlers: EventHandler[] = []
  ) {
    this.blockId = stack?.[0]?.id ?? -1;
  }
  
  public type: string = 'runtime';  
  public events: RuntimeEvent[] = [];
  public blockId: number;

  onEvent(event: RuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {    
    return this.handlers
      .map(handler => handler.apply(event, this.stack, runtime))
      .flat();
  }
}
