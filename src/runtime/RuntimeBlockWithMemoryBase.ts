import { BlockKey } from '../BlockKey';
import { IRuntimeBlock } from './IRuntimeBlock';
import { IRuntimeBlockWithMemory } from './IRuntimeBlockWithMemory';
import { IScriptRuntime } from './IScriptRuntime';
import { IRuntimeLog } from './EventHandler';
import type { IMemoryReference, TypedMemoryReference } from './memory';

/**
 * Base implementation for runtime blocks that require memory access.
 * Provides memory allocation, management, and cleanup functionality.
 * This is the foundation class that provides core push/next/pop behavior with memory management.
 */
export abstract class RuntimeBlockWithMemoryBase implements IRuntimeBlock, IRuntimeBlockWithMemory {
    private _memory: IMemoryReference[] = [];
    private _runtime?: IScriptRuntime;

    constructor(public readonly key: BlockKey, public readonly sourceId: string[] = []) {
        console.log(`🧠 RuntimeBlockWithMemoryBase created: ${key.toString()}`);
    }

    /**
     * Memory references allocated by this block.
     * These will be automatically cleaned up when the block is removed from the stack.
     */
    get memory(): IMemoryReference[] {
        return [...this._memory]; // Return copy to prevent external mutation
    }

    /**
     * Sets the runtime instance for this block.
     * This is typically called by the ScriptRuntime when the block is pushed.
     */
    setRuntime(runtime: IScriptRuntime): void {
        this._runtime = runtime;
    }

    /**
     * Allocates memory for this block's state.
     * The memory will be automatically cleaned up when the block is popped from the stack.
     */
    allocateMemory<T>(type: string, initialValue?: T, visibility: 'public' | 'private' = 'private'): TypedMemoryReference<T> {
        if (!this._runtime) {
            throw new Error(`Cannot allocate memory: runtime not set for block ${this.key.toString()}`);
        }

        const ref = this._runtime.memory.allocate<T>(type, this.key.toString(), initialValue, undefined, visibility);
        
        // Add a get/set methods to the reference that use the runtime memory
        (ref as any).get = () => this._runtime!.memory.get<T>(ref);
        (ref as any).set = (value: T) => this._runtime!.memory.set<T>(ref, value);
        
        this._memory.push(ref);
        return ref;
    }

    /**
     * Gets a memory reference by type.
     * Returns the first memory reference of the specified type owned by this block.
     */
    getMemory<T>(type: string): IMemoryReference<T> | undefined {
        return this._memory.find(ref => ref.type === type) as IMemoryReference<T> | undefined;
    }

    /**
     * Called when the block is being removed from the stack.
     * This is an opportunity for the block to perform cleanup before its memory is released.
     * Override this method in derived classes to add custom cleanup logic.
     */
    onMemoryCleanup?(): void;

    /**
     * Called when this block is pushed onto the runtime stack.
     * Sets up initial state and registers event listeners.
     * Override this method in derived classes to add custom push logic.
     */
    push(runtime: IScriptRuntime): IRuntimeLog[] {
        // Call initializeMemory if it exists in derived class
        if (typeof (this as any).initializeMemory === 'function') {
            (this as any).initializeMemory();
        }
        
        // Allocate initial handlers to memory if createInitialHandlers exists
        if (typeof (this as any).createInitialHandlers === 'function') {
            const handlers = (this as any).createInitialHandlers();
            for (const handler of handlers) {
                this.allocateMemory('handler', handler, 'private');
            }
        }
        
        // Allocate span builder to memory if createSpansBuilder exists
        if (typeof (this as any).createSpansBuilder === 'function') {
            const spanBuilder = (this as any).createSpansBuilder();
            this.allocateMemory('span-builder', spanBuilder, 'private');
        }
        
        // Base implementation - derived classes should override
        return [];
    }

    /**
     * Called when a child block completes execution.
     * Determines the next block(s) to execute or signals completion.
     * Override this method in derived classes to add custom next logic.
     */
    next(runtime: IScriptRuntime): IRuntimeLog[] {
        // Base implementation - derived classes should override
        return [];    
    }

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic, manages result spans, and cleans up resources.
     */
    pop(runtime: IScriptRuntime): IRuntimeLog[] {
        // Call custom cleanup if defined
        if (this.onMemoryCleanup) {
            this.onMemoryCleanup();
        }

        // Release all allocated memory
        for (const ref of this._memory) {
            runtime.memory.release(ref);
        }
        this._memory = [];

        // Base implementation - derived classes should override for additional cleanup
        return [];
    }
}