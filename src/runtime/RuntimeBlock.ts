import type { IMemoryReference, TypedMemoryReference } from './memory';
import { IResultSpanBuilder } from './ResultSpanBuilder';
import { IRuntimeLog } from './EventHandler';
import { BlockKey } from '../BlockKey';
import { IScriptRuntime } from './IScriptRuntime';
import { IBehavior } from './IBehavior';
import { RuntimeMetric } from './RuntimeMetric';
import { IRuntimeBlock } from './IRuntimeBlock';

/**
 * Base implementation for runtime blocks using the new Push/Next/Pop pattern.
 * All blocks extend this class and are based on behaviors with access to memory.
 * Combines functionality from BehavioralMemoryBlockBase and RuntimeBlockWithMemoryBase.
 */
export abstract class RuntimeBlock implements IRuntimeBlock{        
    public readonly behaviors: IBehavior[] = []
    public readonly key: BlockKey;    
    // Handlers and metrics are now stored as individual memory entries ('handler' and 'metric').
    private _memory: IMemoryReference[] = [];

    constructor(protected _runtime: IScriptRuntime, 
        protected initialMetrics: RuntimeMetric[] = [], 
        public readonly sourceId: string[] = []) 
    {         
        this.key = new BlockKey();
        console.log(`🧠 RuntimeBlock created: ${this.key.toString()}`);    
    }    
    
    /**
     * Allocates memory for this block's state.
     * The memory will be automatically cleaned up when the block is popped from the stack.
     */
    protected allocateMemory<T>(type: string, initialValue?: T, visibility: 'public' | 'private' = 'private'): TypedMemoryReference<T> {
        if (!this._runtime) {
            throw new Error(`Cannot allocate memory: runtime not set for block ${this.key.toString()}`);
        }

        const ref = this._runtime.memory.allocate<T>(type, this.key.toString(), initialValue, visibility);
        this._memory.push(ref);
        return ref;
    }


    /**
     * Called when this block is pushed onto the runtime stack.
     * Sets up initial state and registers event listeners.
     */
    push(runtime: IScriptRuntime): IRuntimeLog[] {
        // Then call behaviors
        const logs = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onPush?.(runtime, this);
            if (result) { logs.push(...result); }
        }
        
        return logs;
    }

    /**
     * Called when a child block completes execution.
     * Determines the next block(s) to execute or signals completion.
     */
    next(runtime: IScriptRuntime): IRuntimeLog[] {
        const logs = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onNext?.(runtime, this);
            if (result) { logs.push(...result); }
        }
        return logs;    
    }

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic, manages result spans, and cleans up resources.
     */
    pop(runtime: IScriptRuntime): IRuntimeLog[] {
        // Call behavior cleanup first
        const logs = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onPop?.(runtime, this);
            if (result) { logs.push(...result); }
        }

    

        // Then call parent cleanup (memory management)                        
        return logs;
    }

    dispose(): void {
        // Clean up all allocated memory references
        for (const memRef of this._memory) {
            this._runtime.memory.release(memRef);
        }
    }
}