import { IRuntimeAction, ResultSpan, StatementNode} from "@/core/timer.types";
import { IRuntimeBlock, RuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { EventHandler } from "./EventHandler";

/**
 * A simple implementation of RuntimeBlock that handles basic runtime events
 * such as start and stop.
 */

export interface IRuntimeWriter {
  write: (runtimeBlock: IRuntimeBlock) => ResultSpan[]
}

export class RuntimeBlock implements IRuntimeBlock {
  constructor(      
    public blockKey: string,
    public stack: StatementNode[],
    public writer: IRuntimeWriter,
    public handlers: EventHandler[] = []    
  ) {
    this.blockId = stack?.[0]?.id ?? -1;    
  }

  /**
   * Generates a report summarizing the execution block as a series of spans.
   * Each span represents the time between two significant timer events (start, lap, done, complete).
   * @returns An array of ResultSpan objects.
   */
  report(): ResultSpan[] {
    // Include 'stop' as a relevant boundary event type
    return this.writer.write(this);
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
