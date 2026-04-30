import type { IOutputStatement } from '../models/OutputStatement';
import type { IMetric } from '../models/Metric';

/**
 * Flatten all metrics from a collection of output statements into a single array.
 * Preserves order. Used by projection stages to replicate the metric stream
 * that AnalysisService previously received from ProjectionSyncProcess.
 */
export function extractMetrics(outputs: IOutputStatement[]): IMetric[] {
  return outputs.flatMap(o => o.metrics?.rawMetrics ?? []);
}
