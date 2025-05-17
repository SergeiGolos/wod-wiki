import { RuntimeMetric } from "../timer.types";

/**
 * Defines the interface for a strategy to merge new metrics into an existing list of metrics.
 */
export interface IMetricMergeStrategy {
  apply(existingMetrics: RuntimeMetric[], newMetrics: RuntimeMetric[]): RuntimeMetric[];
}

/**
 * Strategy to simply concatenate new metrics to the existing list.
 */
export class ConcatMetricsStrategy implements IMetricMergeStrategy {
  apply(existingMetrics: RuntimeMetric[], newMetrics: RuntimeMetric[]): RuntimeMetric[] {
    return [...existingMetrics, ...newMetrics];
  }
}

/**
 * Strategy to replace existing metrics if a new metric matches by sourceId and effort,
 * otherwise, new metrics are added.
 */
export class ReplaceByIdAndEffortStrategy implements IMetricMergeStrategy {
  apply(existingMetrics: RuntimeMetric[], newMetrics: RuntimeMetric[]): RuntimeMetric[] {
    const updatedMetrics = [...existingMetrics];

    newMetrics.forEach(newMetric => {
      const index = updatedMetrics.findIndex(
        exMetric => exMetric.sourceId === newMetric.sourceId && exMetric.effort === newMetric.effort
      );
      if (index !== -1) {
        updatedMetrics[index] = newMetric; // Replace
      } else {
        updatedMetrics.push(newMetric); // Add
      }
    });

    return updatedMetrics;
  }
}

// TODO: Implement more strategies as needed, e.g.:
// - SumValuesByEffortStrategy (groups by effort, sums numerical values)
// - AverageValuesByEffortStrategy
// - AddOrMergeValuesByIdAndEffortStrategy (if exists, merges 'values' array, else adds)
