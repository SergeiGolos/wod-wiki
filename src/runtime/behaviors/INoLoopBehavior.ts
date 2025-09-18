import { IBehavior } from './IBehavior';

/**
 * NoLoopBehavior - Controls single-pass execution of child blocks.
 * 
 * Functions:
 * - Registers the exit condition to end after a single pass through children
 * - Prevents repetitive execution of child blocks
 * 
 * Used By: RootBlock
 */
export interface INoLoopBehavior extends IBehavior {
    /**
     * Check if the single pass is complete
     */
    isPassComplete(): boolean;
    
    /**
     * Mark the pass as complete
     */
    markPassComplete(): void;
    
    /**
     * Reset the pass state (for re-entry scenarios)
     */
    resetPassState(): void;
}