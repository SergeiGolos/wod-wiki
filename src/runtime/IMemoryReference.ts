/**
 * A reference to a memory location that can be passed between components.
 * This allows processes to reference memory without directly coupling to it.
 */

import { IRuntimeMemory } from "./IRuntimeMemory";

export interface IMemoryReference {
    readonly id: string;
    readonly ownerId: string;
    readonly type: string;
    readonly visibility: 'public' | 'private';
}

export interface IMemorySubscription<T> {
    id: string;
    callback: (newValue: T | undefined, oldValue: T | undefined) => void;
    active: boolean;
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
        public visibility: "public" | "private" = 'private',

    ) {
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
            active: true
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
            this._subscriptions[index].active = false;
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
        for (const subscription of this._subscriptions) {
            if (subscription.active) {
                try {
                    subscription.callback(newValue, oldValue);
                } catch (error) {
                    console.error(`Error in memory subscription callback:`, error);
                }
            }
        }
    }
}