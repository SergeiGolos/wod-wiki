import { IRuntimeBlock } from '../IRuntimeBlock';

/**
 * Interface for behaviors that expose completion state data.
 * 
 * Completion source behaviors determine when a block should be popped from the stack.
 * They may use various criteria: round counts, time limits, external conditions, etc.
 * 
 * @example Implementations
 * - BoundLoopBehavior: Complete when round > totalRounds
 * - CompletionBehavior: Complete when condition function returns true
 * - SinglePassBehavior: Complete after single execution
 * - UnboundLoopBehavior: Never complete (infinite loop)
 * 
 * @example Usage
 * ```typescript
 * const completionSource = block.getBehavior<ICompletionSource>(BoundLoopBehavior);
 * if (completionSource?.isComplete(block, now)) {
 *   // Block should be popped
 * }
 * ```
 */
export interface ICompletionSource {
    /**
     * Checks if the behavior considers the block complete.
     * 
     * @param block - The runtime block to check (optional for simple implementations)
     * @param now - The current timestamp (optional for time-independent checks)
     * @returns true if the block should be considered complete
     */
    isComplete(block?: IRuntimeBlock, now?: Date): boolean;
}

/**
 * Type guard to check if a behavior implements ICompletionSource
 */
export function isCompletionSource(behavior: unknown): behavior is ICompletionSource {
    return (
        typeof behavior === 'object' &&
        behavior !== null &&
        'isComplete' in behavior &&
        typeof (behavior as ICompletionSource).isComplete === 'function'
    );
}
