import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';
import { TimeSpan } from '../../runtime/models/TimeSpan';

/**
 * ACWRProcess - Acute:Chronic Workload Ratio (ACWR) Monitor
 * Compares acute load (last 7 days + current session) against chronic load (rolling 28 days).
 * Outputs a warning if the ratio enters the "danger zone" (> 1.5).
 */
export class ACWRProcess implements IAnalyticsProcess {
    public readonly id = 'acwr-analytics';
    
    private totalElapsedMs = 0;
    private maxRpe = 0;
    
    private readonly effortToRpe: Record<string, number> = {
        'easy': 3,
        'moderate': 5,
        'hard': 7,
        'all-out': 10,
        'max': 10
    };

    /**
     * @param historicalAcuteLoad Load from the past 7 days excluding today (AU)
     * @param historicalChronicLoad Average weekly load from the past 28 days (AU)
     */
    constructor(
        private historicalAcuteLoad: number = 1200, // Default mock values
        private historicalChronicLoad: number = 1000
    ) {}

    process(output: IOutputStatement): IOutputStatement {
        if (output.outputType === 'segment') {
            const elapsed = output.getMetric(MetricType.Elapsed)?.value as number ?? 0;
            this.totalElapsedMs += elapsed;

            const effortFrag = output.getMetric(MetricType.Effort);
            const effortVal = typeof effortFrag?.value === 'string' ? effortFrag.value.toLowerCase() : null;
            
            if (effortVal && this.effortToRpe[effortVal]) {
                const rpe = this.effortToRpe[effortVal];
                if (rpe > this.maxRpe) {
                    this.maxRpe = rpe;
                }
            } else if (typeof effortFrag?.value === 'number') {
                if (effortFrag.value > this.maxRpe) {
                    this.maxRpe = effortFrag.value;
                }
            }
        }
        return output;
    }

    finalize(): IOutputStatement[] {
        if (this.totalElapsedMs === 0) return [];

        const sRPE = this.maxRpe > 0 ? this.maxRpe : 5;
        const durationMinutes = this.totalElapsedMs / 1000 / 60;
        const currentSessionLoad = Math.round(sRPE * durationMinutes);

        const newAcuteLoad = this.historicalAcuteLoad + currentSessionLoad;
        const acwr = this.historicalChronicLoad > 0 ? newAcuteLoad / this.historicalChronicLoad : 0;

        const now = new Date();
        const results: IOutputStatement[] = [];

        results.push(new OutputStatement({
            outputType: 'analytics',
            timeSpan: new TimeSpan(now.getTime(), now.getTime()),
            sourceBlockKey: 'acwr-analytics',
            stackLevel: 0,
            metrics: [
                {
                    type: MetricType.Metric,
                    image: `ACWR: ${acwr.toFixed(2)}`,
                    value: parseFloat(acwr.toFixed(2)),
                    origin: 'analyzed',
                    timestamp: now
                }
            ]
        }));

        // Exceeding 1.5 is generally considered a "danger zone" for injury risk
        if (acwr > 1.5) {
            results.push(new OutputStatement({
                outputType: 'analytics',
                timeSpan: new TimeSpan(now.getTime(), now.getTime()),
                sourceBlockKey: 'acwr-analytics',
                stackLevel: 0,
                metrics: [
                    {
                        type: MetricType.Label,
                        image: `⚠️ High Injury Risk: ACWR is ${acwr.toFixed(2)} (> 1.5)`,
                        value: `⚠️ High Injury Risk: ACWR is ${acwr.toFixed(2)} (> 1.5)`,
                        origin: 'analyzed',
                        timestamp: now
                    }
                ]
            }));
        }

        return results;
    }
}
