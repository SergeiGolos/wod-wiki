import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';
import { TimeSpan } from '../../runtime/models/TimeSpan';

/**
 * WeightAnalyticsProcess - Tracks total weight volume (reps * weight), 
 * weight by effort, and weight volume per second.
 */
export class WeightAnalyticsProcess implements IAnalyticsProcess {
    public readonly id = 'weight-analytics';
    private totalWeight = 0;
    private totalElapsed = 0;
    private weightByEffort = new Map<string, number>();

    process(output: IOutputStatement): IOutputStatement {
        if (output.outputType !== 'segment' || !output.isLeaf) return output;

        const elapsed = output.getMetric(MetricType.Elapsed)?.value as number ?? 0;
        this.totalElapsed += elapsed;

        // Get reps count for this segment
        const repFrags = output.getDisplayMetrics({ types: [MetricType.Rep] });
        let segmentReps = 0;
        for (const frag of repFrags) {
            if (typeof frag.value === 'number') {
                segmentReps += frag.value;
            }
        }

        // Get weight for this segment (total volume = reps * weight)
        const resistanceFrags = output.getDisplayMetrics({ types: [MetricType.Resistance] });
        let segmentWeight = 0;
        for (const frag of resistanceFrags) {
            const amount = (frag.value as any)?.amount;
            if (typeof amount === 'number') {
                // Volume = reps * weight. If no reps, count weight once.
                segmentWeight += (segmentReps > 0 ? segmentReps * amount : amount);
            }
        }

        if (segmentWeight > 0) {
            this.totalWeight += segmentWeight;

            const effort = output.getMetric(MetricType.Effort)?.value as string;
            if (effort) {
                this.weightByEffort.set(effort, (this.weightByEffort.get(effort) ?? 0) + segmentWeight);
            }
        }

        return output;
    }

    finalize(): IOutputStatement[] {
        const now = new Date();
        const results: IOutputStatement[] = [];

        if (this.totalWeight === 0) return [];

        // 1. Total Weight
        results.push(this.createOutput('Total Weight', this.totalWeight, 'total_weight', now));

        // 2. Weight by Effort
        for (const [effort, weight] of this.weightByEffort.entries()) {
            results.push(this.createEffortOutput(effort, weight, now));
        }

        // 3. Weight per Second
        const seconds = this.totalElapsed / 1000;
        if (seconds > 0) {
            results.push(this.createOutput('Weight per Second', this.totalWeight / seconds, 'weight_per_second', now));
        }

        return results;
    }

    private createOutput(label: string, value: number, type: string, timestamp: Date): IOutputStatement {
        const displayValue = Number.isInteger(value) ? value.toString() : value.toFixed(2);
        return new OutputStatement({
            outputType: 'analytics',
            timeSpan: new TimeSpan(timestamp.getTime(), timestamp.getTime()),
            sourceBlockKey: 'weight-analytics',
            stackLevel: 0,
            metrics: [
                {
                    type: MetricType.Metric,
                    image: `${label}: ${displayValue}`,
                    value: value,
                    origin: 'runtime',
                    timestamp: timestamp
                },
                {
                    type: MetricType.Label,
                    image: `${label}: ${displayValue}`,
                    value: `${label}: ${displayValue}`,
                    origin: 'runtime',
                    timestamp: timestamp
                }
            ]
        });
    }

    private createEffortOutput(effort: string, weight: number, timestamp: Date): IOutputStatement {
        return new OutputStatement({
            outputType: 'analytics',
            timeSpan: new TimeSpan(timestamp.getTime(), timestamp.getTime()),
            sourceBlockKey: 'weight-analytics',
            stackLevel: 0,
            metrics: [
                {
                    type: MetricType.Effort,
                    image: effort,
                    value: effort,
                    origin: 'runtime',
                    timestamp: timestamp
                },
                {
                    type: MetricType.Metric,
                    image: `Total Weight (${effort}): ${weight.toFixed(2)}`,
                    value: weight,
                    origin: 'runtime',
                    timestamp: timestamp
                }
            ]
        });
    }
}
