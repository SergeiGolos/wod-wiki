/**
 * A reference to a memory location that can be passed between components.
 * This allows processes to reference memory without directly coupling to it.
 *
 * Note: The concrete `TypedMemoryReference` implementation lives in
 * `src/runtime/impl/TypedMemoryReference.ts` to keep this contracts file
 * free of implementation code and to break the
 * `IMemoryReference ↔ IRuntimeMemory` cycle.
 */

export interface IMemoryReference {
    readonly id: string;
    readonly ownerId: string;
    readonly type: string;
    readonly visibility: 'public' | 'private' | 'inherited';

    /**
     * Get the current value in an untyped manner.
     * Useful for debugging and generic operations.
     * @returns The current value or undefined
     */
    value(): unknown;

    /**
     * List of active subscriptions for this memory reference.
     * Readonly access for debugging and inspection.
     */
    readonly subscriptions: ReadonlyArray<IMemorySubscription<unknown>>;
}

export interface IMemorySubscription<T> {
    readonly id: string;
    readonly callback: (newValue: T | undefined, oldValue: T | undefined) => void;
    readonly memoryId: string;
    readonly createdAt: Date;
}

export interface SubscriptionOptions {
    immediate?: boolean;   // Call callback immediately with current value
    throttle?: number;     // Min milliseconds between notifications
}
