import { ICodeFragment, FragmentCollectionState, FragmentType } from '../core/models/CodeFragment';
import { BlockKey } from '../core/models/BlockKey';
import { MetricBehavior } from '../types/MetricBehavior';
import { IScriptRuntime } from './contracts/IScriptRuntime';
import { IRuntimeBehavior } from './contracts/IRuntimeBehavior';
import { BlockLifecycleOptions, IRuntimeBlock } from './contracts/IRuntimeBlock';
import { IRuntimeAction } from './contracts/IRuntimeAction';
import { IBlockContext } from './contracts/IBlockContext';
import { BlockContext } from './BlockContext';
import { IEventHandler } from './contracts/events/IEventHandler';
import { IEvent } from './contracts/events/IEvent';

export class RuntimeBlock implements IRuntimeBlock {
    protected readonly behaviors: IRuntimeBehavior[] = []
    public readonly key: BlockKey;
    public readonly blockType?: string;
    public readonly label: string;
    public readonly fragments: ICodeFragment[][];
    public readonly context: IBlockContext;
    public executionTiming: BlockLifecycleOptions = {};
    private _unsubscribers: Array<() => void> = [];
    private elapsedFragmentRecorded = false;

    constructor(
        protected _runtime: IScriptRuntime,
        public readonly sourceIds: number[] = [],
        behaviors: IRuntimeBehavior[] = [],
        contextOrBlockType?: IBlockContext | string,
        blockKey?: BlockKey,
        blockTypeParam?: string,
        label?: string,
        fragments?: ICodeFragment[][]
    ) {
        // Handle backward compatibility: if contextOrBlockType is a string, it's the old blockType parameter
        if (typeof contextOrBlockType === 'string' || contextOrBlockType === undefined) {
            // Old signature: (runtime, sourceIds, behaviors, blockType)
            this.key = new BlockKey();
            this.blockType = contextOrBlockType as string | undefined;
            this.label = label || (contextOrBlockType as string) || 'Block';
            this.fragments = fragments ?? [];
            // Create a default context for backward compatibility
            this.context = new BlockContext(_runtime, this.key.toString());
        } else {
            // New signature: (runtime, sourceIds, behaviors, context, blockKey?, blockType?, label?)
            this.key = blockKey ?? new BlockKey();
            this.context = contextOrBlockType;
            this.blockType = blockTypeParam;
            this.label = label || blockTypeParam || 'Block';
            this.fragments = fragments ?? [];
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
                // Determine if this block is active.
                // Standard behavior onEvent is only called for the active block.
                // Global listeners should be registered separately (e.g. via SubscribeEventAction).
                if (runtime.stack.current !== this) {
                    return [];
                }

                const actions: IRuntimeAction[] = [];
                for (const behavior of this.behaviors) {
                    if (behavior.onEvent) {
                        const result = behavior.onEvent(event, this);
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
     * Called when this block is pushed onto the runtime stack.
     * Sets up initial state and registers event listeners.
     */
    mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        const startTime = options?.startTime ?? runtime.clock.now;
        const mountOptions: BlockLifecycleOptions = {
            ...options,
            startTime,
        };
        this.executionTiming.startTime = startTime;

        // Call behaviors
        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onPush?.(this, mountOptions);
            if (result) { actions.push(...result); }
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
        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onNext?.(this, nextOptions);
            if (result) { actions.push(...result); }
        }
        return actions;
    }

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic, manages result spans, and cleans up resources.
     */
    unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        const completedAt = options?.completedAt ?? runtime.clock.now;
        const unmountOptions: BlockLifecycleOptions = {
            ...options,
            completedAt,
        };
        this.executionTiming.completedAt = completedAt;

        // Attach an elapsed-time fragment and metric when completion timing is available.
        this.recordElapsedTimeArtifact();

        // Call behavior cleanup first
        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onPop?.(this, unmountOptions);
            if (result) { actions.push(...result); }
        }

        return actions;
    }

    dispose(runtime: IScriptRuntime): void {
        // Call behavior disposal hooks
        for (const behavior of this.behaviors) {
            if (behavior.onDispose) {
                behavior.onDispose(this);
            }
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

    findFragment<T extends ICodeFragment = ICodeFragment>(
        type: FragmentType,
        predicate?: (f: ICodeFragment) => boolean
    ): T | undefined {
        for (const group of this.fragments) {
            const found = group.find(f => f.fragmentType === type && (!predicate || predicate(f)));
            if (found) return found as T;
        }
        return undefined;
    }

    filterFragments<T extends ICodeFragment = ICodeFragment>(
        type: FragmentType
    ): T[] {
        const result: T[] = [];
        for (const group of this.fragments) {
            const found = group.filter(f => f.fragmentType === type);
            result.push(...(found as T[]));
        }
        return result;
    }

    hasFragment(type: FragmentType): boolean {
        return this.fragments.some(group => group.some(f => f.fragmentType === type));
    }

    /**
     * Append fragments to a specific group, creating it if missing.
     */
    protected appendFragments(newFragments: ICodeFragment[], groupIndex = 0): void {
        const target = this.ensureFragmentGroup(groupIndex);
        target.push(...newFragments);
    }

    private ensureFragmentGroup(index: number): ICodeFragment[] {
        if (!this.fragments[index]) {
            // Ensure all intermediate groups exist
            while (this.fragments.length <= index) {
                this.fragments.push([]);
            }
        }
        return this.fragments[index];
    }

    private recordElapsedTimeArtifact(): void {
        if (this.elapsedFragmentRecorded) {
            return;
        }

        const startMs = this.executionTiming.startTime?.getTime();
        const endMs = this.executionTiming.completedAt?.getTime();
        if (startMs === undefined || endMs === undefined) {
            return;
        }

        const elapsedMs = Math.max(0, endMs - startMs);
        const fragment: ICodeFragment = {
            type: 'duration',
            fragmentType: FragmentType.Timer,
            value: elapsedMs,
            collectionState: FragmentCollectionState.RuntimeGenerated,
            behavior: MetricBehavior.Recorded,
        };

        // Prefer to append to the last group, otherwise create the first group.
        const targetGroup = this.fragments.length > 0 ? this.fragments.length - 1 : 0;
        this.appendFragments([fragment], targetGroup);
        this.elapsedFragmentRecorded = true;
    }
}
