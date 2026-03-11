import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';
import { TimeSpan } from '../../runtime/models/TimeSpan';

/**
 * VolumeLoadProcess - Real-Time Volume Load Aggregator (Resistance Training)
 * Calculates the volume (Reps * Weight) for each segment and maintains a running tally,
 * injecting the running total inline into each segment statement.
 */
export class VolumeLoadProcess implements IAnalyticsProcess {
    public readonly id = 'volume-load-analytics';
    private runningVolume = 0;

    process(output: IOutputStatement): IOutputStatement {
        if (output.outputType !== 'segment' || !output.isLeaf) return output;

        // Get reps
        const repFrags = output.getDisplayMetrics({ types: [MetricType.Rep] });
        let segmentReps = 0;
        for (const frag of repFrags) {
            if (typeof frag.value === 'number') {
                segmentReps += frag.value;
            }
        }

        // Get weight
        const resistanceFrags = output.getDisplayMetrics({ types: [MetricType.Resistance] });
        let segmentWeight = 0;
        let units = 'kg'; // default
        for (const frag of resistanceFrags) {
            const val = frag.value as any;
            if (typeof val?.amount === 'number') {
                segmentWeight += val.amount;
                if (val.units) units = val.units;
            }
        }

        // Volume = reps * weight (if no weight but reps exist, maybe just count reps, but here volume implies weight)
        if (segmentReps > 0 && segmentWeight > 0) {
            const segmentVolume = segmentReps * segmentWeight;
            this.runningVolume += segmentVolume;

            // Inject running total into the segment's metrics
            output.metrics.push({
                type: MetricType.Metric,
                image: `Running Volume: ${this.runningVolume}${units}`,
                value: this.runningVolume,
                origin: 'analyzed',
                timestamp: new Date()
            });
        }

        return output;
    }

    finalize(): IOutputStatement[] {
        if (this.runningVolume === 0) return [];

        const now = new Date();
        return [
            new OutputStatement({
                outputType: 'analytics',
                timeSpan: new TimeSpan(now.getTime(), now.getTime()),
                sourceBlockKey: 'volume-load-analytics',
                stackLevel: 0,
                metrics: [
                    {
                        type: MetricType.Label,
                        image: `Total Volume Load: ${this.runningVolume}`,
                        value: `Total Volume Load: ${this.runningVolume}`,
                        origin: 'analyzed',
                        timestamp: now
                    }
                ]
            })
        ];
    }
}
