import { IMemoryReference, TypedMemoryReference } from './IMemoryReference';
import { MemoryTypeEnum } from './MemoryTypeEnum';
import { IAnchorValue } from './IAnchorValue';

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
     * The ID of the exercise this block is executing.
     * Used for metric collection and exercise definition lookup.
     */
    readonly exerciseId: string;
    
    /**
     * All memory references allocated by this context.
     * Readonly array to prevent external modification.
     */
    readonly references: ReadonlyArray<IMemoryReference>;
    
    /**
     * Allocate memory for this block's state.
     * 
     * @param type Memory type identifier from MemoryTypeEnum or custom string
     * @param initialValue Optional initial value for the memory
     * @param visibility 'public' for cross-block access, 'private' for internal use
     * @returns Typed memory reference for accessing the allocated memory
     * @throws Error if context has been released
     */
    allocate<T>(
        type: MemoryTypeEnum | string, 
        initialValue?: T, 
        visibility?: 'public' | 'private'
    ): TypedMemoryReference<T>;
    
    /**
     * Get the first memory reference of a specific type.
     * 
     * @param type Memory type identifier from MemoryTypeEnum or custom string
     * @returns Memory reference or undefined if not found
     */
    get<T>(type: MemoryTypeEnum | string): TypedMemoryReference<T> | undefined;
    
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
    
    /**
     * Get or create an anchor reference with a stable ID.
     * 
     * Anchors are special memory references that act as named pointers
     * to other memory references. They enable UI components to subscribe
     * to data without knowing the specific data source.
     * 
     * If an anchor with the given ID already exists (from any owner),
     * it returns the existing reference. Otherwise, it creates a new one.
     * 
     * Anchors are always allocated with 'public' visibility so they can
     * be found by UI components across the application.
     * 
     * @param anchorId Stable, semantic ID for the anchor (e.g., 'anchor-main-workout-clock')
     * @returns Typed memory reference for the anchor
     * @throws Error if context has been released
     * 
     * @example
     * ```typescript
     * const anchor = context.getOrCreateAnchor('anchor-main-clock');
     * anchor.set({
     *   searchCriteria: {
     *     ownerId: timerBlockId,
     *     type: MemoryTypeEnum.TIMER_TIME_SPANS
     *   }
     * });
     * ```
     */
    getOrCreateAnchor(anchorId: string): TypedMemoryReference<IAnchorValue>;
}
