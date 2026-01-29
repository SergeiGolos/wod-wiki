import { IMemoryEntry } from './IMemoryEntry';

/**
 * Common implementation for typed memory entries.
 * Handles subscription management and value updates.
 */
export abstract class BaseMemoryEntry<T extends string, V> implements IMemoryEntry<T, V> {
    private _listeners: Set<(newValue: V | undefined, oldValue: V | undefined) => void> = new Set();
    protected _value: V;

    constructor(
        public readonly type: T,
        initialValue: V
    ) {
        this._value = initialValue;
    }

    /**
     * Current value of the memory entry.
     */
    get value(): V {
        return this._value;
    }

    /**
     * Update the value and notify subscribers.
     * @param newValue The new value for the entry
     */
    update(newValue: V): void {
        const oldValue = this._value;
        this._value = newValue;
        this.notify(newValue, oldValue);
    }

    /**
     * Subscribe to value changes.
     * Notifications are also sent when the entry is disposed.
     */
    subscribe(listener: (newValue: V | undefined, oldValue: V | undefined) => void): () => void {
        this._listeners.add(listener);
        return () => {
            this._listeners.delete(listener);
        };
    }

    /**
     * Notifies all subscribers of a change or disposal.
     */
    protected notify(newValue: V | undefined, oldValue: V): void {
        const listeners = Array.from(this._listeners);
        for (const listener of listeners) {
            try {
                listener(newValue, oldValue);
            } catch (error) {
                console.error(`Error in memory listener for ${this.type}:`, error);
            }
        }
    }

    /**
     * Disposes of the memory entry, notifying subscribers that it's gone.
     * This satisfies the requirement to notify of "completion".
     */
    dispose(): void {
        const lastValue = this._value;
        this.notify(undefined, lastValue);
        this._listeners.clear();
    }
}
