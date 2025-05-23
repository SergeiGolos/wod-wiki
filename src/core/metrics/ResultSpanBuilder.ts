import { MetricValue } from "../MetricValue";
import { RuntimeMetric } from "../RuntimeMetric";
import { RuntimeSpan } from "../RuntimeSpan";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { ITimeSpan } from "../ITimeSpan";
import { BlockKey } from "../BlockKey";

/**
 * Builder class for creating and managing RuntimeSpan objects.
 * Provides a fluent interface for creating spans with metrics and timespans.
 */
export class ResultSpanBuilder {
  private spans: RuntimeSpan[] = [];
  private currentSpan: RuntimeSpan | null = null;
  private registeredSpans: RuntimeSpan[] = [];

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
   * Sets the current span to the provided RuntimeSpan
   * @param span The RuntimeSpan to set as current
   * @returns The builder instance for chaining
   */
  public SetCurrentSpan(span: RuntimeSpan): ResultSpanBuilder {
    if (!span) {
      throw new Error("Cannot set null or undefined as current span.");
    }
    
    this.currentSpan = span;
    
    // If this span isn't already in the spans array, add it
    if (!this.spans.includes(span)) {
      this.spans.push(span);
    }
    
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
      start: { name: 'block_started', timestamp: new Date() }
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
      currentTimeSpan.stop = { name: 'block_stopped', timestamp: new Date() };
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
      span.leaf = block.leaf; // propagate leaf marker
      
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

  /**
   * Registers a span in the builder's registry
   * @param span The span to register
   */
  public registerSpan(span: RuntimeSpan): void {
    if (!span) return;
    
    // Convert blockKey to string if it's a BlockKey object
    const blockKeyStr = this.getBlockKeyAsString(span.blockKey);
    
    // Check if the span already exists by comparing key properties
    const existingIndex = this.registeredSpans.findIndex(s => 
      this.getBlockKeyAsString(s.blockKey) === blockKeyStr && 
      s.index === span.index && 
      s.start?.timestamp.getTime() === span.start?.timestamp.getTime()
    );
    
    if (existingIndex >= 0) {
      // Update existing span
      this.registeredSpans[existingIndex] = span;
    } else {
      // Add new span
      this.registeredSpans.push(span);
    }
  }

  /**
   * Registers all spans from a runtime block
   * @param block The block containing spans to register
   */
  public registerBlockSpans(block: IRuntimeBlock): void {
    if (!block) return;
    
    const spans = block.spans();
    spans.forEach(span => this.registerSpan(span));
  }

  /**
   * Gets all spans in the registry
   * @returns Array of all registered ResultSpans
   */
  public getAllSpans(): RuntimeSpan[] {
    return [...this.registeredSpans];
  }

  /**
   * Gets spans by block key
   * @param blockKey The block key to filter by
   * @returns Array of matching ResultSpans
   */
  public getSpansByBlockKey(blockKey: string | BlockKey): RuntimeSpan[] {
    const blockKeyStr = this.getBlockKeyAsString(blockKey);
    return this.registeredSpans.filter(span => 
      this.getBlockKeyAsString(span.blockKey) === blockKeyStr
    );
  }

  /**
   * Gets spans by time range
   * @param startTime Start of the time range
   * @param endTime End of the time range
   * @returns Array of matching ResultSpans
   */
  public getSpansByTimeRange(startTime: Date, endTime: Date): RuntimeSpan[] {
    return this.registeredSpans.filter(span => {
      // If span has start time
      if (span.start) {
        const spanStartTime = span.start.timestamp.getTime();
        const rangeStartTime = startTime.getTime();
        const rangeEndTime = endTime.getTime();
        
        // Check if span starts within the range
        return spanStartTime >= rangeStartTime && spanStartTime <= rangeEndTime;
      }
      
      return false;
    });
  }

  /**
   * Gets spans that contain a specific metric
   * @param effortName Name of the effort to filter by (optional)
   * @param metricType Type of metric to filter by (optional)
   * @returns Array of matching ResultSpans
   */
  public getSpansByMetric(effortName?: string, metricType?: string): RuntimeSpan[] {
    return this.registeredSpans.filter(span => {
      // If no criteria provided, return all spans with metrics
      if (!effortName && !metricType) {
        return span.metrics.length > 0;
      }
      
      // Filter spans by the provided criteria
      return span.metrics.some(metric => {
        // If effort name provided, check if it matches
        const effortMatch = !effortName || metric.effort === effortName;
        
        // If metric type provided, check if any value has that type
        const typeMatch = !metricType || metric.values.some(v => v.type === metricType);
        
        return effortMatch && typeMatch;
      });
    });
  }

  /**
   * Aggregates metrics across spans
   * @param spans The spans to aggregate metrics from
   * @returns Aggregated metrics
   */
  public aggregateMetrics(spans: RuntimeSpan[]): RuntimeMetric[] {
    const metricsMap = new Map<string, RuntimeMetric>();
    
    // Process each span
    spans.forEach(span => {
      span.metrics.forEach(metric => {
        const key = `${metric.sourceId}:${metric.effort}`;
        
        if (!metricsMap.has(key)) {
          // First occurrence of this metric, just add it
          metricsMap.set(key, { ...metric, values: [...metric.values] });
        } else {
          // Merge with existing metric
          const existingMetric = metricsMap.get(key)!;
          
          // For each value in the current metric
          metric.values.forEach(value => {
            // Find a matching value in the existing metric
            const existingValue = existingMetric.values.find(v => v.type === value.type && v.unit === value.unit);
            
            if (existingValue) {
              // Sum the values if they match type and unit
              existingValue.value += value.value;
            } else {
              // Otherwise add as a new value
              existingMetric.values.push({ ...value });
            }
          });
        }
      });
    });
    
    // Convert the map to an array
    return Array.from(metricsMap.values());
  }

  /**
   * Creates a hierarchical view of spans based on their relationships
   * @param rootBlockKey The block key of the root span (optional)
   * @returns A tree structure of spans
   */
  public createHierarchicalView(rootBlockKey?: string | BlockKey): SpanNode {
    // Root node of the tree
    const root: SpanNode = {
      span: undefined,
      children: []
    };
    
    // Convert rootBlockKey to string if it's provided
    const rootBlockKeyStr = rootBlockKey ? this.getBlockKeyAsString(rootBlockKey) : undefined;
    
    // If no root block key provided, use all top-level spans
    const rootSpans = rootBlockKeyStr 
      ? this.registeredSpans.filter(span => this.getBlockKeyAsString(span.blockKey) === rootBlockKeyStr)
      : this.registeredSpans.filter(span => {
          // Spans with no parent references or that don't match any other span's blockKey
          const isChild = this.registeredSpans.some(otherSpan => 
            otherSpan.children?.includes(this.getBlockKeyAsString(span.blockKey) || '')
          );
          return !isChild;
        });
    
    // For each root span, build a subtree
    rootSpans.forEach(span => {
      const node = this.buildSpanTree(span);
      root.children.push(node);
    });
    
    return root;
  }

  /**
   * Builds a tree of spans starting from a given span
   * @param span The span to start from
   * @returns A tree node with the span and its children
   * @private
   */
  private buildSpanTree(span: RuntimeSpan): SpanNode {
    const node: SpanNode = {
      span,
      children: []
    };
    
    // If the span has child references, add them to the tree
    if (span.children && span.children.length > 0) {
      span.children.forEach((childBlockKey: string) => {
        // Find child spans with matching blockKey
        const childSpans = this.registeredSpans.filter(s => 
          this.getBlockKeyAsString(s.blockKey) === childBlockKey
        );
        
        // Add each child span as a node in the tree
        childSpans.forEach(childSpan => {
          const childNode = this.buildSpanTree(childSpan);
          node.children.push(childNode);
        });
      });
    }
    
    return node;
  }

  /**
   * Clears all spans from the builder
   */
  public clear(): void {
    this.spans = [];
    this.currentSpan = null;
    this.registeredSpans = [];
  }
  
  /**
   * Helper method to convert a BlockKey object or string to a string
   * @param blockKey The BlockKey object or string
   * @returns The string representation of the BlockKey
   * @private
   */
  private getBlockKeyAsString(blockKey?: string | BlockKey): string {
    if (!blockKey) return '';
    if (typeof blockKey === 'string') return blockKey;
    return blockKey.toString();
  }
}

/**
 * Represents a node in the span hierarchy tree
 */
export interface SpanNode {
  span?: RuntimeSpan;
  children: SpanNode[];
}