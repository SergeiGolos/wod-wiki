import { IBehavior } from './IBehavior';
import { IRuntimeBlock } from '../IRuntimeBlock';

/**
 * NextChildBehavior - Handles transition between child blocks.
 * 
 * Functions:
 * - onNext() looks at the current child requires the index reference
 * - Pushes the JIT-compiled next child group onto the runtime stack
 * - Manages the flow of execution between child blocks
 * 
 * Used By: RootBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock
 */
export interface INextChildBehavior extends IBehavior {
    /**
     * Check if there are more children to process
     */
    hasNextChild(): boolean;
    
    /**
     * Get the next child block to be executed
     * Returns undefined if no more children
     */
    getNextChild(): IRuntimeBlock | undefined;
    
    /**
     * Advance to the next child in the sequence
     */
    advanceToNextChild(): void;
    
    /**
     * Get the current child group being processed
     */
    getCurrentChildGroup(): string[] | undefined;
}