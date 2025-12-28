import { IMemoryReference, TypedMemoryReference } from './IMemoryReference';
import { MemoryTypeEnum } from '../models/MemoryTypeEnum';
import { IAnchorValue } from './IAnchorValue';

/**
 * Callback type for memory event subscriptions.
 * Called when a memory event occurs for a reference owned by this context.
 * 
 * @param ref The memory reference that changed
 * @param value The new value (or last value for release events)
 * @param oldValue The previous value (only for set events)
 */
export type MemoryEventCallback<T = unknown> = (
    ref: IMemoryReference,
    value: T,
    oldValue?: T
) => void;

/**
 * Memory event type for subscription filtering.
 */
export type MemoryEventType = 'allocate' | 'set' | 'release';

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
    
    /**
     * Subscribe to allocate events for memory owned by this context.
     * Callback is only invoked when memory is allocated with this context's ownerId.
     * Subscriptions are automatically cleaned up when release() is called.
     * 
     * @param callback Function to call when memory is allocated
     * @returns Unsubscribe function to manually remove the subscription
     * @throws Error if context has been released
     * 
     * @example
     * ```typescript
     * const unsubscribe = context.onAllocate((ref, value) => {
     *   console.log(`Allocated ${ref.type} with value:`, value);
     * });
     * ```
     */
    onAllocate<T = unknown>(callback: MemoryEventCallback<T>): () => void;
    
    /**
     * Subscribe to set events for memory owned by this context.
     * Callback is only invoked when memory is set with this context's ownerId.
     * Subscriptions are automatically cleaned up when release() is called.
     * 
     * @param callback Function to call when memory value is set
     * @returns Unsubscribe function to manually remove the subscription
     * @throws Error if context has been released
     * 
     * @example
     * ```typescript
     * const unsubscribe = context.onSet((ref, value, oldValue) => {
     *   console.log(`Value changed from ${oldValue} to ${value}`);
     * });
     * ```
     */
    onSet<T = unknown>(callback: MemoryEventCallback<T>): () => void;
    
    /**
     * Subscribe to release events for memory owned by this context.
     * Callback is only invoked when memory is released with this context's ownerId.
     * Subscriptions are automatically cleaned up when release() is called.
     * 
     * @param callback Function to call when memory is released
     * @returns Unsubscribe function to manually remove the subscription
     * @throws Error if context has been released
     * 
     * @example
     * ```typescript
     * const unsubscribe = context.onRelease((ref, lastValue) => {
     *   console.log(`Released ${ref.type}, last value was:`, lastValue);
     * });
     * ```
     */
    onRelease<T = unknown>(callback: MemoryEventCallback<T>): () => void;
    
    /**
     * Subscribe to any memory event for memory owned by this context.
     * Callback is invoked for allocate, set, and release events.
     * Subscriptions are automatically cleaned up when release() is called.
     * 
     * @param callback Function to call when any memory event occurs
     * @returns Unsubscribe function to manually remove the subscription
     * @throws Error if context has been released
     * 
     * @example
     * ```typescript
     * const unsubscribe = context.onAny((ref, value, oldValue) => {
     *   console.log(`Memory event for ${ref.type}`);
     * });
     * ```
     */
    onAny<T = unknown>(callback: MemoryEventCallback<T>): () => void;
}
