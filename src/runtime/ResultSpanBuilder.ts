import { RuntimeMetric } from "./RuntimeMetric";

/**
 * Interface representing a time span with start and stop events, 
 * used to track the timing of workout segments.
 */
export interface ITimeSpan {
  start?: { name: string; timestamp: number };
  stop?: { name: string; timestamp: number };
  blockKey?: string;
  metrics?: RuntimeMetric[];
}

/**
 * Represents a span of execution results with metrics and timing information.
 */
export interface ResultSpan {
  blockKey: string;
  timeSpan: ITimeSpan;
  metrics: RuntimeMetric[];
  duration: number;
}

/**
 * Builder for managing result spans during block execution.
 * Provides methods to create, track, and manage execution spans.
 */
export interface IResultSpanBuilder {
  /**
   * Creates a new result span for the given block.
   */
  create(blockKey: string, metrics: RuntimeMetric[]): ResultSpan;
  
  /**
   * Gets the current active spans.
   */
  getSpans(): ResultSpan[];
  
  /**
   * Closes the current span and finalizes timing.
   */
  close(): void;
  
  /**
   * Starts timing for the current span.
   */
  start(): void;
  
  /**
   * Stops timing for the current span.
   */
  stop(): void;
}
