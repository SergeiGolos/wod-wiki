import type { IAnalyticsProfile, AnalyticsProfileContext } from './IAnalyticsProfile';
import type { IRealtimeProcessor } from './IRealtimeProcessor';
import type { ISummaryProcessor } from './ISummaryProcessor';
import type { IAnalyticsProcessorDescriptor } from './IAnalyticsProcessorDescriptor';
import { Registry } from '@/core/Registry';
import { PaceEnrichmentProcess } from './PaceEnrichmentProcess';
import { PowerEnrichmentProcess } from './PowerEnrichmentProcess';
import { TwoPassEffortResolutionProcess } from './TwoPassEffortResolutionProcess';
import { RepProjectionEngine } from './engines/RepProjectionEngine';
import { DistanceProjectionEngine } from './engines/DistanceProjectionEngine';
import { VolumeProjectionEngine } from './engines/VolumeProjectionEngine';
import { SessionLoadProjectionEngine } from './engines/SessionLoadProjectionEngine';
import { MetMinuteProjectionEngine } from './engines/MetMinuteProjectionEngine';
import { TISProcessor } from './engines/TISProcessor';

/**
 * Consumer-facing registries for analytics processors, pre-seeded with
 * the built-in processors. Replaces the previous `allRealtime` and
 * `allSummary` flat arrays in this module.
 *
 * Register custom processors (e.g. sport-specific analytics) with the
 * standard `register`/`unregister` shape. Built-ins can be overridden by
 * `id`.
 *
 * @example
 * ```typescript
 * import { summaryProcessorRegistry } from 'wod-wiki/core';
 * summaryProcessorRegistry.register(ClimbGradeProgressionProcess);
 * ```
 */
export const realtimeProcessorRegistry = new Registry<IRealtimeProcessor>([
    new PaceEnrichmentProcess(),
    new PowerEnrichmentProcess(),
]);

export const summaryProcessorRegistry = new Registry<ISummaryProcessor>([
    new RepProjectionEngine(),
    new DistanceProjectionEngine(),
    new VolumeProjectionEngine(),
    new SessionLoadProjectionEngine(),
    new MetMinuteProjectionEngine(),
]);

/**
 * Standard built-in analytics profile.
 *
 * Filtering by fence dialect and required metrics is applied during build().
 */
export class StandardAnalyticsProfile implements IAnalyticsProfile {
    build(context: AnalyticsProfileContext): {
        realtime: IRealtimeProcessor[];
        summary: ISummaryProcessor[];
    } {
        const realtime: IRealtimeProcessor[] = [];

        // Two-pass effort resolution MUST run first so downstream processors
        // see enriched effort-data metrics.
        if (context.analyticsContext?.effortResolver) {
            realtime.push(new TwoPassEffortResolutionProcess(context.analyticsContext.effortResolver));
        }

        realtime.push(...realtimeProcessorRegistry.list().filter(p => this.isApplicable(p, context)));

        const summary = [
            ...summaryProcessorRegistry.list(),
            new TISProcessor(context.userProfile?.vo2max),
        ];

        return {
            realtime,
            summary: summary.filter(p => this.isApplicable(p, context)),
        };
    }

    private isApplicable(
        processor: IAnalyticsProcessorDescriptor,
        context: AnalyticsProfileContext
    ): boolean {
        // Fence-dialect filter: if `fenceTypes` is specified, context dialect must be in the list
        if (processor.fenceTypes && processor.fenceTypes.length > 0) {
            if (!processor.fenceTypes.includes(context.dialect)) {
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
