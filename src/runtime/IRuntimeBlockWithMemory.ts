import { IRuntimeBlock } from "./IRuntimeBlock";
import type { IMemoryReference } from "./memory";

/**
 * Extended runtime block interface that supports memory allocation and management.
 * This allows blocks to allocate memory separate from the execution stack.
 */
export interface IRuntimeBlockWithMemory extends IRuntimeBlock {
    /**
     * Memory references allocated by this block.
     * These will be automatically cleaned up when the block is removed from the stack.
     */
    readonly memory: IMemoryReference[];
    
    /**
     * Allocates memory for this block's state.
     * The memory will be automatically cleaned up when the block is popped from the stack.
     */
    allocateMemory<T>(type: string, initialValue?: T): IMemoryReference<T>;
    
    /**
     * Gets a memory reference by type.
     * Returns the first memory reference of the specified type owned by this block.
     */
    getMemory<T>(type: string): IMemoryReference<T> | undefined;
    
    /**
     * Called when the block is being removed from the stack.
     * This is an opportunity for the block to perform cleanup before its memory is released.
     */
    onMemoryCleanup?(): void;
}