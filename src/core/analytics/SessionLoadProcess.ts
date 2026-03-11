import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';
import { TimeSpan } from '../../runtime/models/TimeSpan';

/**
 * SessionLoadProcess - Session RPE & Load Quantifier
 * Calculates total session load based on the Foster et al. methodology:
 * SessionLoad(AU) = sRPE * Duration(minutes)
 */
export class SessionLoadProcess implements IAnalyticsProcess {
    public readonly id = 'session-load-analytics';
    private totalElapsedMs = 0;
    private maxRpe = 0;

    // A simple mapping from our Effort labels to standard RPE (0-10)
    private readonly effortToRpe: Record<string, number> = {
        'easy': 3,
        'moderate': 5,
        'hard': 7,
        'all-out': 10,
        'max': 10
    };

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
                // If effort is already a number, treat it as RPE directly
                if (effortFrag.value > this.maxRpe) {
                    this.maxRpe = effortFrag.value;
                }
            }
        }
        return output;
    }

    finalize(): IOutputStatement[] {
        if (this.totalElapsedMs === 0) return [];

        // If no explicit RPE was found, default to a moderate 5 so we still get a score
        const sRPE = this.maxRpe > 0 ? this.maxRpe : 5;
        const durationMinutes = this.totalElapsedMs / 1000 / 60;
        const sessionLoadAu = Math.round(sRPE * durationMinutes);

        const now = new Date();
        return [
            new OutputStatement({
                outputType: 'analytics',
                timeSpan: new TimeSpan(now.getTime(), now.getTime()),
                sourceBlockKey: 'session-load-analytics',
                stackLevel: 0,
                metrics: [
                    {
                        type: MetricType.Label,
                        image: `Training Load: ${sessionLoadAu} AU`,
                        value: `Training Load: ${sessionLoadAu} AU`,
                        origin: 'analyzed',
                        timestamp: now
                    },
                    {
                        type: MetricType.Metric,
                        image: `sRPE: ${sRPE}/10`,
                        value: sRPE,
                        origin: 'analyzed',
                        timestamp: now
                    }
                ]
            })
        ];
    }
}
