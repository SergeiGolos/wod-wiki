/**
 * A reference to a memory location that can be passed between components.
 * This allows processes to reference memory without directly coupling to it.
 */
export interface IMemoryReference<T = any> {
    /** Unique identifier for this memory reference */
    readonly id: string;
    
    /** Type identifier for the stored data */
    readonly type: string;
    
    /** Gets the current value stored at this memory location */
    get(): T | undefined;
    
    /** Sets the value at this memory location */
    set(value: T): void;
    
    /** Checks if the memory location still exists and is valid */
    isValid(): boolean;
    
    /** Creates a child reference that will be cleaned up when this reference is cleaned up */
    createChild<C = any>(type: string, initialValue?: C): IMemoryReference<C>;
}