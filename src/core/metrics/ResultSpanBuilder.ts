import { MetricValue } from "../MetricValue";
import { RuntimeMetric } from "../RuntimeMetric";
import { RuntimeSpan } from "../RuntimeSpan";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { ITimeSpan } from "../ITimeSpan";

/**
 * Builder class for creating and managing RuntimeSpan objects.
 * Provides a fluent interface for creating spans with metrics and timespans.
 */
export class ResultSpanBuilder {
  private spans: RuntimeSpan[] = [];
  private currentSpan: RuntimeSpan | null = null;

  /**
   * Creates a new RuntimeSpan with the passed in metrics
   * @param metrics Array of RuntimeMetric objects to add to the span
   * @returns The builder instance for chaining
   */
  public Create(metrics: RuntimeMetric[]): ResultSpanBuilder {
    const span = new RuntimeSpan();
    span.metrics = [...metrics];
    span.timeSpans = [];
    this.spans.push(span);
    this.currentSpan = span;
    return this;
  }

  /**
   * Allows a value metric to populate a MetricValue if the current type 
   * metric value is not already on the RuntimeMetric item in the collection
   * @param value The metric value to inherit
   * @returns The builder instance for chaining
   */
  public Inherit(value: MetricValue): ResultSpanBuilder {
    if (!this.currentSpan) {
      throw new Error("No current span exists. Call Create() first.");
    }

    // For each metric in the current span
    this.currentSpan.metrics.forEach(metric => {
      // Check if this metric already has a value of this type
      const existingValue = metric.values.find(v => v.type === value.type && v.unit === value.unit);
      
      // If there's no existing value of this type, add it
      if (!existingValue) {
        metric.values.push({ ...value });
      }
    });

    return this;
  }

  /**
   * Allows a metric value to override all the child RuntimeMetric values
   * whether they are there or not
   * @param value The metric value to use for overriding
   * @returns The builder instance for chaining
   */
  public Override(value: MetricValue): ResultSpanBuilder {
    if (!this.currentSpan) {
      throw new Error("No current span exists. Call Create() first.");
    }

    // For each metric in the current span
    this.currentSpan.metrics.forEach(metric => {
      // Remove any existing values of the same type
      const filteredValues = metric.values.filter(v => v.type !== value.type || v.unit !== value.unit);
      
      // Add the new value
      filteredValues.push({ ...value });
      
      // Update the metric values
      metric.values = filteredValues;
    });

    return this;
  }

  /**
   * Creates a start timespan for the current RuntimeSpan
   * @returns The builder instance for chaining
   */
  public Start(): ResultSpanBuilder {
    if (!this.currentSpan) {
      throw new Error("No current span exists. Call Create() first.");
    }

    const newTimeSpan: ITimeSpan = {
      start: { name: 'span_started', timestamp: new Date() }
    };

    this.currentSpan.timeSpans.push(newTimeSpan);
    return this;
  }

  /**
   * Stops the most recent timespan in the current RuntimeSpan
   * @returns The builder instance for chaining
   */
  public Stop(): ResultSpanBuilder {
    if (!this.currentSpan) {
      throw new Error("No current span exists. Call Create() first.");
    }

    const timeSpans = this.currentSpan.timeSpans;
    if (timeSpans.length === 0) {
      throw new Error("No timespan to stop. Call Start() first.");
    }

    const currentTimeSpan = timeSpans[timeSpans.length - 1];
    if (!currentTimeSpan.stop) {
      currentTimeSpan.stop = { name: 'span_stopped', timestamp: new Date() };
    }

    return this;
  }

  /**
   * Returns the last ResultSpan in the list
   * @returns The current RuntimeSpan
   */
  public Current(): RuntimeSpan {
    if (!this.currentSpan) {
      throw new Error("No current span exists. Call Create() first.");
    }
    
    return this.currentSpan;
  }

  /**
   * Returns the complete list of ResultSpans
   * @returns Array of all RuntimeSpans created by this builder
   */
  public All(): RuntimeSpan[] {
    return [...this.spans];
  }

  /**
   * Associates the spans with a specific runtime block
   * @param block The block to associate with the spans
   * @returns The builder instance for chaining
   */
  public ForBlock(block: IRuntimeBlock): ResultSpanBuilder {
    if (!block) return this;
    
    this.spans.forEach(span => {
      span.blockKey = block.blockKey;
      span.index = block.blockKey.index;
      
      // Also associate block key with each timespan
      span.timeSpans.forEach(timeSpan => {
        timeSpan.blockKey = block.blockKey.toString();
        
        if (timeSpan.start) {
          timeSpan.start.blockKey = block.blockKey.toString();
        }
        
        if (timeSpan.stop) {
          timeSpan.stop.blockKey = block.blockKey.toString();
        }
      });
    });
    
    return this;
  }
}