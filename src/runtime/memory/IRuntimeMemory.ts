import { IMemoryReference } from './IMemoryReference';

/**
 * The main runtime memory interface that manages separate memory from the execution stack.
 * This enables debugging and state inspection independently of program execution flow.
 */
export interface IRuntimeMemory {
    /** 
     * Allocates a new memory location and returns a reference to it.
     * This memory will be automatically cleaned up when the associated stack item is removed.
     */
    allocate<T>(type: string, initialValue?: T, ownerId?: string): IMemoryReference<T>;
    
    /**
     * Gets a memory reference by its ID.
     * Returns undefined if the reference doesn't exist or has been cleaned up.
     */
    getReference<T>(id: string): IMemoryReference<T> | undefined;
    
    /**
     * Manually releases a memory reference and all its children.
     * This is automatically called when stack items are removed.
     */
    release(reference: IMemoryReference): void;
    
    /**
     * Gets all memory references owned by a specific owner (typically a stack block).
     * This is used for automatic cleanup when blocks are popped from the stack.
     */
    getByOwner(ownerId: string): IMemoryReference[];
    
    /**
     * Gets all currently allocated memory references for debugging purposes.
     * This enables independent viewing of the application's memory state.
     */
    getAllReferences(): IMemoryReference[];
    
    /**
     * Creates a snapshot of the current memory state for debugging.
     * This allows debugging tools to inspect memory without affecting execution.
     */
    createSnapshot(): Record<string, any>;
}