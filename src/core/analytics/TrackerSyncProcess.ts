import { IAnalyticsProcess } from '../contracts/IAnalyticsEngine';
import { IOutputStatement } from '../models/OutputStatement';
import { MetricType } from '../models/Metric';
import { RuntimeStackTracker } from '../../runtime/contracts/IRuntimeOptions';

/**
 * TrackerSyncProcess - Bridges the Analytics Engine back to the Workout Tracker.
 * 
 * It scans enriched output statements for analyzed metrics (like running sums)
 * and records them in the tracker under a special 'session-totals' block ID.
 * This allows the UI to show complex aggregated analytics in real-time.
 */
export class TrackerSyncProcess implements IAnalyticsProcess {
    public readonly id = 'tracker-sync';

    constructor(private readonly tracker?: RuntimeStackTracker) {}

    process(output: IOutputStatement): IOutputStatement {
        if (!this.tracker || !this.tracker.recordMetric) return output;

        // Look for metrics that were added by other analytics processes
        // or that look like aggregate values.
        for (const metric of output.metrics) {
            const isNumeric = typeof metric.value === 'number';
            const isAnalyticType = [
                MetricType.Volume, 
                MetricType.Intensity, 
                MetricType.Load, 
                MetricType.Work,
                MetricType.Metric
            ].includes(metric.type);

            if (isAnalyticType && isNumeric) {
                const image = metric.image?.toLowerCase() || '';
                
                // If the metric suggests it's a total or running sum,
                // sync it to the tracker's global totals block.
                if (image.includes('total') || image.includes('running') || metric.origin === 'analyzed' || metric.type !== MetricType.Metric) {
                    // Extract a clean key (e.g. "Total repetitions: 50" -> "repetitions")
                    const key = this.deriveKey(image, metric.origin, metric.type);
                    if (key) {
                        this.tracker.recordMetric('session-totals', key, metric.value, metric.unit);
                    }
                }
            }
        }

        return output;
    }

    finalize(): IOutputStatement[] {
        return [];
    }

    private deriveKey(image: string, origin: string, type: MetricType): string | null {
        if (type === MetricType.Volume) return 'Volume';
        if (type === MetricType.Intensity) return 'Intensity';
        if (type === MetricType.Load) return 'Load';
        if (type === MetricType.Work) return 'Work';

        if (image.includes('repetitions')) return 'Reps';
        if (image.includes('distance')) return 'Distance';
        if (image.includes('volume')) return 'Volume';
        if (image.includes('intensity')) return 'Intensity';
        if (image.includes('load')) return 'Load';
        if (image.includes('minute')) return 'Met-Min';
        
        // If it's analyzed but doesn't match known strings, 
        // try to strip "Total" or "Running" from the label
        if (origin === 'analyzed') {
            return image
                .replace(/total/gi, '')
                .replace(/running/gi, '')
                .replace(/[:\d.]/g, '')
                .trim() || 'Aggregated';
        }

        return null;
    }
}
