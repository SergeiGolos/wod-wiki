import { BlockKey } from '../core/models/BlockKey';
import { IScriptRuntime } from './IScriptRuntime';
import { IRuntimeBehavior } from "./IRuntimeBehavior";
import { IRuntimeBlock } from './IRuntimeBlock';
import { IMemoryReference, TypedMemoryReference } from './IMemoryReference';
import { IRuntimeAction } from './IRuntimeAction';
import { NextBlockLogger } from './NextBlockLogger';
import { IBlockContext } from './IBlockContext';
import { BlockContext } from './BlockContext';


export type AllocateRequest<T> = { 
    type: string; 
    visibility?: 'public' | 'private'; 
    initialValue?: T 
};

export class RuntimeBlock implements IRuntimeBlock{
    protected readonly behaviors: IRuntimeBehavior[] = []
    public readonly key: BlockKey;
    public readonly blockType?: string;
    public readonly context: IBlockContext;
    // Handlers and metrics are now stored as individual memory entries ('handler' and 'metric').
    private _memory: IMemoryReference[] = [];

    constructor(
        protected _runtime: IScriptRuntime,
        public readonly sourceIds: number[] = [],
        behaviors: IRuntimeBehavior[] = [],
        contextOrBlockType?: IBlockContext | string,
        blockKey?: BlockKey,
        blockTypeParam?: string
    ) {
        // Handle backward compatibility: if contextOrBlockType is a string, it's the old blockType parameter
        if (typeof contextOrBlockType === 'string' || contextOrBlockType === undefined) {
            // Old signature: (runtime, sourceIds, behaviors, blockType)
            this.key = new BlockKey();
            this.blockType = contextOrBlockType;
            // Create a default context for backward compatibility
            this.context = new BlockContext(_runtime, this.key.toString());
        } else {
            // New signature: (runtime, sourceIds, behaviors, context, blockKey?, blockType?)
            this.key = blockKey ?? new BlockKey();
            this.context = contextOrBlockType;
            this.blockType = blockTypeParam;
        }
        
        this.behaviors = behaviors;
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
    mount(runtime: IScriptRuntime): IRuntimeAction[] {
        // Call behaviors
        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onPush?.(runtime, this);
            if (result) { actions.push(...result); }
        }
        
        return actions;
    }

    /**
     * Called when a child block completes execution.
     * Determines the next block(s) to execute or signals completion.
     */
    next(runtime: IScriptRuntime): IRuntimeAction[] {
        // Log behavior orchestration
        NextBlockLogger.logBehaviorOrchestration(
            this.key.toString(),
            this.behaviors.length
        );

        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onNext?.(runtime, this);
            if (result) { actions.push(...result); }
        }
        return actions;
    }

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic, manages result spans, and cleans up resources.
     */
    unmount(runtime: IScriptRuntime): IRuntimeAction[] {
        // Call behavior cleanup first
        const actions: IRuntimeAction[] = [];
         for (const behavior of this.behaviors) {
            const result = behavior?.onPop?.(runtime, this);
            if (result) { actions.push(...result); }
        }

        return actions;
    }

    dispose(runtime: IScriptRuntime): void {
        // Call behavior disposal hooks
        for (const behavior of this.behaviors) {
            if (typeof (behavior as any).onDispose === 'function') {
                (behavior as any).onDispose(runtime, this);
            }
        }
        
        // Clean up legacy memory references (for backward compatibility)
        for (const memRef of this._memory) {
            runtime.memory.release(memRef);
        }
        
        // NOTE: context.release() is NOT called here - it is the caller's responsibility
        // This allows behaviors to access memory during unmount() and disposal
        // Consumer MUST call block.context.release() after block.dispose()
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
