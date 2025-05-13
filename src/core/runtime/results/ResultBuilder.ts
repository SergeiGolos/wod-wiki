import { IRuntimeBlock, IRuntimeEvent, ResultSpan, RuntimeMetric } from "@/core/timer.types";

/**
 * ResultBuilder provides a fluent interface for creating ResultSpan objects consistently.
 * It eliminates duplicated logic and ensures proper initialization of all ResultSpan properties.
 */
export class ResultBuilder {
  private resultSpan: ResultSpan = new ResultSpan();
  private block?: IRuntimeBlock;

  /**
   * Create a builder for the specified runtime block
   * @param block The runtime block the result span is associated with
   */
  static forBlock(block: IRuntimeBlock): ResultBuilder {
    const builder = new ResultBuilder();
    builder.block = block;
    builder.resultSpan.blockKey = block.blockKey;
    
    // Get the index from the block
    builder.resultSpan.index = block.getIndex();

    // Extract block stack if available
    if (typeof block.get === 'function') {
      try {
        const stack = block.get<number>(n => [n.id], true);
        if (stack && Array.isArray(stack)) {
          builder.resultSpan.stack = stack;
        } else {
          builder.resultSpan.stack = [builder.resultSpan.index || 0];
        }
      } catch (e) {
        // Fallback if get method fails
        builder.resultSpan.stack = [builder.resultSpan.index || 0];
      }
    } else {
      builder.resultSpan.stack = [builder.resultSpan.index || 0];
    }

    return builder;
  }

  /**
   * Add metrics to the result span
   * @param metrics The metrics to add to the result span
   */
  withMetrics(metrics: RuntimeMetric[]): ResultBuilder {
    this.resultSpan.metrics = metrics;
    return this;
  }

  /**
   * Set a label for the result span
   * @param label The label to set
   */
  withLabel(label: string): ResultBuilder {
    this.resultSpan.label = label;
    return this;
  }

  /**
   * Find and set the start and stop events for this block from runtime history
   * @param runtime The timer runtime containing history
   */
  withEventsFromRuntime(runtime: { history: Array<IRuntimeEvent & { blockKey?: string }> }): ResultBuilder {
    if (!this.block?.blockKey) return this;

    // Find start event
    const startEvent = runtime.history.find(h => 
      h.blockKey === this.block?.blockKey && h.name === "start"
    );
    
    // Find stop event or create a fallback
    const stopEvent = runtime.history.find(h => 
      h.blockKey === this.block?.blockKey && h.name === "stop"
    ) || { timestamp: new Date(), name: "stop" };
    
    this.resultSpan.start = startEvent;
    this.resultSpan.stop = stopEvent;
    
    return this;
  }

  /**
   * Set custom start and stop events
   */
  withEvents(start?: IRuntimeEvent, stop?: IRuntimeEvent): ResultBuilder {
    if (start) this.resultSpan.start = start;
    if (stop) this.resultSpan.stop = stop;
    return this;
  }

  /**
   * Build and return the configured ResultSpan
   */
  build(): ResultSpan {
    return this.resultSpan;
  }
}
