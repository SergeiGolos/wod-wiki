import { IRuntimeMemory } from './IRuntimeMemory';
import { IMemoryReference } from './IMemoryReference';
import { IDebugMemoryView, DebugMemorySnapshot, DebugMemoryEntry, DebugMemoryHierarchy, DebugMemoryNode } from './IDebugMemoryView';
import { MemoryReference } from './MemoryReference';

/**
 * Concrete implementation of the runtime memory system.
 * Provides memory allocation, lifecycle management, and debugging capabilities.
 */
export class RuntimeMemory implements IRuntimeMemory {
    private _references: Map<string, MemoryReference> = new Map();
    private _ownerIndex: Map<string, Set<string>> = new Map();

    allocate<T>(type: string, ownerId: string, initialValue?: T, parent?: MemoryReference): IMemoryReference<T> {
        const id = this._generateId();
        const reference = new MemoryReference<T>(id, type, ownerId, this as any, initialValue, parent);
        
        this._references.set(id, reference);
        
        if (!this._ownerIndex.has(ownerId)) {
            this._ownerIndex.set(ownerId, new Set());
        }
        this._ownerIndex.get(ownerId)!.add(id);
        
        console.log(`🧠 RuntimeMemory.allocate() - Allocated ${type} memory [${id}] for owner ${ownerId}`);
        
        return reference;
    }

    getReference<T>(id: string): IMemoryReference<T> | undefined {
        const ref = this._references.get(id);
        return ref?.isValid() ? ref as IMemoryReference<T> : undefined;
    }

    release(reference: IMemoryReference): void {
        const memRef = reference as MemoryReference;
        if (memRef && this._references.has(reference.id)) {
            console.log(`🧠 RuntimeMemory.release() - Releasing memory [${reference.id}] and its children`);
            
            // Remove from owner index
            for (const [ownerId, refIds] of this._ownerIndex.entries()) {
                if (refIds.has(reference.id)) {
                    refIds.delete(reference.id);
                    if (refIds.size === 0) {
                        this._ownerIndex.delete(ownerId);
                    }
                    break;
                }
            }
            
            // Remove from main references map
            this._references.delete(reference.id);
            
            // Invalidate the reference (this will cascade to children)
            memRef._invalidate();
        }
    }

    getByOwner(ownerId: string): IMemoryReference[] {
        const refIds = this._ownerIndex.get(ownerId) || new Set();
        const references: IMemoryReference[] = [];
        
        for (const id of refIds) {
            const ref = this._references.get(id);
            if (ref?.isValid()) {
                references.push(ref);
            }
        }
        
        return references;
    }

    getAllReferences(): IMemoryReference[] {
        return Array.from(this._references.values()).filter(ref => ref.isValid());
    }

    searchReferences<T>(criteria: { ownerId?: string; type?: string }): IMemoryReference<T>[] {
        const results: IMemoryReference<T>[] = [];
        
        for (const [id, ref] of this._references.entries()) {
            if (!ref.isValid()) continue;
            
            // Check if this reference matches the criteria
            let matches = true;
            
            if (criteria.ownerId !== undefined) {
                // Find the owner of this reference
                let refOwnerId: string | undefined;
                for (const [ownerId, refIds] of this._ownerIndex.entries()) {
                    if (refIds.has(id)) {
                        refOwnerId = ownerId;
                        break;
                    }
                }
                if (refOwnerId !== criteria.ownerId) {
                    matches = false;
                }
            }
            
            if (criteria.type !== undefined && ref.type !== criteria.type) {
                matches = false;
            }
            
            if (matches) {
                results.push(ref as IMemoryReference<T>);
            }
        }
        
        return results;
    }

    clean(ownerId: string): void {
        const refIds = this._ownerIndex.get(ownerId);
        if (!refIds) return;
        
        console.log(`🧠 RuntimeMemory.clean() - Cleaning up all memory for owner ${ownerId}`);
        
        // Create a copy of the set to avoid modification during iteration
        const idsToRelease = Array.from(refIds);
        
        for (const id of idsToRelease) {
            const ref = this._references.get(id);
            if (ref) {
                this.release(ref);
            }
        }
        
        // Remove the owner from the index
        this._ownerIndex.delete(ownerId);
    }

    createSnapshot(): Record<string, any> {
        const snapshot: Record<string, any> = {};
        
        for (const [id, ref] of this._references.entries()) {
            if (ref.isValid()) {
                snapshot[id] = {
                    type: ref.type,
                    value: ref.get()
                };
            }
        }
        
        return snapshot;
    }

    // Convenience methods for debugging
    getMemorySnapshot(): DebugMemorySnapshot {
        const debugView = this.getDebugView();
        return debugView.getMemorySnapshot();
    }

    getByType(type: string): DebugMemoryEntry[] {
        const debugView = this.getDebugView();
        return debugView.getByType(type);
    }

    getMemoryHierarchy(): DebugMemoryHierarchy {
        const debugView = this.getDebugView();
        return debugView.getMemoryHierarchy();
    }

    /**
     * Creates a debug view that implements IDebugMemoryView
     */
    getDebugView(): IDebugMemoryView {
        return new RuntimeMemoryDebugView(this);
    }

    private _generateId(): string {
        return crypto.randomUUID();
    }
}

/**
 * Debug view implementation for RuntimeMemory
 */
class RuntimeMemoryDebugView implements IDebugMemoryView {
    constructor(private memory: RuntimeMemory) {}

    getMemorySnapshot(): DebugMemorySnapshot {
        const entries: DebugMemoryEntry[] = [];
        const byType: Record<string, number> = {};
        const byOwner: Record<string, number> = {};
        
        // Access private properties through type assertion
        const references = (this.memory as any)['_references'] as Map<string, MemoryReference>;
        const ownerIndex = (this.memory as any)['_ownerIndex'] as Map<string, Set<string>>;
        
        for (const [id, ref] of references.entries()) {
            if (ref.isValid()) {
                // Find owner
                let ownerId: string | undefined;
                for (const [owner, refIds] of ownerIndex.entries()) {
                    if (refIds.has(id)) {
                        ownerId = owner;
                        break;
                    }
                }
                
                const entry: DebugMemoryEntry = {
                    id,
                    type: ref.type,
                    ownerId,
                    value: ref.get(),
                    isValid: ref.isValid(),
                    children: ref._getChildren().map(child => child.id)
                };
                
                entries.push(entry);
                
                // Update counters
                byType[ref.type] = (byType[ref.type] || 0) + 1;
                if (ownerId) {
                    byOwner[ownerId] = (byOwner[ownerId] || 0) + 1;
                }
            }
        }
        
        return {
            timestamp: Date.now(),
            entries,
            totalAllocated: entries.length,
            summary: { byType, byOwner }
        };
    }

    getByType(type: string): DebugMemoryEntry[] {
        return this.getMemorySnapshot().entries.filter(entry => entry.type === type);
    }

    getByOwner(ownerId: string): DebugMemoryEntry[] {
        return this.getMemorySnapshot().entries.filter(entry => entry.ownerId === ownerId);
    }

    getMemoryHierarchy(): DebugMemoryHierarchy {
        const entries = this.getMemorySnapshot().entries;
        const entryMap = new Map<string, DebugMemoryEntry>();
        const roots: DebugMemoryNode[] = [];
        
        // Access private properties through type assertion
        const references = (this.memory as any)['_references'] as Map<string, MemoryReference>;
        
        // Create entry map for quick lookup
        for (const entry of entries) {
            entryMap.set(entry.id, entry);
        }
        
        // Build hierarchy
        const visited = new Set<string>();
        
        for (const entry of entries) {
            if (!visited.has(entry.id)) {
                const ref = references.get(entry.id);
                if (ref && !ref._getParent()) {
                    // This is a root node
                    const node = this._buildHierarchyNode(entry, entryMap, visited);
                    if (node) {
                        roots.push(node);
                    }
                }
            }
        }
        
        return { roots };
    }

    private _buildHierarchyNode(
        entry: DebugMemoryEntry, 
        entryMap: Map<string, DebugMemoryEntry>,
        visited: Set<string>
    ): DebugMemoryNode | null {
        if (visited.has(entry.id)) {
            return null;
        }
        
        visited.add(entry.id);
        
        const children: DebugMemoryNode[] = [];
        for (const childId of entry.children) {
            const childEntry = entryMap.get(childId);
            if (childEntry) {
                const childNode = this._buildHierarchyNode(childEntry, entryMap, visited);
                if (childNode) {
                    children.push(childNode);
                }
            }
        }
        
        return { entry, children };
    }
}