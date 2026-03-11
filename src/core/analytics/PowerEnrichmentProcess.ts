import { IEnrichmentProcess } from '../contracts/IEnrichmentProcess';
import { IOutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';

/**
 * PowerEnrichmentProcess - Derives strength power (volume load / time) from a
 * single segment's reps, resistance, and elapsed-time metrics.
 *
 * Volume load = reps × weight (kg). Power proxy = volume load ÷ elapsed seconds.
 *
 * Adds one analyzed metric to each qualifying segment:
 *  - Power (kg/s): (reps × weight) ÷ elapsed seconds
 *
 * No cross-segment state is carried; every computation is local to the segment.
 */
export class PowerEnrichmentProcess implements IEnrichmentProcess {
    public readonly id = 'power-enrichment';
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

        const resistanceFrags = output.getDisplayMetrics({ types: [MetricType.Resistance] });
        let weightKg = 0;
        let units = 'kg';
        for (const frag of resistanceFrags) {
            const val = frag.value as any;
            if (typeof val?.amount === 'number') {
                weightKg += val.amount;
                if (val.units) units = val.units;
            }
        }

        if (reps <= 0 || weightKg <= 0) return output;

        const volumeLoad = reps * weightKg;
        const elapsedSec = elapsedMs / 1000;
        const power = volumeLoad / elapsedSec;

        output.metrics.push({
            type: MetricType.Metric,
            image: `Power: ${power.toFixed(1)} ${units}/s`,
            value: parseFloat(power.toFixed(1)),
            unit: `${units}/s`,
            origin: 'analyzed',
            timestamp: new Date()
        });

        return output;
    }

    finalize(): [] {
        return [];
    }
}
