import { IMetric, MetricType } from '../../models/Metric';
import type { MetricFilter } from '../../contracts/IMetricSource';
import type { IMetricOwnershipResolver } from '../../contracts/IMetricOwnershipResolver';
import type { MetricOwnershipLayer, MetricWithOptionalOwnershipLayer } from './types';
import { getMetricOwnershipLayer, METRIC_OWNERSHIP_LAYER_CHAIN } from './types';
import { createMetricOwnershipLedger } from './ledger';


function resolveLayer(metric: IMetric): MetricOwnershipLayer {
    const maybeLayer = (metric as MetricWithOptionalOwnershipLayer).ownershipLayer;
    if (maybeLayer != null) return maybeLayer;
    return getMetricOwnershipLayer(metric.origin);
}

/**
 * Ownership layer rank for a metric (0 = lowest = parser, 4 = highest = user-entry).
 * Higher rank wins.
 */
export function ownershipRank(metric: IMetric): number {
    const layer = resolveLayer(metric);
    return METRIC_OWNERSHIP_LAYER_CHAIN.indexOf(layer);
}

function applyFilter(metrics: readonly IMetric[], filter?: MetricFilter): IMetric[] {
    let filtered = [...metrics];
    const wantsHints = filter?.types?.includes(MetricType.Hint) ?? false;
    if (!wantsHints) {
        filtered = filtered.filter(m => m.type !== MetricType.Hint);
    }
    if (!filter) return filtered;
    if (filter.origins) {
        filtered = filtered.filter(m => filter.origins!.includes(m.origin ?? 'parser'));
    }
    if (filter.types) {
        filtered = filtered.filter(m => filter.types!.includes(m.type as MetricType));
    }
    if (filter.excludeTypes) {
        filtered = filtered.filter(m => !filter.excludeTypes!.includes(m.type as MetricType));
    }
    return filtered;
}

/**
 * Single-path resolver wrapping `MetricOwnershipLedger` + legacy filter translation.
 */
export class OwnershipResolver implements IMetricOwnershipResolver {
    resolve(metrics: readonly IMetric[], filter?: MetricFilter): IMetric[] {
        const filtered = applyFilter(metrics, filter);
        const ledger = createMetricOwnershipLedger(filtered);
        return ledger.visible();
    }

    resolveOne(metrics: readonly IMetric[], type: MetricType): IMetric | undefined {
        return this.resolve(metrics, { types: [type] })[0];
    }

    resolveAll(metrics: readonly IMetric[], type: MetricType): IMetric[] {
        const ofType = metrics.filter(m => m.type === type);
        if (ofType.length <= 1) return ofType;
        return [...ofType].sort((a, b) => ownershipRank(b) - ownershipRank(a));
    }
}
