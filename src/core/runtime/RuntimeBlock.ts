import { IRuntimeAction, ResultSpan, StatementNode} from "@/core/timer.types";
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

  /**
   * Generates a report summarizing the execution block as a series of spans.
   * Each span represents the time between two significant timer events (start, lap, done, complete).
   * @returns An array of ResultSpan objects.
   */
  report(): ResultSpan[] {
    // Include 'stop' as a relevant boundary event type
    const timerEventTypes: string[] = ["start", "lap", "done", "complete", "stop"];

    const resultSpans: ResultSpan[] = [];
    let previousRelevantEvent: RuntimeEvent | null = null;

    for (let i = 0; i < this.events.length; i++) {
      const currentEvent: RuntimeEvent = this.events[i];
      const isRelevant = timerEventTypes.includes(currentEvent.name);

      if (isRelevant) {
        if (previousRelevantEvent) {          
          const span = new ResultSpan();
          span.start = previousRelevantEvent;
          span.stop = currentEvent;
          span.label = `Describe interval between ${previousRelevantEvent.name} at ${previousRelevantEvent.timestamp} and ${currentEvent.name} at ${currentEvent.timestamp}`;
          resultSpans.push(span);
        }
        previousRelevantEvent = currentEvent;
      }
    }

    return resultSpans;
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
