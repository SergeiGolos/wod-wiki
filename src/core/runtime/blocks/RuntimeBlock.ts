import { IRuntimeAction, IRuntimeLogger, ResultSpan, StatementNode, RuntimeMetric, ActionButton, IDuration } from "@/core/timer.types";
import { IRuntimeBlock, IRuntimeEvent, ITimerRuntime } from "@/core/timer.types";
import { EventHandler } from "../EventHandler";

/**
 * A simple implementation of RuntimeBlock that handles basic runtime events
 * such as start and stop.
 */

export class RuntimeBlock implements IRuntimeBlock {
  constructor(      
    public blockKey: string,
    public stack: StatementNode[],
    public writer: IRuntimeLogger,
    public handlers: EventHandler[] = []    
  ) {
    this.blockId = stack?.[0]?.id ?? -1;    
  }
  duration: IDuration = { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
  elapsed(): IDuration {
    return this.duration;
  }
  laps: ResultSpan[] = [];
  buttons: ActionButton[] = [];
  nextId?: number;
  /**
   * Generates a report summarizing the execution block as a series of spans.
   * Each span represents the time between two significant timer events (start, lap, done, complete).
   * @returns An array of ResultSpan objects.
   */
  report(): ResultSpan[] {
    // Include 'stop' as a relevant boundary event type
    return this.writer.write(this);
  }
  
  public type: "active" | "complete" | "idle" = 'active';  
  public events: IRuntimeEvent[] = [];
  public blockId: number;
  public metrics: RuntimeMetric[] = [];

  onEvent(event: IRuntimeEvent, runtime: ITimerRuntime): IRuntimeAction[] {    
    return this.handlers
      .map(handler => handler.apply(event, runtime))
      .flat();
  }

  /**
   * Returns the canonical state of this runtime block based on its events.
   * - 'idle': No start event.
   * - 'complete': Last complete/done event index > last start event index.
   * - 'running': Last start event index > last complete/done event index.
   */
  public getState() {
    if (!this.events || this.events.length === 0) return 'idle';
    if (this.type === 'complete') return 'done';
    let lastStart = -1;
    let lastComplete = -1;
    let lastStop = -1;
    this.events.forEach((ev, idx) => {
      if (ev.name === 'start') lastStart = idx;
      if (ev.name === 'complete' || ev.name === 'end' ) lastComplete = idx;
      if (ev.name === 'stop') lastStop = idx;
    });

    if (lastStart === -1) return 'idle';
    if (lastComplete > lastStart) return 'done';
    if (lastStop > lastStart) return 'paused';
    return 'running';
  }
}
