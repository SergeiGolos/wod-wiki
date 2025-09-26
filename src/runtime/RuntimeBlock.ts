import { IRuntimeLog } from './EventHandler';
import { BlockKey } from '../BlockKey';
import { IScriptRuntime } from './IScriptRuntime';
import { IRuntimeBehavior } from "./IRuntimeBehavior";
import { RuntimeMetric } from './RuntimeMetric';
import { IRuntimeBlock } from './IRuntimeBlock';
import { IMemoryReference, TypedMemoryReference } from './IMemoryReference';
import { IRuntimeAction } from './IRuntimeAction';

/**
 * Base implementation for runtime blocks using the new Push/Next/Pop pattern.
 * All blocks extend this class and are based on behaviors with access to memory.
 * Combines functionality from BehavioralMemoryBlockBase and RuntimeBlockWithMemoryBase.
 */

export type AllocateRequest<T> = { 
    type: string; 
    visibility?: 'public' | 'private'; 
    initialValue?: T 
};

export abstract class RuntimeBlock implements IRuntimeBlock{        
    protected readonly behaviors: IRuntimeBehavior[] = []
    public readonly key: BlockKey;    
    // Handlers and metrics are now stored as individual memory entries ('handler' and 'metric').
    private _memory: IMemoryReference[] = [];

    constructor(protected _runtime: IScriptRuntime, 
        protected initialMetrics: RuntimeMetric[] = [], 
        public readonly sourceId: number[] = []) 
    {         
        this.key = new BlockKey();
        console.log(`🧠 RuntimeBlock created: ${this.key.toString()}`);    
    }    
    
    /**
     * Allocates memory for this block's state.
     * The memory will be automatically cleaned up when the block is popped from the stack.
     */
    protected allocate<T>(request: AllocateRequest<T>): TypedMemoryReference<T> {
        if (!this._runtime) {
            throw new Error(`Cannot allocate memory: runtime not set for block ${this.key.toString()}`);
        }

        const ref = this._runtime.memory.allocate<T>(request.type, this.key.toString(), request.initialValue, request.visibility || 'private');
        this._memory.push(ref);
        return ref;
    }


    /**
     * Called when this block is pushed onto the runtime stack.
     * Sets up initial state and registers event listeners.
     */
    push(): IRuntimeAction[] {
        // Then call behaviors
        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onPush?.(this._runtime, this);
            if (result) { actions.push(...result); }
        }
        
        return actions;
    }

    /**
     * Called when a child block completes execution.
     * Determines the next block(s) to execute or signals completion.
     */
    next(): IRuntimeAction[] {
        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onNext?.(this._runtime, this);
            if (result) { actions.push(...result); }
        }
        return actions;
    }

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic, manages result spans, and cleans up resources.
     */
    pop(): IRuntimeAction[] {
        // Call behavior cleanup first
        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onPop?.(this._runtime, this);
            if (result) { actions.push(...result); }
        }
        
        return actions;
    }

    dispose(): void {
        // Clean up all allocated memory references
        for (const memRef of this._memory) {
            this._runtime.memory.release(memRef);
        }
    }
}