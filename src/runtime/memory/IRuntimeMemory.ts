import { IMemoryReference, TypedMemoryReference } from './IMemoryReference';

export type Nullable<T> = { [K in keyof T]: T[K] | null };
/**
 * The main runtime memory interface that manages separate memory from the execution stack.
 * This enables debugging and state inspection independently of program execution flow.
 */
export interface IRuntimeMemory {
    /** 
     * Allocates a new memory location and returns a reference to it.
     * This memory will be automatically cleaned up when the associated stack item is removed.
     */
    allocate<T>(type: string, ownerId: string, visibility: 'public' | 'private'): TypedMemoryReference<T>;
        
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
     * the search is based on any non-null fields in the crieteria object.
     */
    search(criteria: Nullable<IMemoryReference>): IMemoryReference[];
    
    /**
     * Manually releases a memory reference and all its children.
     * This is automatically called when stack items are removed.
     */
    release(reference: IMemoryReference): void;
}