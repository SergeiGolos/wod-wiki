/**
 * A reference to a memory location that can be passed between components.
 * This allows processes to reference memory without directly coupling to it.
 */

import { IRuntimeMemory } from "./IRuntimeMemory";

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
    value(): any | undefined;
    
    /**
     * List of active subscriptions for this memory reference.
     * Readonly access for debugging and inspection.
     */
    readonly subscriptions: ReadonlyArray<IMemorySubscription<any>>;
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

export class TypedMemoryReference<T>  implements IMemoryReference {    
    public readonly id: string = crypto.randomUUID();
    private _subscriptions: IMemorySubscription<T>[] = [];

    constructor(
        private readonly _memory: IRuntimeMemory,
        public readonly ownerId: string,
        public readonly type: string,
        public visibility: "public" | "private" | "inherited" = 'private',

    ) {
    }
    
    /**
     * Get the current value in an untyped manner.
     * Implements IMemoryReference.value() for debugging and inspection.
     */
    value(): any | undefined {
        return this.get();
    }
    
    /**
     * Readonly access to subscriptions list.
     * Implements IMemoryReference.subscriptions for debugging and inspection.
     */
    get subscriptions(): ReadonlyArray<IMemorySubscription<any>> {
        return this._subscriptions;
    }
            
    get(): T | undefined {
        return this._memory.get<T>(this)
    }

    set(value: T): void {
        this._memory.set<T>(this, value);
    }

    /**
     * Subscribe to changes in this memory reference.
     * @param callback Function to call when the value changes
     * @param options Subscription options (immediate, throttle)
     * @returns Unsubscribe function
     */
    subscribe(
        callback: (newValue: T | undefined, oldValue: T | undefined) => void,
        options?: SubscriptionOptions
    ): () => void {
        const subscriptionId = crypto.randomUUID();
        const subscription: IMemorySubscription<T> = {
            id: subscriptionId,
            callback,
            memoryId: this.id,
            createdAt: new Date()
        };

        this._subscriptions.push(subscription);

        // Call immediately with current value if requested
        if (options?.immediate) {
            const currentValue = this.get();
            callback(currentValue, undefined);
        }

        // Return unsubscribe function
        return () => this.unsubscribe(subscriptionId);
    }

    /**
     * Unsubscribe from changes by subscription ID.
     * @param subscriptionId The ID of the subscription to remove
     */
    unsubscribe(subscriptionId: string): void {
        const index = this._subscriptions.findIndex(s => s.id === subscriptionId);
        if (index >= 0) {
            // Simply remove from array - no need for active flag
            this._subscriptions.splice(index, 1);
        }
    }

    /**
     * Check if this reference has any active subscribers.
     * @returns true if there are active subscribers
     */
    hasSubscribers(): boolean {
        return this._subscriptions.length > 0;
    }

    /**
     * Notify all subscribers of a value change.
     * This is called internally by RuntimeMemory.
     * @internal
     */
    notifySubscribers(newValue: T | undefined, oldValue: T | undefined): void {
        // All subscriptions in the array are active (removed ones are spliced out)
        for (const subscription of this._subscriptions) {
            try {
                subscription.callback(newValue, oldValue);
            } catch (error) {
                console.error(`Error in memory subscription callback:`, error);
            }
        }
    }
}
