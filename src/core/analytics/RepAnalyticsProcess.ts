import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { FragmentType } from '../models/CodeFragment';
import { TimeSpan } from '../../runtime/models/TimeSpan';

/**
 * RepAnalyticsProcess - Tracks total repetitions, reps by effort, and reps per second.
 */
export class RepAnalyticsProcess implements IAnalyticsProcess {
    public readonly id = 'rep-analytics';
    private totalReps = 0;
    private totalElapsed = 0;
    private repsByEffort = new Map<string, number>();

    process(output: IOutputStatement): IOutputStatement {
        if (output.outputType !== 'segment' || !output.isLeaf) return output;

        const elapsed = output.getFragment(FragmentType.Elapsed)?.value as number ?? 0;
        this.totalElapsed += elapsed;

        const reps = output.getDisplayFragments({ types: [FragmentType.Rep] });
        let segmentReps = 0;
        for (const frag of reps) {
            if (typeof frag.value === 'number') {
                segmentReps += frag.value;
            }
        }

        if (segmentReps > 0) {
            this.totalReps += segmentReps;

            const effort = output.getFragment(FragmentType.Effort)?.value as string;
            if (effort) {
                this.repsByEffort.set(effort, (this.repsByEffort.get(effort) ?? 0) + segmentReps);
            }
        }

        return output;
    }

    finalize(): IOutputStatement[] {
        const now = new Date();
        const results: IOutputStatement[] = [];

        if (this.totalReps === 0) return [];

        // 1. Total Reps
        results.push(this.createOutput('Total Reps', this.totalReps, 'total_reps', now));

        // 2. Reps by Effort
        for (const [effort, count] of this.repsByEffort.entries()) {
            results.push(this.createEffortOutput(effort, count, now));
        }

        // 3. Reps per Second
        const seconds = this.totalElapsed / 1000;
        if (seconds > 0) {
            results.push(this.createOutput('Reps per Second', this.totalReps / seconds, 'reps_per_second', now));
        }

        return results;
    }

    private createOutput(label: string, value: number, type: string, timestamp: Date): IOutputStatement {
        const displayValue = Number.isInteger(value) ? value.toString() : value.toFixed(2);
        return new OutputStatement({
            outputType: 'analytics',
            timeSpan: new TimeSpan(timestamp.getTime(), timestamp.getTime()),
            sourceBlockKey: 'rep-analytics',
            stackLevel: 0,
            fragments: [
                {
                    fragmentType: FragmentType.Metric,
                    type: type,
                    image: `${label}: ${displayValue}`,
                    value: value,
                    origin: 'runtime',
                    timestamp: timestamp
                },
                {
                    fragmentType: FragmentType.Label,
                    type: 'summary',
                    image: `${label}: ${displayValue}`,
                    value: `${label}: ${displayValue}`,
                    origin: 'runtime',
                    timestamp: timestamp
                }
            ]
        });
    }

    private createEffortOutput(effort: string, count: number, timestamp: Date): IOutputStatement {
        return new OutputStatement({
            outputType: 'analytics',
            timeSpan: new TimeSpan(timestamp.getTime(), timestamp.getTime()),
            sourceBlockKey: 'rep-analytics',
            stackLevel: 0,
            fragments: [
                {
                    fragmentType: FragmentType.Effort,
                    type: 'effort',
                    image: effort,
                    value: effort,
                    origin: 'runtime',
                    timestamp: timestamp
                },
                {
                    fragmentType: FragmentType.Metric,
                    type: 'effort_reps',
                    image: `Total Reps (${effort}): ${count}`,
                    value: count,
                    origin: 'runtime',
                    timestamp: timestamp
                }
            ]
        });
    }
}
