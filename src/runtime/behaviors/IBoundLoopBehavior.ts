import type { IMemoryReference } from '../memory';
import { IBehavior } from './IBehavior';

/**
 * BoundLoopBehavior - Enables fixed-count repetition of child blocks.
 * 
 * Functions:
 * - Loops X number of times before exiting
 * - Maintains count of remaining iterations
 * 
 * Used By: BoundedLoopingBlock, BoundedLoopingParentBlock
 */
export interface IBoundLoopBehavior extends IBehavior {
    /**
     * Memory allocations:
     * - remaining-iterations (private): number - count of remaining iterations
     * - total-iterations (private): number - initial total iterations
     */
    
    /**
     * Get the remaining iterations count
     */
    getRemainingIterations(): number;
    
    /**
     * Set the remaining iterations count
     */
    setRemainingIterations(count: number): void;
    
    /**
     * Get the total iterations count
     */
    getTotalIterations(): number;
    
    /**
     * Decrement the remaining iterations count
     */
    decrementIterations(): void;
    
    /**
     * Check if more iterations remain
     */
    hasMoreIterations(): boolean;
    
    /**
     * Get the remaining iterations memory reference
     */
    getRemainingIterationsReference(): IMemoryReference<number> | undefined;
}