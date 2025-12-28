import { IProjectionEngine } from '../IProjectionEngine';
import { RuntimeMetric } from '../../../../runtime/models/RuntimeMetric';
import { Exercise } from '../../../../exercise';
import { ProjectionResult } from '../ProjectionResult';
import { ICodeFragment, FragmentType } from '../../../../core/models/CodeFragment';

/**
 * Projection engine for calculating volume-based metrics.
 * 
 * Volume is calculated as: repetitions × resistance (weight)
 * This is a fundamental metric for strength training analysis.
 * 
 * Phase 2 Update: Supports both RuntimeMetric and ICodeFragment inputs.
 * 
 * @example
 * ```typescript
 * // Metrics: 3 sets of 10 reps at 100kg
 * // Result: Total Volume = 3000kg
 * ```
 */
export class VolumeProjectionEngine implements IProjectionEngine {
  public readonly name = "VolumeProjectionEngine";

  /**
   * Calculate volume from runtime metrics (legacy path).
   * 
   * @deprecated Use calculateFromFragments() for new code.
   */
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

  /**
   * Calculate volume from code fragments (new fragment-based path).
   * 
   * Extracts repetitions and resistance from fragments and calculates
   * total volume. This is the preferred method for Phase 2+.
   * 
   * **Fragment Pairing:**
   * Fragments are processed sequentially. A set is calculated when both
   * Rep and Resistance fragments are encountered. If fragments end with
   * an unpaired Rep or Resistance, that value is silently dropped.
   * 
   * **Expected Pattern:** Rep, Resistance, Rep, Resistance, ...
   * 
   * @param fragments Array of code fragments for a single exercise
   * @param exerciseId Exercise identifier
   * @param definition Exercise definition
   * @returns Array with single volume projection result, or empty if no valid data
   */
  calculateFromFragments(fragments: ICodeFragment[], exerciseId: string, definition: Exercise): ProjectionResult[] {
    if (fragments.length === 0) return [];

    let totalVolume = 0;
    let hasValidData = false;
    let totalSets = 0;

    // Group fragments into sets (simplified: count rep/resistance pairs)
    let currentReps: number | undefined;
    let currentResistance: number | undefined;

    for (const fragment of fragments) {
      if (fragment.fragmentType === FragmentType.Rep && typeof fragment.value === 'number') {
        currentReps = fragment.value;
      } else if (fragment.fragmentType === FragmentType.Resistance && typeof fragment.value === 'number') {
        currentResistance = fragment.value;
      }

      // Calculate volume when we have both values
      if (currentReps !== undefined && currentResistance !== undefined) {
        totalVolume += currentReps * currentResistance;
        hasValidData = true;
        totalSets++;
        // Reset for next set
        currentReps = undefined;
        currentResistance = undefined;
      }
    }

    // Don't return a result if no valid data was found
    if (!hasValidData) {
      return [];
    }

    // Note: Fragment-based path doesn't have time spans by default
    // This could be enhanced in the future if fragments include timing metadata
    const now = new Date();

    return [{
      name: "Total Volume",
      value: totalVolume,
      unit: "kg", // Could be derived from fragment metadata in future
      timeSpan: { start: now, stop: now },
      metadata: {
        exerciseName: definition.name,
        totalSets,
        source: 'fragments', // Indicate this came from fragment path
      }
    }];
  }
}
