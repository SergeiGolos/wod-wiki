import { BlockKey } from '../BlockKey';
import { IScriptRuntime } from './IScriptRuntime';
import { IRuntimeBehavior } from "./IRuntimeBehavior";
import { IRuntimeBlock } from './IRuntimeBlock';
import { IMemoryReference, TypedMemoryReference } from './IMemoryReference';
import { IRuntimeAction } from './IRuntimeAction';


export type AllocateRequest<T> = { 
    type: string; 
    visibility?: 'public' | 'private'; 
    initialValue?: T 
};

export class RuntimeBlock implements IRuntimeBlock{        
    protected readonly behaviors: IRuntimeBehavior[] = []
    public readonly key: BlockKey;    
    // Handlers and metrics are now stored as individual memory entries ('handler' and 'metric').
    private _memory: IMemoryReference[] = [];

    constructor(
        protected _runtime: IScriptRuntime,
        public readonly sourceId: number[] = [],
        behaviors: IRuntimeBehavior[] = []
    ) {         
        this.key = new BlockKey();
        this.behaviors = behaviors;
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
        // Call behavior disposal hooks
        for (const behavior of this.behaviors) {
            if (typeof (behavior as any).onDispose === 'function') {
                (behavior as any).onDispose(this._runtime, this);
            }
        }
        
        // Clean up all allocated memory references
        for (const memRef of this._memory) {
            this._runtime.memory.release(memRef);
        }
        console.log(`🧠 RuntimeBlock disposed: ${this.key.toString()}`);
    }

    /**
     * Gets a specific behavior by type from the behaviors array.
     * @param behaviorType Constructor/class of the behavior to find
     * @returns The behavior instance or undefined if not found
     */
    getBehavior<T extends IRuntimeBehavior>(behaviorType: new (...args: any[]) => T): T | undefined {
        return this.behaviors.find(b => b instanceof behaviorType) as T | undefined;
    }
}