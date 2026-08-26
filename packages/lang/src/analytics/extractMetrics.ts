import type { IOutputStatement } from '@bitcobblers/wod-wiki-core';
import type { IMetric } from '@bitcobblers/wod-wiki-core';

/**
 * Flatten all metrics from a collection of output statements into a single array.
 * Preserves order. Used by projection stages to replicate the metric stream
 * that AnalysisService previously received from ProjectionSyncProcess.
 */
export function extractMetrics(outputs: IOutputStatement[]): IMetric[] {
  return outputs.flatMap(o => o.metrics?.rawMetrics ?? []);
}
