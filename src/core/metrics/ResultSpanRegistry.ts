import { RuntimeSpan } from "../RuntimeSpan";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { RuntimeMetric } from "../RuntimeMetric";

/**
 * Centralized registry for managing ResultSpans across the runtime.
 * Provides methods for querying, filtering, and aggregating span data.
 */
export class ResultSpanRegistry {
  private spans: RuntimeSpan[] = [];
  
  /**
   * Registers a span in the registry
   * @param span The span to register
   */
  public registerSpan(span: RuntimeSpan): void {
    if (!span) return;
    
    // Check if the span already exists by comparing key properties
    const existingIndex = this.spans.findIndex(s => 
      s.blockKey === span.blockKey && 
      s.index === span.index && 
      s.start?.timestamp.getTime() === span.start?.timestamp.getTime()
    );
    
    if (existingIndex >= 0) {
      // Update existing span
      this.spans[existingIndex] = span;
    } else {
      // Add new span
      this.spans.push(span);
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
    return [...this.spans];
  }
  
  /**
   * Gets spans by block key
   * @param blockKey The block key to filter by
   * @returns Array of matching ResultSpans
   */
  public getSpansByBlockKey(blockKey: string): RuntimeSpan[] {
    return this.spans.filter(span => span.blockKey === blockKey);
  }
  
  /**
   * Gets spans by time range
   * @param startTime Start of the time range
   * @param endTime End of the time range
   * @returns Array of matching ResultSpans
   */
  public getSpansByTimeRange(startTime: Date, endTime: Date): RuntimeSpan[] {
    return this.spans.filter(span => {
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
    return this.spans.filter(span => {
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
  public createHierarchicalView(rootBlockKey?: string): SpanNode {
    // Root node of the tree
    const root: SpanNode = {
      span: undefined,
      children: []
    };
    
    // If no root block key provided, use all top-level spans
    const rootSpans = rootBlockKey 
      ? this.spans.filter(span => span.blockKey === rootBlockKey)
      : this.spans.filter(span => {
          // Spans with no parent references or that don't match any other span's blockKey
          const isChild = this.spans.some(otherSpan => 
            otherSpan.children?.includes(span.blockKey || '')
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
        const childSpans = this.spans.filter(s => s.blockKey === childBlockKey);
        
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
   * Clears all spans from the registry
   */
  public clear(): void {
    this.spans = [];
  }
}

/**
 * Represents a node in the span hierarchy tree
 */
export interface SpanNode {
  span?: RuntimeSpan;
  children: SpanNode[];
}
