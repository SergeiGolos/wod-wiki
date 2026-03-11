import { IEnrichmentProcess } from '../contracts/IEnrichmentProcess';
import { IOutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';

/**
 * SpeedEnrichmentProcess - Derives speed and pace from a single segment's
 * distance and elapsed-time metrics.
 *
 * Adds two analyzed metrics to each qualifying segment:
 *  - Speed (m/s): distance ÷ elapsed seconds
 *  - Pace (min/km): elapsed minutes ÷ distance in kilometres
 *
 * No cross-segment state is carried; every computation is local to the segment.
 */
export class SpeedEnrichmentProcess implements IEnrichmentProcess {
    public readonly id = 'speed-enrichment';
    public readonly processType = 'enrichment' as const;

    process(output: IOutputStatement): IOutputStatement {
        if (output.outputType !== 'segment' || !output.isLeaf) return output;

        const elapsedMs = output.getMetric(MetricType.Elapsed)?.value as number ?? 0;
        if (elapsedMs <= 0) return output;

        const distanceFrag = output.getMetric(MetricType.Distance);
        const distanceM = (distanceFrag?.value as any)?.amount;
        if (typeof distanceM !== 'number' || distanceM <= 0) return output;

        const elapsedSec = elapsedMs / 1000;
        const speedMs = distanceM / elapsedSec;

        // Speed (m/s)
        output.metrics.push({
            type: MetricType.Metric,
            image: `Speed: ${speedMs.toFixed(2)} m/s`,
            value: parseFloat(speedMs.toFixed(2)),
            unit: 'm/s',
            origin: 'analyzed',
            timestamp: new Date()
        });

        // Pace (min/km) — only meaningful for distances ≥ 1 m
        const distanceKm = distanceM / 1000;
        if (distanceKm > 0) {
            const paceMinKm = elapsedMs / 1000 / 60 / distanceKm;
            output.metrics.push({
                type: MetricType.Metric,
                image: `Pace: ${paceMinKm.toFixed(2)} min/km`,
                value: parseFloat(paceMinKm.toFixed(2)),
                unit: 'min/km',
                origin: 'analyzed',
                timestamp: new Date()
            });
        }

        return output;
    }

    finalize(): [] {
        return [];
    }
}
