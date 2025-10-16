import { IBlockContext } from './IBlockContext';
import { IMemoryReference, TypedMemoryReference } from './IMemoryReference';
import { IScriptRuntime } from './IScriptRuntime';
import { MemoryTypeEnum } from './MemoryTypeEnum';
import { IAnchorValue } from './IAnchorValue';

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
        visibility: 'public' | 'private' = 'private'
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
        
        // Create new anchor with stable ID
        // Anchors use their semantic ID as the memory reference ID
        const anchorRef = new TypedMemoryReference<IAnchorValue>(
            this.runtime.memory,
            this.ownerId,
            MemoryTypeEnum.ANCHOR,
            'public'
        );
        
        // Override the auto-generated UUID with the stable anchor ID
        (anchorRef as any).id = anchorId;
        
        // Manually add to runtime memory since we're bypassing normal allocation
        (this.runtime.memory as any)._references.push({
            ref: anchorRef,
            data: undefined
        });
        
        this._references.push(anchorRef);
        return anchorRef;
    }
}
