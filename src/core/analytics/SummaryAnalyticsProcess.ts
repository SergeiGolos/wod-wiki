import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { FragmentType } from '../models/CodeFragment';
import { TimeSpan } from '../../runtime/models/TimeSpan';

/**
 * SummaryAnalyticsProcess - Calculates overall workout totals and metrics by effort.
 *
 * This process does not modify output statements during processing.
 * It accumulates data and generates summary statements during finalization.
 */
export class SummaryAnalyticsProcess implements IAnalyticsProcess {
    public readonly id = 'summary-analytics';

    private totals = {
        reps: 0,
        distance: 0,
        weight: 0,
        elapsed: 0
    };

    private effortTotals = new Map<string, { reps: number; distance: number; weight: number }>();

    /**
     * Accumulate metrics from segment outputs.
     */
    process(output: IOutputStatement): IOutputStatement {
        // Only process leaf segments to avoid double-counting
        if (output.outputType !== 'segment' || !output.isLeaf) {
            return output;
        }

        const elapsed = output.getFragment(FragmentType.Elapsed)?.value as number ?? 0;
        this.totals.elapsed += elapsed;

        // Get reps count for this segment
        const repFrags = output.getDisplayFragments({ types: [FragmentType.Rep] });
        let segmentReps = 0;
        for (const frag of repFrags) {
            if (typeof frag.value === 'number') {
                segmentReps += frag.value;
            }
        }
        this.totals.reps += segmentReps;

        // Get distance for this segment
        const distanceFrags = output.getDisplayFragments({ types: [FragmentType.Distance] });
        let segmentDistance = 0;
        for (const frag of distanceFrags) {
            const amount = (frag.value as any)?.amount;
            if (typeof amount === 'number') {
                segmentDistance += amount;
            }
        }
        this.totals.distance += segmentDistance;

        // Get weight for this segment (total volume = reps * weight)
        const resistanceFrags = output.getDisplayFragments({ types: [FragmentType.Resistance] });
        let segmentWeight = 0;
        for (const frag of resistanceFrags) {
            const amount = (frag.value as any)?.amount;
            if (typeof amount === 'number') {
                // If reps are present, multiply by reps for total volume.
                // If no reps are present, we count the weight once (e.g., for distance-based movements or single lifts).
                segmentWeight += (segmentReps > 0 ? segmentReps * amount : amount);
            }
        }
        this.totals.weight += segmentWeight;

        // Track by effort if present
        const effortFrag = output.getFragment(FragmentType.Effort);
        if (effortFrag && typeof effortFrag.value === 'string') {
            const effort = effortFrag.value;
            if (!this.effortTotals.has(effort)) {
                this.effortTotals.set(effort, { reps: 0, distance: 0, weight: 0 });
            }
            const current = this.effortTotals.get(effort)!;
            current.reps += segmentReps;
            current.distance += segmentDistance;
            current.weight += segmentWeight;
        }

        return output;
    }

    /**
     * Generate final summary statements.
     */
    finalize(): IOutputStatement[] {
        const now = new Date();
        const results: IOutputStatement[] = [];

        // 1. Overall Totals
        if (this.totals.reps > 0) {
            results.push(this.createSummaryStatement('Total Reps', this.totals.reps, 'total_reps', now));
        }
        if (this.totals.distance > 0) {
            results.push(this.createSummaryStatement('Total Distance', this.totals.distance, 'total_distance', now));
        }
        if (this.totals.weight > 0) {
            results.push(this.createSummaryStatement('Total Weight', this.totals.weight, 'total_weight', now));
        }

        // 2. Totals by Effort
        for (const [effort, data] of this.effortTotals.entries()) {
            results.push(this.createEffortSummaryStatement(effort, data, now));
        }

        // 3. Metrics per Second
        const seconds = this.totals.elapsed / 1000;
        if (seconds > 0) {
            if (this.totals.reps > 0) {
                results.push(this.createSummaryStatement('Reps per Second', this.totals.reps / seconds, 'reps_per_second', now));
            }
            if (this.totals.distance > 0) {
                results.push(this.createSummaryStatement('Distance per Second', this.totals.distance / seconds, 'distance_per_second', now));
            }
            if (this.totals.weight > 0) {
                results.push(this.createSummaryStatement('Weight per Second', this.totals.weight / seconds, 'weight_per_second', now));
            }
        }

        return results;
    }

    private createSummaryStatement(label: string, value: number, type: string, timestamp: Date): IOutputStatement {
        const displayValue = Number.isInteger(value) ? value.toString() : value.toFixed(2);
        return new OutputStatement({
            outputType: 'analytics',
            timeSpan: new TimeSpan(timestamp.getTime(), timestamp.getTime()),
            sourceBlockKey: 'summary-analytics',
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

    private createEffortSummaryStatement(effort: string, data: { reps: number; distance: number; weight: number }, timestamp: Date): IOutputStatement {
        const fragments = [
            {
                fragmentType: FragmentType.Effort,
                type: 'effort',
                image: effort,
                value: effort,
                origin: 'runtime',
                timestamp: timestamp
            }
        ];

        if (data.reps > 0) {
            fragments.push({
                fragmentType: FragmentType.Metric,
                type: 'effort_reps',
                image: `Total Reps (${effort}): ${data.reps}`,
                value: data.reps,
                origin: 'runtime',
                timestamp: timestamp
            });
        }

        if (data.distance > 0) {
            fragments.push({
                fragmentType: FragmentType.Metric,
                type: 'effort_distance',
                image: `Total Distance (${effort}): ${data.distance.toFixed(2)}`,
                value: data.distance,
                origin: 'runtime',
                timestamp: timestamp
            });
        }

        if (data.weight > 0) {
            fragments.push({
                fragmentType: FragmentType.Metric,
                type: 'effort_weight',
                image: `Total Weight (${effort}): ${data.weight.toFixed(2)}`,
                value: data.weight,
                origin: 'runtime',
                timestamp: timestamp
            });
        }

        return new OutputStatement({
            outputType: 'analytics',
            timeSpan: new TimeSpan(timestamp.getTime(), timestamp.getTime()),
            sourceBlockKey: 'summary-analytics',
            stackLevel: 0,
            fragments
        });
    }
}
