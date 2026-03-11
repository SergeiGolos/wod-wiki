import { IEnrichmentProcess } from '../contracts/IEnrichmentProcess';
import { IOutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';

/**
 * RepRateEnrichmentProcess - Derives repetition rate (reps/min) from a single
 * segment's rep count and elapsed-time metrics.
 *
 * Adds one analyzed metric to each qualifying segment:
 *  - Rep Rate (reps/min): reps ÷ elapsed minutes
 *
 * No cross-segment state is carried; every computation is local to the segment.
 */
export class RepRateEnrichmentProcess implements IEnrichmentProcess {
    public readonly id = 'rep-rate-enrichment';
    public readonly processType = 'enrichment' as const;

    process(output: IOutputStatement): IOutputStatement {
        if (output.outputType !== 'segment' || !output.isLeaf) return output;

        const elapsedMs = output.getMetric(MetricType.Elapsed)?.value as number ?? 0;
        if (elapsedMs <= 0) return output;

        const repFrags = output.getDisplayMetrics({ types: [MetricType.Rep] });
        let reps = 0;
        for (const frag of repFrags) {
            if (typeof frag.value === 'number') reps += frag.value;
        }
        if (reps <= 0) return output;

        const elapsedMin = elapsedMs / 1000 / 60;
        const repsPerMin = reps / elapsedMin;

        output.metrics.push({
            type: MetricType.Metric,
            image: `Rep Rate: ${repsPerMin.toFixed(1)} reps/min`,
            value: parseFloat(repsPerMin.toFixed(1)),
            unit: 'reps/min',
            origin: 'analyzed',
            timestamp: new Date()
        });

        return output;
    }

    finalize(): [] {
        return [];
    }
}
