import { BlockKey } from '../core/models/BlockKey';
import { IScriptRuntime } from './IScriptRuntime';
import { IRuntimeBehavior } from "./IRuntimeBehavior";
import { BlockLifecycleOptions, IRuntimeBlock } from './IRuntimeBlock';
import { IMemoryReference, TypedMemoryReference } from './IMemoryReference';
import { IRuntimeAction } from './IRuntimeAction';
import { NextBlockLogger } from './NextBlockLogger';
import { IBlockContext } from './IBlockContext';
import { BlockContext } from './BlockContext';
import { IEventHandler } from './IEventHandler';
import { IEvent } from './IEvent';
import { RuntimeMetric } from './RuntimeMetric';
import { PushCardDisplayAction, PopCardDisplayAction } from './actions/CardDisplayActions';
import { TimerBehavior } from './behaviors/TimerBehavior';
import { LoopCoordinatorBehavior } from './behaviors/LoopCoordinatorBehavior';
import { captureRuntimeTimestamp } from './RuntimeClock';


export type AllocateRequest<T> = { 
    type: string; 
    visibility?: 'public' | 'private'; 
    initialValue?: T 
};

export class RuntimeBlock implements IRuntimeBlock{
    protected readonly behaviors: IRuntimeBehavior[] = []
    public readonly key: BlockKey;
    public readonly blockType?: string;
    public readonly label: string;
    public readonly compiledMetrics?: RuntimeMetric;
    public readonly context: IBlockContext;
    public executionTiming: BlockLifecycleOptions = {};
    private _memory: IMemoryReference[] = [];
    private _unsubscribers: Array<() => void> = [];

    constructor(
        protected _runtime: IScriptRuntime,
        public readonly sourceIds: number[] = [],
        behaviors: IRuntimeBehavior[] = [],
        contextOrBlockType?: IBlockContext | string,
        blockKey?: BlockKey,
        blockTypeParam?: string,
        label?: string,
        compiledMetrics?: RuntimeMetric
    ) {
        // Handle backward compatibility: if contextOrBlockType is a string, it's the old blockType parameter
        if (typeof contextOrBlockType === 'string' || contextOrBlockType === undefined) {
            // Old signature: (runtime, sourceIds, behaviors, blockType)
            this.key = new BlockKey();
            this.blockType = contextOrBlockType as string | undefined;
            this.label = label || (contextOrBlockType as string) || 'Block';
            this.compiledMetrics = compiledMetrics;
            // Create a default context for backward compatibility
            this.context = new BlockContext(_runtime, this.key.toString());
        } else {
            // New signature: (runtime, sourceIds, behaviors, context, blockKey?, blockType?, label?, compiledMetrics?)
            this.key = blockKey ?? new BlockKey();
            this.context = contextOrBlockType;
            this.blockType = blockTypeParam;
            this.label = label || blockTypeParam || 'Block';
            this.compiledMetrics = compiledMetrics;
        }
        
        this.behaviors = behaviors;

        // Register default 'next' handler to bridge explicit next events to block.next()
        this.registerDefaultHandler();
        
        // Register event dispatcher to route events to behaviors
        this.registerEventDispatcher();
    }

    private registerDefaultHandler() {
        const handler: IEventHandler = {
            id: `handler-tick-${this.key.toString()}`,
            name: `TickHandler-${this.label}`,
            handler: (event: IEvent, runtime: IScriptRuntime) => {
                // Only handle explicit next events
                if (event.name !== 'next') return [];
                
                // Only handle if this is the current block
                if (runtime.stack.current !== this) return [];
                
                // Delegate to next() method for state updates
                return this.next(runtime);
            }
        };

        // Register with event bus (guarded for test stubs without eventBus)
        const unsub = this._runtime?.eventBus?.register?.('next', handler, this.key.toString());
        if (unsub) {
            this._unsubscribers.push(unsub);
        }
    }

    private registerEventDispatcher() {
        const handler: IEventHandler = {
            id: `dispatcher-${this.key.toString()}`,
            name: `EventDispatcher-${this.label}`,
            handler: (event: IEvent, runtime: IScriptRuntime) => {
                const actions: IRuntimeAction[] = [];
                for (const behavior of this.behaviors) {
                    if (behavior.onEvent) {
                        const result = behavior.onEvent(event, runtime, this);
                        if (result) {
                            actions.push(...result);
                        }
                    }
                }
                return actions;
            }
        };

        const unsub = this._runtime?.eventBus?.register?.('*', handler, this.key.toString());
        if (unsub) {
            this._unsubscribers.push(unsub);
        }
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
    mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        const mountOptions: BlockLifecycleOptions = {
            ...options,
            startTime: captureRuntimeTimestamp(runtime.clock, options?.startTime),
        };
        this.executionTiming.startTime = mountOptions.startTime;

        // Call behaviors
        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onPush?.(runtime, this, mountOptions);
            if (result) { actions.push(...result); }
        }

        // If no TimerBehavior is present but we have metrics, push a default activity card
        // This ensures blocks like "10 Pushups" (which have no timer) still show up in the UI
        // BUT: Don't push cards for container/parent blocks (those with LoopCoordinatorBehavior)
        // Container blocks manage children and shouldn't show as "current exercise"
        const hasLoopCoordinator = this.getBehavior(LoopCoordinatorBehavior);
        if (!this.getBehavior(TimerBehavior) && !hasLoopCoordinator && this.compiledMetrics) {
            actions.push(new PushCardDisplayAction({
                id: `card-${this.key}`,
                ownerId: this.key.toString(),
                type: 'active-block',
                title: this.label,
                subtitle: this.blockType,
                metrics: this.compiledMetrics.values.map(m => ({
                    type: m.type,
                    value: m.value ?? 0,
                    unit: m.unit,
                    isActive: true
                }))
            }));
        }
        
        return actions;
    }

    /**
     * Called when a child block completes execution.
     * Determines the next block(s) to execute or signals completion.
     */
    next(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        const nextOptions = { ...options };
        if (nextOptions.completedAt) {
            this.executionTiming.completedAt = nextOptions.completedAt;
        }
        // Log behavior orchestration
        NextBlockLogger.logBehaviorOrchestration(
            this.key.toString(),
            this.behaviors.length
        );

        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onNext?.(runtime, this, nextOptions);
            if (result) { actions.push(...result); }
        }
        return actions;
    }

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic, manages result spans, and cleans up resources.
     */
    unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        const unmountOptions: BlockLifecycleOptions = {
            ...options,
            completedAt: captureRuntimeTimestamp(runtime.clock, options?.completedAt),
        };
        this.executionTiming.completedAt = unmountOptions.completedAt;

        // Call behavior cleanup first
        const actions: IRuntimeAction[] = [];
         for (const behavior of this.behaviors) {
            const result = behavior?.onPop?.(runtime, this, unmountOptions);
            if (result) { actions.push(...result); }
        }

        // Pop the default card if we pushed one (only for leaf blocks)
        const hasLoopCoordinator = this.getBehavior(LoopCoordinatorBehavior);
        if (!this.getBehavior(TimerBehavior) && !hasLoopCoordinator && this.compiledMetrics) {
            actions.push(new PopCardDisplayAction(`card-${this.key}`));
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
        // Unsubscribe from event bus
        for (const unsub of this._unsubscribers) {
            try { unsub(); } catch (error) { console.error('Error unsubscribing handler', error); }
        }
        this._unsubscribers = [];
        
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
