import type { IMemoryReference } from '../memory';
import { IBehavior } from './IBehavior';

/**
 * AllocateIndex - Writes tracking information for loop execution.
 * 
 * Functions:
 * - Manages the index of the loop
 * - Tracks the index of the current child
 * 
 * Used By: RootBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock
 */
export interface IAllocateIndexBehavior extends IBehavior {
    /**
     * Memory allocations:
     * - loop-index (private): number - index of the current loop iteration
     * - child-index (private): number - index of the current child
     */
    
    /**
     * Get the current loop index
     */
    getLoopIndex(): number;
    
    /**
     * Set the current loop index
     */
    setLoopIndex(index: number): void;
    
    /**
     * Get the current child index
     */
    getChildIndex(): number;
    
    /**
     * Set the current child index
     */
    setChildIndex(index: number): void;
    
    /**
     * Get the loop index memory reference
     */
    getLoopIndexReference(): IMemoryReference<number> | undefined;
    
    /**
     * Get the child index memory reference
     */
    getChildIndexReference(): IMemoryReference<number> | undefined;
}