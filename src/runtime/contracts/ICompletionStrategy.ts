import { IRuntimeBlock } from './IRuntimeBlock';
import { IRuntimeAction } from './IRuntimeAction';

/**
 * ICompletionStrategy - Strategy interface for block completion detection.
 * 
 * Consolidates completion logic that was previously scattered across multiple behaviors:
 * - CompletionBehavior (generic condition-based)
 * - BoundLoopBehavior (round count based)
 * - SinglePassBehavior (child exhaustion based)
 * - PopOnNextBehavior (immediate on next)
 * - PopOnEventBehavior (event-triggered)
 * 
 * Benefits:
 * - Single responsibility for completion detection
 * - Consistent completion semantics
 * - Easier to add new completion strategies
 * - Better testability
 * 
 * @see https://github.com/SergeiGolos/wod-wiki/blob/main/docs/BEHAVIOR_OVERLAP_AND_RACE_CONDITIONS_ASSESSMENT.md#74-medium-priority-introduce-completion-strategy-pattern
 */
export interface ICompletionStrategy {
    /**
     * Checks if the block should complete based on strategy-specific logic.
     * 
     * @param block - The runtime block to check
     * @param now - Current timestamp
     * @returns true if the block should pop
     */
    shouldComplete(block: IRuntimeBlock, now: Date): boolean;
    
    /**
     * Gets actions to execute before popping the block.
     * Typically includes event emissions for telemetry and state updates.
     * 
     * @param block - The completing block
     * @param now - Completion timestamp
     * @returns Actions to execute before pop
     */
    getCompletionActions(block: IRuntimeBlock, now: Date): IRuntimeAction[];
    
    /**
     * Gets the list of event names this strategy watches for completion.
     * 
     * @returns Array of event names (e.g., ['timer:tick', 'timer:complete'])
     */
    getWatchedEvents(): string[];
    
    /**
     * Optional: Gets a human-readable reason for completion.
     * Used for debugging and telemetry.
     */
    getCompletionReason?(): string;
}
