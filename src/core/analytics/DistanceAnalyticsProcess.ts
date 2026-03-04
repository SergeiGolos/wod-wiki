import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';
import { TimeSpan } from '../../runtime/models/TimeSpan';

/**
 * DistanceAnalyticsProcess - Tracks total distance, distance by effort, and distance per second.
 */
export class DistanceAnalyticsProcess implements IAnalyticsProcess {
    public readonly id = 'distance-analytics';
    private totalDistance = 0;
    private totalElapsed = 0;
    private distanceByEffort = new Map<string, number>();

    process(output: IOutputStatement): IOutputStatement {
        if (output.outputType !== 'segment' || !output.isLeaf) return output;

        const elapsed = output.getMetric(MetricType.Elapsed)?.value as number ?? 0;
        this.totalElapsed += elapsed;

        const distanceFrags = output.getDisplayMetrics({ types: [MetricType.Distance] });
        let segmentDistance = 0;
        for (const frag of distanceFrags) {
            const amount = (frag.value as any)?.amount;
            if (typeof amount === 'number') {
                segmentDistance += amount;
            }
        }

        if (segmentDistance > 0) {
            this.totalDistance += segmentDistance;

            const effort = output.getMetric(MetricType.Effort)?.value as string;
            if (effort) {
                this.distanceByEffort.set(effort, (this.distanceByEffort.get(effort) ?? 0) + segmentDistance);
            }
        }

        return output;
    }

    finalize(): IOutputStatement[] {
        const now = new Date();
        const results: IOutputStatement[] = [];

        if (this.totalDistance === 0) return [];

        // 1. Total Distance
        results.push(this.createOutput('Total Distance', this.totalDistance, 'total_distance', now));

        // 2. Distance by Effort
        for (const [effort, dist] of this.distanceByEffort.entries()) {
            results.push(this.createEffortOutput(effort, dist, now));
        }

        // 3. Distance per Second
        const seconds = this.totalElapsed / 1000;
        if (seconds > 0) {
            results.push(this.createOutput('Distance per Second', this.totalDistance / seconds, 'distance_per_second', now));
        }

        return results;
    }

    private createOutput(label: string, value: number, type: string, timestamp: Date): IOutputStatement {
        const displayValue = Number.isInteger(value) ? value.toString() : value.toFixed(2);
        return new OutputStatement({
            outputType: 'analytics',
            timeSpan: new TimeSpan(timestamp.getTime(), timestamp.getTime()),
            sourceBlockKey: 'distance-analytics',
            stackLevel: 0,
            metrics: [
                {
                    metricType: MetricType.Metric,
                    type: type,
                    image: `${label}: ${displayValue}`,
                    value: value,
                    origin: 'runtime',
                    timestamp: timestamp
                },
                {
                    metricType: MetricType.Label,
                    type: 'summary',
                    image: `${label}: ${displayValue}`,
                    value: `${label}: ${displayValue}`,
                    origin: 'runtime',
                    timestamp: timestamp
                }
            ]
        });
    }

    private createEffortOutput(effort: string, dist: number, timestamp: Date): IOutputStatement {
        return new OutputStatement({
            outputType: 'analytics',
            timeSpan: new TimeSpan(timestamp.getTime(), timestamp.getTime()),
            sourceBlockKey: 'distance-analytics',
            stackLevel: 0,
            metrics: [
                {
                    metricType: MetricType.Effort,
                    type: 'effort',
                    image: effort,
                    value: effort,
                    origin: 'runtime',
                    timestamp: timestamp
                },
                {
                    metricType: MetricType.Metric,
                    type: 'effort_distance',
                    image: `Total Distance (${effort}): ${dist.toFixed(2)}`,
                    value: dist,
                    origin: 'runtime',
                    timestamp: timestamp
                }
            ]
        });
    }
}
