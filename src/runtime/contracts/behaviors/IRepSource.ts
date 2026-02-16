/**
 * Interface for behaviors that expose rep/metric configuration data.
 * 
 * Rep source behaviors provide the target reps for the current round,
 * typically used in rep scheme workouts (e.g., 21-15-9).
 * 
 * @example Implementations
 * - FragmentPromotionBehavior: Maps rounds to rep counts from a scheme array
 * 
 * @example Usage
 * ```typescript
 * const repSource = block.getBehavior<IRepSource>(FragmentPromotionBehavior);
 * const targetReps = repSource?.getRepsForRound(currentRound) ?? 10;
 * ```
 */
export interface IRepSource {
    /**
     * Gets the target rep count for a specific round.
     * @param round - The round number (1-based)
     * @returns The target reps for that round, or undefined if not applicable
     */
    getRepsForRound(round: number): number | undefined;

    /**
     * Gets the target rep count for the current round.
     * @returns The target reps for the current round, or undefined if not applicable
     */
    getRepsForCurrentRound?(): number | undefined;

    /**
     * Gets the full rep scheme array if available.
     * @returns The rep scheme array (e.g., [21, 15, 9]), or undefined
     */
    readonly repScheme?: readonly number[];
}

/**
 * Type guard to check if a behavior implements IRepSource
 */
export function isRepSource(behavior: unknown): behavior is IRepSource {
    return (
        typeof behavior === 'object' &&
        behavior !== null &&
        'getRepsForRound' in behavior &&
        typeof (behavior as IRepSource).getRepsForRound === 'function'
    );
}
