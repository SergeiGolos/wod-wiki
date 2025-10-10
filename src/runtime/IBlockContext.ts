import { IMemoryReference, TypedMemoryReference } from './IMemoryReference';

/**
 * BlockContext provides memory allocation and access for a runtime block.
 * 
 * Design Principles:
 * - Strategy-owned: Created by strategies before block creation
 * - Constructor-injected: Passed to behaviors during instantiation
 * - Explicit cleanup: Consumer must call release() after block disposal
 * 
 * @example
 * ```typescript
 * // Strategy allocates memory
 * const context = new BlockContext(runtime, blockId);
 * const timerRef = context.allocate<TimeSpan[]>('timer-time-spans', [], 'public');
 * 
 * // Behavior receives memory via constructor
 * const behavior = new TimerBehavior(timerRef);
 * 
 * // Consumer handles cleanup
 * block.dispose();
 * block.context.release();
 * ```
 */
export interface IBlockContext {
    /**
     * Unique identifier for the owning block.
     * Used to track memory ownership in RuntimeMemory.
     */
    readonly ownerId: string;
    
    /**
     * All memory references allocated by this context.
     * Readonly array to prevent external modification.
     */
    readonly references: ReadonlyArray<IMemoryReference>;
    
    /**
     * Allocate memory for this block's state.
     * 
     * @param type Memory type identifier (e.g., 'timer-time-spans')
     * @param initialValue Optional initial value for the memory
     * @param visibility 'public' for cross-block access, 'private' for internal use
     * @returns Typed memory reference for accessing the allocated memory
     * @throws Error if context has been released
     */
    allocate<T>(
        type: string, 
        initialValue?: T, 
        visibility?: 'public' | 'private'
    ): TypedMemoryReference<T>;
    
    /**
     * Get the first memory reference of a specific type.
     * 
     * @param type Memory type identifier to search for
     * @returns Memory reference or undefined if not found
     */
    get<T>(type: string): TypedMemoryReference<T> | undefined;
    
    /**
     * Get all memory references of a specific type.
     * Useful when multiple memory entries of the same type exist.
     * 
     * @param type Memory type identifier to search for
     * @returns Array of matching memory references (empty if none found)
     */
    getAll<T>(type: string): TypedMemoryReference<T>[];
    
    /**
     * Release all allocated memory references.
     * Must be called by consumer after block disposal.
     * 
     * This method is idempotent - calling multiple times is safe.
     * After release, allocate() will throw an error.
     */
    release(): void;
    
    /**
     * Check if this context has been released.
     * 
     * @returns true if release() has been called
     */
    isReleased(): boolean;
}
