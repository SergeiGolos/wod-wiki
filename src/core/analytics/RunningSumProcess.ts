import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { FragmentType, ICodeFragment } from '../models/CodeFragment';
import { TimeSpan } from '../../runtime/models/TimeSpan';

/**
 * RunningSumProcess - Tracks a numeric metric across all segments and adds
 * a 'total' fragment to each segment.
 */
export class RunningSumProcess implements IAnalyticsProcess {
    public readonly id = 'running-sum';
    private total = 0;
    private metricType: string;
    private fragmentType: FragmentType;

    constructor(metricType: string = 'repetitions', fragmentType: FragmentType = FragmentType.Rep) {
        this.metricType = metricType;
        this.fragmentType = fragmentType;
    }

    process(output: IOutputStatement): IOutputStatement {
        // Only process segments that have the metric we are tracking
        if (output.outputType === 'segment') {
            const fragments = output.getDisplayFragments({ types: [this.fragmentType] });
            for (const frag of fragments) {
                if (typeof frag.value === 'number') {
                    this.total += frag.value;
                }
            }

            // Add a "running total" fragment to this output
            output.fragments.push({
                fragmentType: FragmentType.Metric,
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
            fragments: [
                {
                    fragmentType: FragmentType.Metric,
                    type: `final_total_${this.metricType}`,
                    image: `Final Total ${this.metricType}: ${this.total}`,
                    value: this.total,
                    origin: 'runtime',
                    timestamp: now
                },
                {
                    fragmentType: FragmentType.Label,
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
