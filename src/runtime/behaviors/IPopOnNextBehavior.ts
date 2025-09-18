import { IBehavior } from './IBehavior';

/**
 * PopOnNextBehavior - Manages block stack transitions.
 * 
 * Functions:
 * - Triggers stack pop for current block when next event fires
 * - Ensures proper pop for all children
 * 
 * Used By: TimeBoundBlock, TimedBlock
 */
export interface IPopOnNextBehavior extends IBehavior {
    /**
     * Check if the block should be popped on next event
     */
    shouldPopOnNext(): boolean;
    
    /**
     * Mark the block for popping on next event
     */
    markForPopOnNext(): void;
    
    /**
     * Reset the pop on next state
     */
    resetPopOnNextState(): void;
}