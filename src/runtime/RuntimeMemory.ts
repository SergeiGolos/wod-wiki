import { IRuntimeMemory, Nullable, MemoryEventDispatcher } from './IRuntimeMemory';
import { IMemoryReference, TypedMemoryReference } from './IMemoryReference';

export type MemoryLocation = {
    ref: IMemoryReference;
    data: unknown;
}

export class RuntimeMemory implements IRuntimeMemory {
    // Linear storage for memory locations
    private _references: MemoryLocation[] = [];
    private _globalSubscribers: Set<(ref: IMemoryReference, value: unknown, oldValue: unknown) => void> = new Set();
    private _eventDispatcher: MemoryEventDispatcher | null = null;

    /**
     * Sets the event dispatcher for memory events.
     * This connects the memory system to the EventBus.
     */
    setEventDispatcher(dispatcher: MemoryEventDispatcher | null): void {
        this._eventDispatcher = dispatcher;
    }

    // Allocates a new memory location and returns a reference to it.
    allocate<T>(type: string, ownerId: string, initialValue?: T, visibility: 'public' | 'private' | 'inherited' = 'private'): TypedMemoryReference<T> {
        const ref = new TypedMemoryReference<T>(this, ownerId, type, visibility);        
        this._references.push({ ref, data: initialValue });
        
        // Dispatch allocate event
        this._eventDispatcher?.('allocate', ref, initialValue);
        
        return ref;
    }

    
    // Gets the value for a given reference, or undefined if not found.
    get<T>(reference: TypedMemoryReference<T>): T | undefined {
        const loc = this._references.find(l => l.ref.id === reference.id);
        return (loc?.data as T) ?? undefined;
    }

    // Sets the value for a given reference. Throws if the reference is invalid.
    set<T>(reference: TypedMemoryReference<T>, value: T): void {
        const loc = this._references.find(l => l.ref.id === reference.id);
        if (!loc) {
            throw new Error(`Invalid memory reference: ${reference.id}`);
        }
        const oldValue = loc.data as T | undefined;
        loc.data = value;
        
        // Notify subscribers if value changed
        if (reference.hasSubscribers()) {
            reference.notifySubscribers(value, oldValue);
        }

        // Notify global subscribers (deprecated)
        this._globalSubscribers.forEach(callback => callback(reference, value, oldValue));
        
        // Dispatch set event
        this._eventDispatcher?.('set', reference, value, oldValue);
    }

    // Subscribe to all memory changes
    // @deprecated Use EventBus handlers instead
    subscribe(callback: (ref: IMemoryReference, value: unknown, oldValue: unknown) => void): () => void {
        this._globalSubscribers.add(callback);
        return () => {
            this._globalSubscribers.delete(callback);
        };
    }

    // Searches for references matching any non-null fields in the criteria object.
    search(criteria: Nullable<IMemoryReference>): IMemoryReference[] {
        return this._references
            .map(l => l.ref)
            .filter(ref => {
                if (criteria.id !== null && criteria.id !== undefined && criteria.id !== ref.id) return false;
                if (criteria.ownerId !== null && criteria.ownerId !== undefined && criteria.ownerId !== ref.ownerId) return false;
                if (criteria.type !== null && criteria.type !== undefined && criteria.type !== ref.type) return false;
                if (criteria.visibility !== null && criteria.visibility !== undefined && criteria.visibility !== ref.visibility) return false;
                return true;
            });
    }

    // Manually releases a memory reference.
    release(reference: IMemoryReference): void {
        const idx = this._references.findIndex(l => l.ref.id === reference.id);
        if (idx >= 0) {
            const loc = this._references[idx];
            const lastValue = loc.data;
            
            // If this is a TypedMemoryReference with subscribers, notify them before releasing
            const ref = loc.ref;
            if (ref instanceof TypedMemoryReference && ref.hasSubscribers()) {
                // Notify subscribers that the reference is being released
                ref.notifySubscribers(undefined, lastValue);
            }
            
            this._references.splice(idx, 1);
            
            // Dispatch release event
            this._eventDispatcher?.('release', reference, lastValue);
        }
    }
}
