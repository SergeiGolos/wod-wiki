/**
 * Shared utility for managing IMetric arrays and labels.
 * 
 * This utility is used by multiple UI components:
 * - RuntimeEventLog (sectioned log view)
 * - RuntimeHistoryPanel (tree view)
 * - AnalyticsLayout (timeline/graphs)
 */

import { IMetric, MetricType } from '../../core/models/Metric';
import { MetricContainer } from '../../core/models/MetricContainer';

/**
 * Extract a human-readable label from an array of metric.
 */
export function metricsToLabel(metrics: MetricContainer | IMetric[] | IMetric[][]): string {
    if (metrics instanceof MetricContainer) {
        return metricsToLabel(metrics.toArray());
    }
    const first = metrics[0];
    const flat = Array.isArray(first) ? (metrics as IMetric[][]).flat() : (metrics as IMetric[]);

    // Highest priority: explicit Label metric
    const labelFragment = flat.find(f => f.type === MetricType.Label);
    if (labelFragment) return labelFragment.image || labelFragment.value?.toString() || 'Block';

    // Try to find an Effort or Action metric next
    const primary = flat.find(f => f.type === MetricType.Effort || f.type === MetricType.Action);
    if (primary) return primary.image || primary.value?.toString() || 'Block';

    // Fallback to first metric with an image
    const firstWithImage = flat.find(f => f.image);
    if (firstWithImage) return firstWithImage.image || 'Block';

    return 'Block';
}
