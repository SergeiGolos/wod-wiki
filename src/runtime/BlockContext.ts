import { IBlockContext } from './contracts/IBlockContext';
import { IMemoryReference, TypedMemoryReference } from './contracts/IMemoryReference';
import { IScriptRuntime } from './contracts/IScriptRuntime';
import { MemoryTypeEnum } from './MemoryTypeEnum';
import { IAnchorValue } from './contracts/IAnchorValue';

/**
 * BlockContext implementation for runtime block memory management.
 * 
 * Responsibilities:
 * - Allocate and track memory references for a single block
 * - Provide type-safe access to allocated memory
 * - Clean up all memory on release
 * 
 * Lifecycle:
 * 1. Created by strategy with runtime and ownerId
 * 2. Strategy allocates memory via allocate()
 * 3. Memory references injected into behaviors
 * 4. Consumer calls release() after block disposal
 * 
 * @example
 * ```typescript
 * const context = new BlockContext(runtime, 'block-123');
 * const ref = context.allocate<number>('counter', 0, 'private');
 * // ... use ref in behaviors ...
 * context.release(); // Clean up
 * ```
 */
export class BlockContext implements IBlockContext {
    private _references: IMemoryReference[] = [];
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
}
