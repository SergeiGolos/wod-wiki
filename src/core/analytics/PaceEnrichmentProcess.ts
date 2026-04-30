import { IAnalyticsStage } from './IAnalyticsStage';
import { IOutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';

/**
 * PaceEnrichmentProcess - Derives pace (units/time) from a single
 * segment's repetition count or distance and elapsed-time metrics.
 *
 * Adds analyzed metrics to each qualifying segment:
 *  - Pace (reps/min): reps ÷ elapsed minutes
 *  - Pace (m/s): distance ÷ elapsed seconds
 *  - Pace (min/km): elapsed minutes ÷ distance in km (only for distance segments)
 *
 * Stateless; every computation is local to the segment.
 */
export class PaceEnrichmentProcess implements IAnalyticsStage {
    public readonly id = 'pace-enrichment';

    enrich(output: IOutputStatement): IOutputStatement {
        if (output.outputType !== 'segment' || !output.isLeaf) return output;

        const elapsedMs = output.getMetric(MetricType.Elapsed)?.value as number ?? 0;
        if (elapsedMs <= 0) return output;

        const elapsedMin = elapsedMs / 1000 / 60;
        const elapsedSec = elapsedMs / 1000;

        // 1. Repetition Pace (reps/min)
        const repFrags = output.getDisplayMetrics({ types: [MetricType.Rep] });
        let reps = 0;
        for (const frag of repFrags) {
            if (typeof frag.value === 'number') reps += frag.value;
        }

        if (reps > 0) {
            const repsPerMin = reps / elapsedMin;
            output.metrics.add({
                type: 'pace',
                image: `${repsPerMin.toFixed(1)} reps/min`,
                value: parseFloat(repsPerMin.toFixed(1)),
                unit: 'reps/min',
                origin: 'analyzed',
                timestamp: new Date()
            });
        }

        // 2. Distance Pace (distance/time)
        const distanceFrag = output.getMetric(MetricType.Distance);
        const distanceM = (distanceFrag?.value as any)?.amount ?? (typeof distanceFrag?.value === 'number' ? distanceFrag.value : 0);

        if (distanceM > 0) {
            // "Pace" as distance/time (as requested by user)
            const speedMs = distanceM / elapsedSec;
            output.metrics.add({
                type: 'pace',
                image: `${speedMs.toFixed(2)} m/s`,
                value: parseFloat(speedMs.toFixed(2)),
                unit: 'm/s',
                origin: 'analyzed',
                timestamp: new Date()
            });

            // "Pace" as time/distance (standard runner's pace)
            const distanceKm = distanceM / 1000;
            if (distanceKm > 0) {
                const paceMinKm = elapsedMin / distanceKm;
                output.metrics.add({
                    type: 'pace',
                    image: `${paceMinKm.toFixed(2)} min/km`,
                    value: parseFloat(paceMinKm.toFixed(2)),
                    unit: 'min/km',
                    origin: 'analyzed',
                    timestamp: new Date()
                });
            }
        }

        return output;
    }
}
