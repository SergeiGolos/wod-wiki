import { IProjectionEngine } from '../IProjectionEngine';
import { RuntimeMetric } from '../../runtime/RuntimeMetric';
import { Exercise } from '../../exercise';
import { ProjectionResult } from '../ProjectionResult';

/**
 * Projection engine for calculating volume-based metrics.
 * 
 * Volume is calculated as: repetitions × resistance (weight)
 * This is a fundamental metric for strength training analysis.
 * 
 * @example
 * ```typescript
 * // Metrics: 3 sets of 10 reps at 100kg
 * // Result: Total Volume = 3000kg
 * ```
 */
export class VolumeProjectionEngine implements IProjectionEngine {
  public readonly name = "VolumeProjectionEngine";

  calculate(metrics: RuntimeMetric[], definition: Exercise): ProjectionResult[] {
    if (metrics.length === 0) return [];

    let totalVolume = 0;
    let hasValidData = false;
    
    // Collect all time spans
    const allSpans = metrics.flatMap(m => m.timeSpans);
    if (allSpans.length === 0) return [];

    // Calculate volume from all metrics
    for (const metric of metrics) {
      const reps = metric.values.find(v => v.type === 'repetitions')?.value;
      const resistance = metric.values.find(v => v.type === 'resistance')?.value;
      
      // Only include if both reps and resistance are present
      if (typeof reps === 'number' && typeof resistance === 'number') {
        totalVolume += reps * resistance;
        hasValidData = true;
      }
    }

    // Don't return a result if no valid data was found
    if (!hasValidData) {
      return [];
    }

    // Determine time span
    const sortedSpans = allSpans.sort((a, b) => a.start.getTime() - b.start.getTime());
    const startTime = sortedSpans[0].start;
    const endTime = sortedSpans[sortedSpans.length - 1].stop;

    return [{
      name: "Total Volume",
      value: totalVolume,
      unit: "kg", // Could be derived from metric unit
      timeSpan: { start: startTime, stop: endTime },
      metadata: {
        exerciseName: definition.name,
        totalSets: metrics.length,
      }
    }];
  }
}
