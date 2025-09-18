import type { IMemoryReference } from '../memory';
import { IBehavior } from './IBehavior';
import { IResultSpanBuilder } from '../ResultSpanBuilder';

/**
 * AllocateSpanBehavior - Creates spans visible to child blocks or for the current block.
 * 
 * Functions:
 * - Creates and manages span data that can be accessed by child blocks
 * - Provides hierarchical context for timing and measurements
 * - Creates span structures for tracking block execution
 * 
 * Used By: 
 * - For child visibility: RootBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock
 * - For current block: TimeBoundBlock, TimedBlock, BoundedLoopingBlock, BoundedLoopingParentBlock, TimeBoundedLoopingBlock
 */
export interface IAllocateSpanBehavior extends IBehavior {
    /**
     * Memory allocations:
     * - span (private or public): IResultSpanBuilder - the span for this block
     */
    
    /**
     * Get the span from memory
     */
    getSpan(): IResultSpanBuilder | undefined;
    
    /**
     * Set the span in memory
     */
    setSpan(span: IResultSpanBuilder): void;
    
    /**
     * Create a new span
     */
    createSpan(): IResultSpanBuilder;
    
    /**
     * Get the span memory reference
     */
    getSpanReference(): IMemoryReference<IResultSpanBuilder> | undefined;
    
    /**
     * Initialize the span in memory
     */
    initializeSpan(visibility: 'public' | 'private'): void;
}