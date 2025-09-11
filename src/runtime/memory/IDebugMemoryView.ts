/**
 * Interface for debugging tools that allows independent viewing of memory state.
 * This provides a way to inspect runtime memory without interfering with execution.
 */
export interface IDebugMemoryView {
    /**
     * Gets a read-only snapshot of all memory references and their values.
     * This is safe to call from debugging tools without affecting execution.
     */
    getMemorySnapshot(): DebugMemorySnapshot;
    
    /**
     * Gets memory references filtered by type.
     * Useful for debugging specific kinds of runtime data.
     */
    getByType(type: string): DebugMemoryEntry[];
    
    /**
     * Gets memory references owned by a specific component/block.
     * Useful for understanding what memory a particular block is using.
     */
    getByOwner(ownerId: string): DebugMemoryEntry[];
    
    /**
     * Gets the memory hierarchy showing parent-child relationships.
     * This helps understand how memory is organized and allocated.
     */
    getMemoryHierarchy(): DebugMemoryHierarchy;
}

/**
 * A read-only view of a memory reference for debugging purposes.
 */
export interface DebugMemoryEntry {
    readonly id: string;
    readonly type: string;
    readonly ownerId?: string;
    readonly value: any;
    readonly isValid: boolean;
    readonly children: string[]; // IDs of child references
}

/**
 * A complete snapshot of the memory state at a point in time.
 */
export interface DebugMemorySnapshot {
    readonly timestamp: number;
    readonly entries: DebugMemoryEntry[];
    readonly totalAllocated: number;
    readonly summary: {
        byType: Record<string, number>;
        byOwner: Record<string, number>;
    };
}

/**
 * Represents the hierarchical structure of memory allocations.
 */
export interface DebugMemoryHierarchy {
    readonly roots: DebugMemoryNode[];
}

/**
 * A node in the memory hierarchy tree.
 */
export interface DebugMemoryNode {
    readonly entry: DebugMemoryEntry;
    readonly children: DebugMemoryNode[];
}