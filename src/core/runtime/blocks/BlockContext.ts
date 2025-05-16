import { IRuntimeEvent, ITimerRuntime, ITimeSpan, ResultSpan, RuntimeMetric } from "@/core/timer.types";

/**
 * Holds all mutable state for a runtime block, separating state from behavior
 * for improved testability and adherence to SOLID principles.
 */
export class BlockContext {
  /** The timer runtime instance */
  runtime: ITimerRuntime;
  
  /** Counter for completed iterations/rounds */
  index: number = 0;
  
  /** Child index for nested blocks (for repeating blocks) */
  childIndex: number = 0;
  
  /** Last lap separator character (for repeating blocks with lap fragments) */
  lastLap?: string;
  
  /** Time spans for this block */
  spans: ITimeSpan[] = [];
  
  /** Block identifier for associating events */
  blockKey?: string;
  events: IRuntimeEvent[] = [];  
  resultSpan: ResultSpan | undefined;
  
  constructor(params: Partial<BlockContext> = {}) {
    this.runtime = params.runtime || {} as ITimerRuntime;
    this.index = params.index || 0;
    this.childIndex = params.childIndex || 0;
    this.lastLap = params.lastLap;
    this.spans = params.spans || [];
    this.blockKey = params.blockKey;
    this.events = params.events || [];
    this.resultSpan = params.resultSpan || new ResultSpan();
  }
  
  /**
   * Creates and adds a new time span starting with the given event
   * @param event The start event for the span
   * @returns The newly created span
   */
  addSpan(event: IRuntimeEvent): ITimeSpan {
    const span: ITimeSpan = {
      blockKey: this.blockKey,
      start: event,
      stop: undefined,      
    };
    this.spans.push(span);
    return span;
  }
  
  /**
   * Gets the current (most recently added) time span
   * @returns The current span or undefined if no spans exist
   */
  getCurrentSpan(): ITimeSpan | undefined {
    return this.spans.length > 0 ? 
      this.spans[this.spans.length - 1] : undefined;
  }
  
  /**
   * Closes the current span with the provided stop event
   * @param event The stop event
   */
  closeCurrentSpan(event: IRuntimeEvent): void {
    const span = this.getCurrentSpan();
    if (span && !span.stop) {
      span.stop = event;
    }
  }
  
  /**
   * Adds metrics to the current span
   * @param metrics The metrics to add
   */
  addMetricsToCurrentSpan(metrics: RuntimeMetric[]): void {
    const span = this.getCurrentSpan();
    if (span) {
      span.metrics = metrics;
    }
  }
}
