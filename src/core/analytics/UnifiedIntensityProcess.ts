import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement, OutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';
import { TimeSpan } from '../../runtime/models/TimeSpan';

/**
 * UnifiedIntensityProcess - Unified Training Intensity Score (TIS)
 * Calculates a single composite score for the workout based on MET, RPE, Duration, and Discipline.
 * TIS = (MET_Score * 0.3) + (RPE_Score * 0.35) + (Duration_Score * 0.20) + (Discipline_Factor * 0.15)
 */
export class UnifiedIntensityProcess implements IAnalyticsProcess {
    public readonly id = 'unified-intensity-analytics';
    
    private totalElapsedMs = 0;
    private maxRpe = 0;
    
    // Constants for the TIS formula
    private readonly metScore = 7.5; // Default MET score
    private readonly disciplineFactor = 1.0; // Default modifier for modality

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
                if (effortFrag.value > this.maxRpe) {
                    this.maxRpe = effortFrag.value;
                }
            }
        }
        return output;
    }

    finalize(): IOutputStatement[] {
        if (this.totalElapsedMs === 0) return [];

        const sRPE = this.maxRpe > 0 ? this.maxRpe : 5; // Default to moderate
        const durationMinutes = this.totalElapsedMs / 1000 / 60;
        
        // Normalize components to a 0-100 scale for intuitive TIS
        // MET: assuming up to 20 METs is ~100
        const normMet = Math.min((this.metScore / 20) * 100, 100);
        // RPE: 10 is 100
        const normRpe = (sRPE / 10) * 100;
        // Duration: assuming 90 mins maxes out duration score
        const normDuration = Math.min((durationMinutes / 90) * 100, 100);
        // Discipline: 1.0 is 100
        const normDiscipline = this.disciplineFactor * 100;

        const tisScore = Math.round(
            (normMet * 0.30) +
            (normRpe * 0.35) +
            (normDuration * 0.20) +
            (normDiscipline * 0.15)
        );

        let intensityLabel = 'Moderate';
        if (tisScore > 80) intensityLabel = 'Extreme';
        else if (tisScore > 60) intensityLabel = 'Vigorous';
        else if (tisScore < 30) intensityLabel = 'Light';

        const now = new Date();
        return [
            new OutputStatement({
                outputType: 'analytics',
                timeSpan: new TimeSpan(now.getTime(), now.getTime()),
                sourceBlockKey: 'tis-analytics',
                stackLevel: 0,
                metrics: [
                    {
                        type: MetricType.Intensity,
                        image: `TIS: ${tisScore} - ${intensityLabel}`,
                        value: tisScore,
                        origin: 'analyzed',
                        timestamp: now
                    },
                    {
                        type: MetricType.Label,
                        image: `TIS: ${tisScore} - ${intensityLabel}`,
                        value: `TIS: ${tisScore} - ${intensityLabel}`,
                        origin: 'analyzed',
                        timestamp: now
                    }
                ]
            })
        ];
    }
}
