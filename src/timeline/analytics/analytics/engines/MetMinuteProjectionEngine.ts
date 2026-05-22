import { ISummaryProcessor } from '../../../../core/analytics/ISummaryProcessor';
import { extractMetrics } from '../../../../core/analytics/extractMetrics';
import { ProjectionResult } from '../ProjectionResult';
import { IMetric, MetricType } from '../../../../core/models/Metric';
import { IOutputStatement } from '../../../../core/models/OutputStatement';
import { TimeSpan } from '../../../../runtime/models/TimeSpan';
import { DEFAULT_UNRESOLVED_EFFORT_MET, extractEffortData, resolveDominantOrigin } from '../../../../core/analytics/effortResolution';
import type { ResolvedEffortData } from '../../../../core/analytics/effortResolution';

/**
 * MetMinuteProjectionEngine - Calculates total energy expenditure in MET-minutes.
 *
 * Consumes resolved effort data (attached by TwoPassEffortResolutionProcess)
 * for MET values. Missing effort-data falls back to the unresolved-effort
 * default owned by the effort resolution module.
 *
 * Formula: ∑(METs × timeMs / 60 000) across all timed segments.
 */
export class MetMinuteProjectionEngine implements ISummaryProcessor {
  public readonly id = 'met-minute-projection';
  public readonly name = 'MetMinuteProjectionEngine';
  public readonly dialects = ['wod', 'log'] as const;
  public readonly requiredMetrics = [MetricType.Action] as const;

  summarize(outputs: IOutputStatement[]): ProjectionResult[] {
    return this.calculateFromWorkout(extractMetrics(outputs));
  }

  calculateFromWorkout(metrics: IMetric[]): ProjectionResult[] {
    let totalMetMinutes = 0;
    let lastEffortData: ResolvedEffortData | null = null;
    const origins: import('../../../../core/models/Metric').MetricOrigin[] = [];

    for (const m of metrics) {
      const effortData = extractEffortData([m]);
      if (effortData) {
        lastEffortData = effortData;
        origins.push(effortData.origin);
        continue;
      }

      if (m.type === MetricType.Elapsed && typeof m.value === 'number' && m.value > 0) {
        const mets = lastEffortData?.resolved.met ?? DEFAULT_UNRESOLVED_EFFORT_MET;
        if (!lastEffortData) origins.push('analyzed-estimated');
        totalMetMinutes += mets * (m.value / 60000);
      }
    }

    if (totalMetMinutes <= 0) return [];

    const now = new Date();
    const origin = origins.length > 0 ? resolveDominantOrigin(origins) : 'analyzed';

    return [{
      name: 'Energy',
      value: Math.round(totalMetMinutes),
      unit: 'MET-min',
      metricType: MetricType.Work,
      timeSpan: new TimeSpan(now.getTime(), now.getTime()),
      origin,
      metadata: {
        usedResolvedEffort: lastEffortData !== null,
        effortOrigin: lastEffortData?.origin,
        effortSlug: lastEffortData?.resolved.slug,
      },
    }];
  }
}
