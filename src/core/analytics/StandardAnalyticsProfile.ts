import type { IAnalyticsProfile, AnalyticsProfileContext } from './IAnalyticsProfile';
import type { IRealtimeProcessor } from './IRealtimeProcessor';
import type { ISummaryProcessor } from './ISummaryProcessor';
import type { IAnalyticsProcessorDescriptor } from './IAnalyticsProcessorDescriptor';
import { PaceEnrichmentProcess } from './PaceEnrichmentProcess';
import { PowerEnrichmentProcess } from './PowerEnrichmentProcess';
import { RepProjectionEngine } from '../../timeline/analytics/analytics/engines/RepProjectionEngine';
import { DistanceProjectionEngine } from '../../timeline/analytics/analytics/engines/DistanceProjectionEngine';
import { VolumeProjectionEngine } from '../../timeline/analytics/analytics/engines/VolumeProjectionEngine';
import { SessionLoadProjectionEngine } from '../../timeline/analytics/analytics/engines/SessionLoadProjectionEngine';
import { MetMinuteProjectionEngine } from '../../timeline/analytics/analytics/engines/MetMinuteProjectionEngine';
import { TISProcessor } from '../../timeline/analytics/analytics/engines/TISProcessor';

/**
 * Standard built-in analytics profile.
 *
 * Registers all default processors. Filtering by dialect and required
 * metrics is applied during build().
 */
export class StandardAnalyticsProfile implements IAnalyticsProfile {
  private readonly allRealtime: IRealtimeProcessor[] = [
    new PaceEnrichmentProcess(),
    new PowerEnrichmentProcess(),
  ];

  private readonly allSummary: ISummaryProcessor[] = [
    new RepProjectionEngine(),
    new DistanceProjectionEngine(),
    new VolumeProjectionEngine(),
    new SessionLoadProjectionEngine(),
    new MetMinuteProjectionEngine(),
  ];

  build(context: AnalyticsProfileContext): {
    realtime: IRealtimeProcessor[];
    summary: ISummaryProcessor[];
  } {
    const summary = [
      ...this.allSummary,
      new TISProcessor(context.userProfile?.vo2max),
    ];
    return {
      realtime: this.allRealtime.filter(p => this.isApplicable(p, context)),
      summary: summary.filter(p => this.isApplicable(p, context)),
    };
  }

  private isApplicable(
    processor: IAnalyticsProcessorDescriptor,
    context: AnalyticsProfileContext
  ): boolean {
    // Dialect filter: if dialects is specified, context dialect must be in the list
    if (processor.dialects && processor.dialects.length > 0) {
      if (!processor.dialects.includes(context.dialect)) {
        return false;
      }
    }

    // Required metrics filter: if requiredMetrics is specified, ALL must be present
    if (processor.requiredMetrics && processor.requiredMetrics.length > 0) {
      for (const required of processor.requiredMetrics) {
        if (!context.scriptMetricTypes.has(required)) {
          return false;
        }
      }
    }

    return true;
  }
}
