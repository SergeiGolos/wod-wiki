/**
 * SimpleMetricSource — lightweight IMetricSource for wrapping raw metric arrays.
 *
 * Use when you have an IMetric[] but no model class (e.g., synthetic
 * metric built from analytics segments). For parsed statements use
 * CodeStatement directly; for output statements use OutputStatement directly.
 *
 * @see docs/FragmentOverhaul.md — Phase 5
 */

import { MetricType, IMetric } from '../models/Metric';
import { IMetricSource, MetricFilter } from '../contracts/IMetricSource';
import { resolveMetricPrecedence, ORIGIN_PRECEDENCE } from '../utils/metricPrecedence';

export class SimpleMetricSource implements IMetricSource {
    readonly id: string | number;
    private readonly _metrics: IMetric[];

    constructor(id: string | number, metrics: IMetric[]) {
        this.id = id;
        this._metrics = metrics;
    }

    getDisplayMetrics(filter?: MetricFilter): IMetric[] {
        return resolveMetricPrecedence([...this._metric], filter);
    }

    getMetric(type: MetricType): IMetric | undefined {
        const all = this.getAllMetricsByType(type);
        return all.length > 0 ? all[0] : undefined;
    }

    getAllMetricsByType(type: MetricType): IMetric[] {
        const ofType = this._metric.filter(f => f.metricType === type);
        if (ofType.length === 0) return [];
        return [...ofType].sort((a, b) => {
            const rankA = ORIGIN_PRECEDENCE[a.origin ?? 'parser'] ?? 3;
            const rankB = ORIGIN_PRECEDENCE[b.origin ?? 'parser'] ?? 3;
            return rankA - rankB;
        });
    }

    hasMetric(type: MetricType): boolean {
        return this._metric.some(f => f.metricType === type);
    }

    get rawMetrics(): IMetric[] {
        return [...this._metric];
    }
}
