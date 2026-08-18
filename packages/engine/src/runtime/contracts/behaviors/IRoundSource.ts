/**
 * Interface for behaviors that expose round/iteration counter data.
 * 
 * Round source behaviors track the current iteration number in looping contexts.
 * The round is typically 1-based (first round = 1).
 * 
 * @example Implementations
 * - RoundPerLoopBehavior: Increments round when child index wraps
 * - RoundPerNextBehavior: Increments round on every next() call
 * 
 * @example Usage
 * ```typescript
 * const roundSource = block.getBehavior<IRoundSource>(RoundPerLoopBehavior);
 * const currentRound = roundSource?.getRound() ?? 1;
 * ```
 */
export interface IRoundSource {
    /**
     * Gets the current round number (1-based).
     * @returns The current round number, where 1 is the first round
     */
    getRound(): number;
}

/**
 * Type guard to check if a behavior implements IRoundSource
 */
export function isRoundSource(behavior: unknown): behavior is IRoundSource {
    return (
        typeof behavior === 'object' &&
        behavior !== null &&
        'getRound' in behavior &&
        typeof (behavior as IRoundSource).getRound === 'function'
    );
}
