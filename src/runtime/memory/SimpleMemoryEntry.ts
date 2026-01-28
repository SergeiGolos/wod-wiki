import { IMemoryEntry } from './IMemoryEntry';

/**
 * Simple in-memory entry that wraps a value.
 * Used by behaviors to store state in block memory.
 * 
 * Unlike BaseMemoryEntry, this class allows full value replacement
 * via the `update()` method.
 */
export class SimpleMemoryEntry<T extends string, V> implements IMemoryEntry<T, V> {
    private _listeners: Set<(newValue: V | undefined, oldValue: V | undefined) => void> = new Set();
    private _value: V;

    constructor(
        public readonly type: T,
        initialValue: V
    ) {
        this._value = initialValue;
    }

    get value(): V {
        return this._value;
    }

    /**
     * Update the value and notify subscribers.
     */
    update(newValue: V): void {
        const oldValue = this._value;
        this._value = newValue;
        this.notify(newValue, oldValue);
    }

    subscribe(listener: (newValue: V | undefined, oldValue: V | undefined) => void): () => void {
        this._listeners.add(listener);
        return () => {
            this._listeners.delete(listener);
        };
    }

    private notify(newValue: V | undefined, oldValue: V): void {
        const listeners = Array.from(this._listeners);
        for (const listener of listeners) {
            try {
                listener(newValue, oldValue);
            } catch (error) {
                console.error(`Error in memory listener for ${this.type}:`, error);
            }
        }
    }

    dispose(): void {
        const lastValue = this._value;
        this.notify(undefined, lastValue);
        this._listeners.clear();
    }
}
