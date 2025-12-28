import { IBlockContext, MemoryEventCallback, MemoryEventType } from './contracts/IBlockContext';
import { IMemoryReference, TypedMemoryReference } from './contracts/IMemoryReference';
import { IScriptRuntime } from './contracts/IScriptRuntime';
import { MemoryTypeEnum } from './models/MemoryTypeEnum';
import { IAnchorValue } from './contracts/IAnchorValue';
import { IEvent } from './contracts/events/IEvent';
import { MemoryAllocateEvent, MemorySetEvent, MemoryReleaseEvent } from './events/MemoryEvents';

/**
 * Internal subscription record for tracking event callbacks.
 */
interface SubscriptionRecord {
    eventType: MemoryEventType | 'any';
    callback: MemoryEventCallback;
    unsubscribe: () => void;
}

/**
 * BlockContext implementation for runtime block memory management.
 * 
 * Responsibilities:
 * - Allocate and track memory references for a single block
 * - Provide type-safe access to allocated memory
 * - Subscribe to memory events scoped to this block's references
 * - Clean up all memory and subscriptions on release
 * 
 * Lifecycle:
 * 1. Created by strategy with runtime and ownerId
 * 2. Strategy allocates memory via allocate()
 * 3. Memory references injected into behaviors
 * 4. Behaviors can subscribe to memory events via onSet(), onAllocate(), etc.
 * 5. Consumer calls release() after block disposal - cleans up memory and subscriptions
 * 
 * @example
 * ```typescript
 * const context = new BlockContext(runtime, 'block-123');
 * const ref = context.allocate<number>('counter', 0, 'private');
 * 
 * // Subscribe to value changes
 * context.onSet((ref, value, oldValue) => {
 *   console.log('Value changed:', value);
 * });
 * 
 * // ... use ref in behaviors ...
 * context.release(); // Clean up memory and subscriptions
 * ```
 */
export class BlockContext implements IBlockContext {
    private _references: IMemoryReference[] = [];
    private _subscriptions: SubscriptionRecord[] = [];
    private _released = false;
    
    constructor(
        private readonly runtime: IScriptRuntime,
        public readonly ownerId: string,
        public readonly exerciseId: string = '',
        initialReferences: IMemoryReference[] = []
    ) {
        this._references = [...initialReferences];
    }
    
    get references(): ReadonlyArray<IMemoryReference> {
        return [...this._references];
    }
    
    allocate<T>(
        type: MemoryTypeEnum | string, 
        initialValue?: T, 
        visibility: 'public' | 'private' | 'inherited' = 'private'
    ): TypedMemoryReference<T> {
        if (this._released) {
            throw new Error(
                `Cannot allocate on released context (ownerId: ${this.ownerId})`
            );
        }
        
        // Convert enum to string for storage (enums are strings in runtime)
        const typeStr = type as string;
        
        const ref = this.runtime.memory.allocate<T>(
            typeStr, 
            this.ownerId, 
            initialValue, 
            visibility
        );
        
        this._references.push(ref);
        return ref;
    }
    
    get<T>(type: MemoryTypeEnum | string): TypedMemoryReference<T> | undefined {
        const typeStr = type as string;
        const ref = this._references.find(r => r.type === typeStr);
        return ref as TypedMemoryReference<T> | undefined;
    }
    
    getAll<T>(type: MemoryTypeEnum | string): TypedMemoryReference<T>[] {
        const typeStr = type as string;
        return this._references.filter(
            r => r.type === typeStr
        ) as TypedMemoryReference<T>[];
    }
    
    release(): void {
        if (this._released) {
            return; // Idempotent
        }
        
        // Clean up all subscriptions first
        for (const subscription of this._subscriptions) {
            subscription.unsubscribe();
        }
        this._subscriptions = [];
        
        // Then release memory
        for (const ref of this._references) {
            this.runtime.memory.release(ref);
        }
        
        this._references = [];
        this._released = true;
    }
    
    isReleased(): boolean {
        return this._released;
    }
    
    getOrCreateAnchor(anchorId: string): TypedMemoryReference<IAnchorValue> {
        if (this._released) {
            throw new Error(
                `Cannot access anchor on released context (ownerId: ${this.ownerId})`
            );
        }
        
        // Search for existing anchor with this ID (across all owners)
        const existingRefs = this.runtime.memory.search({
            id: anchorId,
            type: MemoryTypeEnum.ANCHOR,
            ownerId: null,
            visibility: null
        });
        
        if (existingRefs.length > 0) {
            const anchorRef = existingRefs[0] as TypedMemoryReference<IAnchorValue>;
            
            // Add to our references if not already tracked
            if (!this._references.find(r => r.id === anchorRef.id)) {
                this._references.push(anchorRef);
            }
            
            return anchorRef;
        }
        
        // Create new anchor using the runtime's memory allocation system
        // We use 'public' visibility so it can be shared
        const anchorRef = this.runtime.memory.allocate<IAnchorValue>(
            MemoryTypeEnum.ANCHOR,
            this.ownerId,
            undefined, // No initial value
            'public'
        );
        
        // Ensure the ID matches the requested anchorId for consistent lookup
        // This relies on the memory implementation allowing ID mutation or pre-allocation
        // For now, we manually override to maintain contract with getOrCreateAnchor semantics
        // TypedMemoryReference has a mutable public id property
        // TODO: Consider adding a proper setter method or allocate parameter for ID
        anchorRef.id = anchorId;
        
        this._references.push(anchorRef);
        return anchorRef;
    }
    
    onAllocate<T = unknown>(callback: MemoryEventCallback<T>): () => void {
        return this.subscribeToEvent('allocate', callback);
    }
    
    onSet<T = unknown>(callback: MemoryEventCallback<T>): () => void {
        return this.subscribeToEvent('set', callback);
    }
    
    onRelease<T = unknown>(callback: MemoryEventCallback<T>): () => void {
        return this.subscribeToEvent('release', callback);
    }
    
    onAny<T = unknown>(callback: MemoryEventCallback<T>): () => void {
        return this.subscribeToEvent('any', callback);
    }
    
    /**
     * Internal helper to subscribe to memory events via EventBus.
     * Filters events to only those with matching ownerId.
     */
    private subscribeToEvent<T>(
        eventType: MemoryEventType | 'any',
        callback: MemoryEventCallback<T>
    ): () => void {
        if (this._released) {
            throw new Error(
                `Cannot subscribe on released context (ownerId: ${this.ownerId})`
            );
        }
        
        // Determine which event names to listen to
        const eventNames = eventType === 'any'
            ? ['memory:allocate', 'memory:set', 'memory:release']
            : [`memory:${eventType}`];
        
        // Create unsubscribe functions for each event name
        const unsubscribeFunctions: (() => void)[] = [];
        
        for (const eventName of eventNames) {
            const unsubscribe = this.runtime.eventBus.on(
                eventName,
                (event: IEvent) => {
                    // Filter by ownerId - only invoke callback for this context's references
                    const memoryEvent = event as MemoryAllocateEvent | MemorySetEvent | MemoryReleaseEvent;
                    if (memoryEvent.data.ref.ownerId !== this.ownerId) {
                        return;
                    }
                    
                    // Extract values based on event type
                    const { ref } = memoryEvent.data;
                    
                    // Handle different event types with their specific value properties
                    let value: unknown;
                    let oldValue: unknown;
                    
                    if ('lastValue' in memoryEvent.data) {
                        // MemoryReleaseEvent
                        value = (memoryEvent.data as MemoryReleaseEvent['data']).lastValue;
                    } else if ('value' in memoryEvent.data) {
                        // MemoryAllocateEvent or MemorySetEvent
                        value = (memoryEvent.data as MemoryAllocateEvent['data']).value;
                    }
                    
                    if ('oldValue' in memoryEvent.data) {
                        // MemorySetEvent
                        oldValue = (memoryEvent.data as MemorySetEvent['data']).oldValue;
                    }
                    
                    callback(ref, value as T, oldValue as T | undefined);
                },
                this.ownerId
            );
            
            unsubscribeFunctions.push(unsubscribe);
        }
        
        // Combined unsubscribe function
        const combinedUnsubscribe = () => {
            for (const unsub of unsubscribeFunctions) {
                unsub();
            }
            // Remove from our subscriptions list
            // Note: Using findIndex is O(n) but acceptable since:
            // 1. Number of subscriptions per context is typically very small (1-5)
            // 2. This only runs on manual unsubscribe, which is rare
            const idx = this._subscriptions.findIndex(s => s.unsubscribe === combinedUnsubscribe);
            if (idx >= 0) {
                this._subscriptions.splice(idx, 1);
            }
        };
        
        // Track the subscription for cleanup on release
        this._subscriptions.push({
            eventType,
            callback: callback as MemoryEventCallback,
            unsubscribe: combinedUnsubscribe
        });
        
        return combinedUnsubscribe;
    }
}
