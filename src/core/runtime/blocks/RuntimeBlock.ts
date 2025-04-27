import { IRuntimeAction, IRuntimeSync, ResultSpan, StatementNode, RuntimeMetric, ActionButton, IDuration } from "@/core/timer.types";
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
    public handlers: EventHandler[] = []    
  ) {
    this.blockId = stack?.[0]?.id ?? -1;    
  }
  
  public duration: IDuration = { original: 0, sign: "+", hours: 0, minutes: 0, seconds: 0, milliseconds: 0 };
  
  public buttons: ActionButton[] = [];
  public blockId: number;
  public nextId?: number;
  /**
   * Generates a report summarizing the execution block as a series of spans.
   * Each span represents the time between two significant timer events (start, lap, done, complete).
   * @returns An array of ResultSpan objects.
   */  
  
  public type: "active" | "complete" | "idle" = 'active';  
  
  public events: IRuntimeEvent[] = [];
  public laps: ResultSpan[] = [];
  public metrics: RuntimeMetric[] = [];
}
