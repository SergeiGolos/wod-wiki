import { IMemoryReference, TypedMemoryReference } from './IMemoryReference';

export type Nullable<T> = { [K in keyof T]: T[K] | null };

/**
 * Search criteria for finding memory references.
 * Uses only the basic properties, not methods.
 */
export type MemorySearchCriteria = {
    id: string | null;
    ownerId: string | null;
    type: string | null;
    visibility: 'public' | 'private' | 'inherited' | null;
};

/**
 * Callback type for memory event dispatch.
 * Used to connect RuntimeMemory to the EventBus without circular dependencies.
 */
export type MemoryEventDispatcher = (
    eventType: 'allocate' | 'set' | 'release',
    ref: IMemoryReference,
    value: unknown,
    oldValue?: unknown
) => void;

/**
 * The main runtime memory interface that manages separate memory from the execution stack.
 * This enables debugging and state inspection independently of program execution flow.
 */
export interface IRuntimeMemory {
    /** 
     * Allocates a new memory location and returns a reference to it.
     * This memory will be automatically cleaned up when the associated stack item is removed.
     */
    allocate<T>(type: string, ownerId: string, initialValue?: T, visibility?: 'public' | 'private' | 'inherited'): TypedMemoryReference<T>;
        
    /**
     * Gets a memory reference by its ID.
     * Returns undefined if the reference doesn't exist or has been cleaned up.
     */
    get<T>(reference: TypedMemoryReference<T>): T | undefined;

    /**
     * Sets the value of a memory reference.
     * Throws an error if the reference is invalid.
     **/
    set<T>(reference: TypedMemoryReference<T>, value: T): void;
    
    /**
     * Searches for memory references that match the given criteria.
     * Returns an array of matching references (empty if none found).
     * the search is based on any non-null fields in the criteria object.
     */
    search(criteria: MemorySearchCriteria): IMemoryReference[];
    
    /**
     * Manually releases a memory reference and all its children.
     * This is automatically called when stack items are removed.
     */
    release(reference: IMemoryReference): void;

    /**
     * Sets the event dispatcher for memory events.
     * This connects the memory system to the EventBus.
     */
    setEventDispatcher(dispatcher: MemoryEventDispatcher | null): void;

    /**
     * Subscribe to all memory changes.
     * @deprecated Use EventBus handlers instead. This will be removed in a future version.
     * Returns a function to unsubscribe.
     */
    subscribe(callback: (ref: IMemoryReference, value: any, oldValue: any) => void): () => void;
}
