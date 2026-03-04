import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { MetricType, IMetric } from '../models/Metric';
import { TimeSpan } from '../../runtime/models/TimeSpan';

/**
 * RunningSumProcess - Tracks a numeric metric across all segments and adds
 * a 'total' metrics to each segment.
 */
export class RunningSumProcess implements IAnalyticsProcess {
    public readonly id = 'running-sum';
    private total = 0;
    private metricType: string;
    private filterType: MetricType;

    constructor(metricType: string = 'repetitions', filterType: MetricType = MetricType.Rep) {
        this.metricType = metricType;
        this.filterType = filterType;
    }

    process(output: IOutputStatement): IOutputStatement {
        // Only process segments that have the metric we are tracking
        if (output.outputType === 'segment') {
            const metrics = output.getDisplayMetrics({ types: [this.filterType] });
            for (const frag of metrics) {
                if (typeof frag.value === 'number') {
                    this.total += frag.value;
                }
            }

            // Add a "running total" metrics to this output
            output.metrics.push({
                metricType: MetricType.Metric,
                type: `total_${this.metricType}`,
                image: `Total ${this.metricType}: ${this.total}`,
                value: this.total,
                origin: 'runtime',
                timestamp: new Date()
            });
        }
        return output;
    }

    finalize(): IOutputStatement[] {
        // Return a final summary milestone
        const now = new Date();
        const output = new OutputStatement({
            outputType: 'analytics',
            timeSpan: new TimeSpan(now.getTime(), now.getTime()),
            sourceBlockKey: 'analytics-engine',
            stackLevel: 0,
            metrics: [
                {
                    metricType: MetricType.Metric,
                    type: `final_total_${this.metricType}`,
                    image: `Final Total ${this.metricType}: ${this.total}`,
                    value: this.total,
                    origin: 'runtime',
                    timestamp: now
                },
                {
                    metricType: MetricType.Label,
                    type: 'summary',
                    image: `Workout Summary: ${this.total} ${this.metricType} completed.`,
                    value: `Workout Summary: ${this.total} ${this.metricType} completed.`,
                    origin: 'runtime',
                    timestamp: now
                }
            ]
        });

        return [output];
    }
}
