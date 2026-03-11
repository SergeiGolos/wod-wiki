import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';
import { TimeSpan } from '../../runtime/models/TimeSpan';

/**
 * MetMinuteProcess - MET-Minute Accumulator
 * Calculates Metabolic Equivalent of Task (MET) minutes tracked inline per segment.
 */
export class MetMinuteProcess implements IAnalyticsProcess {
    public readonly id = 'met-minute-analytics';
    private accumulatedMetMinutes = 0;

    // A rough lookup table (MET values)
    private readonly metLookup: Record<string, number> = {
        'run': 9.8,
        'jog': 7.0,
        'walk': 3.5,
        'row': 8.5,
        'cycle': 8.0,
        'burpee': 10.0,
        'squat': 6.0,
        'lift': 6.0,
        'rest': 1.0,
    };

    process(output: IOutputStatement): IOutputStatement {
        if (output.outputType !== 'segment') return output;

        const durationFrag = output.getMetric(MetricType.Duration);
        const elapsedFrag = output.getMetric(MetricType.Elapsed);
        
        // Prefer elapsed time, fallback to planned duration if elapsed is 0 (e.g. static plan analysis)
        let timeMs = elapsedFrag?.value as number ?? 0;
        if (timeMs === 0 && durationFrag?.value) {
            timeMs = durationFrag.value as number;
        }

        if (timeMs > 0) {
            const minutes = timeMs / 1000 / 60;
            
            // Try to find the action name to look up METs
            const actionFrag = output.getMetric(MetricType.Action);
            const actionName = typeof actionFrag?.value === 'string' ? actionFrag.value.toLowerCase() : null;
            
            // Default to 6.0 METs (vigorous) if unknown action
            const mets = actionName && this.metLookup[actionName] ? this.metLookup[actionName] : 6.0;
            
            const metMins = mets * minutes;
            this.accumulatedMetMinutes += metMins;
            // Accumulate only — the session total is emitted in finalize(), not stamped on each segment.
        }

        return output;
    }

    finalize(): IOutputStatement[] {
        if (this.accumulatedMetMinutes <= 0) return [];

        const now = new Date();
        return [
            new OutputStatement({
                outputType: 'analytics',
                timeSpan: new TimeSpan(now.getTime(), now.getTime()),
                sourceBlockKey: 'met-minute-analytics',
                stackLevel: 0,
                metrics: [
                    {
                        type: MetricType.Work,
                        image: `Total Energy: ${Math.round(this.accumulatedMetMinutes)} MET-minutes`,
                        value: Math.round(this.accumulatedMetMinutes),
                        origin: 'analyzed',
                        timestamp: now
                    },
                    {
                        type: MetricType.Label,
                        image: `Total Energy: ${Math.round(this.accumulatedMetMinutes)} MET-minutes`,
                        value: `Total Energy: ${Math.round(this.accumulatedMetMinutes)} MET-minutes`,
                        origin: 'analyzed',
                        timestamp: now
                    }
                ]
            })
        ];
    }
}
