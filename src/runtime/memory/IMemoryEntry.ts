/**
 * Base interface for typed memory entries stored within a RuntimeBlock.
 * 
 * Each entry is a single source of truth for a specific data concern (timer, round, etc.)
 * and supports reactive subscriptions.
 * 
 * @template T - The memory type discriminator string
 * @template V - The value type stored in this entry
 */
export interface IMemoryEntry<T extends string, V> {
    /** 
     * Type discriminator for the memory entry. 
     * Matches one of the keys in MemoryTypeMap.
     */
    readonly type: T;

    /** 
     * Current value of the memory entry.
     */
    readonly value: V;

    /** 
     * Subscribe to value changes.
     * 
     * Implementation Requirements:
     * 1. Must notify subscribers immediately after a value change.
     * 2. Must notify subscribers with (undefined, oldValue) when the entry is released/disposed.
     * 3. Must return an unsubscribe function to prevent memory leaks.
     * 
     * @param listener Callback function receiving (newValue, oldValue)
     * @returns Function to remove the subscription
     */
    subscribe(listener: (newValue: V | undefined, oldValue: V | undefined) => void): () => void;
}
