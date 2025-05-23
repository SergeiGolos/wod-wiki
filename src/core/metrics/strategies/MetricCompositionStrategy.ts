import { IRuntimeBlock } from "../../IRuntimeBlock";
import { ITimerRuntime } from "../../ITimerRuntime";
import { RuntimeMetric } from "../../RuntimeMetric";
import { IMetricCompositionStrategy } from "../IMetricCompositionStrategy";
import { RuntimeSpan } from "../../RuntimeSpan";

/**
 * Base implementation of the IMetricCompositionStrategy interface.
 * Provides methods to extract and compose metrics from runtime blocks and spans.
 * 
 * @deprecated Use RuntimeMetricBuilder and RuntimeBlockMetrics instead
 */
export class MetricCompositionStrategy implements IMetricCompositionStrategy {
  /**
   * Composes metrics for a runtime block.
   * By default, extracts metrics from the block's spans and sources.
   * 
   * @param block The runtime block to compose metrics for
   * @param runtime The timer runtime instance
   * @returns An array of RuntimeMetric objects
   */
  public composeMetrics(block: IRuntimeBlock, runtime: ITimerRuntime): RuntimeMetric[] {
    // First check if we have metrics in spans
    const spanMetrics = this.extractMetricsFromSpans(block.spans());
    if (spanMetrics.length > 0) {
      return spanMetrics;
    }

    // Fallback to extracting metrics from sources
    return this.extractMetricsFromSources(block, runtime);
  }

  /**
   * Extracts metrics from a block's spans.
   * 
   * @param spans The spans to extract metrics from
   * @returns An array of RuntimeMetric objects
   */
  protected extractMetricsFromSpans(spans: RuntimeSpan[]): RuntimeMetric[] {
    if (!spans || spans.length === 0) {
      return [];
    }

    // Collect all metrics from all spans
    const metrics: RuntimeMetric[] = [];
    for (const span of spans) {
      if (span.metrics && span.metrics.length > 0) {
        metrics.push(...span.metrics);
      }
    }

    return metrics;
  }

  /**
   * Extracts metrics from a block's sources.
   * This is a fallback method when no metrics are available in spans.
   * 
   * @param block The runtime block to extract metrics from
   * @param runtime The timer runtime instance
   * @returns An array of RuntimeMetric objects
   */
  protected extractMetricsFromSources(block: IRuntimeBlock, _runtime: ITimerRuntime): RuntimeMetric[] {
    const metrics: RuntimeMetric[] = [];
    
    for (const source of block.sources) {
      const metric: RuntimeMetric = {
        sourceId: "",
        effort: "",
        values: []
      };

      // Set sourceId
      metric.sourceId = source.id?.toString() ?? source.toString() ?? "unknown_source_id";      // Set effort - try to get a meaningful name
      let effortValue = ""; 
        // First check for a proper effort fragment
      const effortFragment = source.effort(block.blockKey);
      if (effortFragment && effortFragment.effort) {
        effortValue = effortFragment.effort;
      }
        // If no effort fragment, try to extract a name from the source
      if (!effortValue) {
        // Try to use the source's string representation
        const sourceText = source.toString();
        if (sourceText && sourceText !== "[object Object]") {
          // Use the first few characters as the exercise name
          effortValue = sourceText.slice(0, 20);
        }
      }
      
      // Fall back to a generic name if we still don't have one
      if (!effortValue) {
        effortValue = `Exercise ${metric.sourceId.split(':')[0] || ""}`;
      }
      
      metric.effort = effortValue;
      metrics.push(metric);
    }
    
    return metrics;
  }

  /**
   * Combines metrics from child blocks based on the specified relationship type.
   * 
   * @param childMetrics The metrics from child blocks
   * @param relationshipType The relationship type (ADD, MULTIPLY, INHERIT)
   * @param factor The factor to multiply by (for MULTIPLY relationship)
   * @returns The combined metrics
   */
  protected combineChildMetrics(
    childMetrics: RuntimeMetric[], 
    relationshipType: 'ADD' | 'MULTIPLY' | 'INHERIT' = 'ADD',
    factor: number = 1
  ): RuntimeMetric[] {
    if (childMetrics.length === 0) {
      return [];
    }

    if (relationshipType === 'INHERIT') {
      // Simply pass through the child metrics
      return [...childMetrics];
    }

    if (relationshipType === 'MULTIPLY') {
      // Multiply each metric value by the factor
      return childMetrics.map(metric => ({
        ...metric,
        values: metric.values.map(val => ({
          ...val,
          value: val.value * factor
        }))
      }));
    }

    // Default is ADD - already have the combined metrics
    return childMetrics;
  }

  /**
   * Gets metrics from child blocks in the runtime.
   * 
   * @param block The parent block
   * @param runtime The timer runtime instance
   * @returns Metrics from all child blocks
   */
  protected getChildMetrics(block: IRuntimeBlock, runtime: ITimerRuntime): RuntimeMetric[] {
    // This would need to be implemented based on how child blocks are accessed
    // For now, return an empty array as a placeholder
    return [];
  }
}