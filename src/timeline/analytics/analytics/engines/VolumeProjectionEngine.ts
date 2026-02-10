import { IProjectionEngine } from '../IProjectionEngine';
import { Exercise } from '../../../../exercise';
import { ProjectionResult } from '../ProjectionResult';
import { ICodeFragment, FragmentType } from '../../../../core/models/CodeFragment';
import { TimeSpan } from '../../../../runtime/models/TimeSpan';

/**
 * Projection engine for calculating volume-based metrics.
 * 
 * Volume is calculated as: repetitions × resistance (weight)
 * This is a fundamental metric for strength training analysis.
 * 
 * Phase 4 Cleanup: Simplified to use fragment-based path exclusively.
 * 
 * @example
 * ```typescript
 * // Fragments: [Effort: Bench Press], [Rep: 10], [Resistance: 100kg]
 * // Result: Total Volume = 1000kg
 * ```
 */
export class VolumeProjectionEngine implements IProjectionEngine {
  public readonly name = "VolumeProjectionEngine";

  /**
   * Calculate volume from code fragments.
   * 
   * Extracts repetitions and resistance from fragments and calculates
   * total volume.
   * 
   * **Fragment Pairing:**
   * Fragments are processed sequentially. A set is calculated when both
   * Rep and Resistance fragments are encountered.
   * 
   * @param fragments Array of code fragments for a single exercise
   * @param exerciseId Exercise identifier
   * @param definition Exercise definition
   * @returns Array with single volume projection result, or empty if no valid data
   */
  calculateFromFragments(fragments: ICodeFragment[], _exerciseId: string, definition: Exercise): ProjectionResult[] {
    if (fragments.length === 0) return [];

    let totalVolume = 0;
    let hasValidData = false;
    let totalSets = 0;

    // Group fragments into sets (count rep/resistance pairs)
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

    const now = new Date();

    return [{
      name: "Total Volume",
      value: totalVolume,
      unit: "kg",
      timeSpan: new TimeSpan(now.getTime(), now.getTime()),
      metadata: {
        exerciseName: definition.name,
        totalSets,
        source: 'fragments',
      }
    }];
  }
}
