import { ICodeFragment, FragmentCollectionState, FragmentType } from '../core/models/CodeFragment';
import { BlockKey } from '../core/models/BlockKey';
import { MetricBehavior } from '../types/MetricBehavior';
import { IScriptRuntime } from './contracts/IScriptRuntime';
import { IRuntimeBehavior } from './contracts/IRuntimeBehavior';
import { PRIORITY_DEFAULT } from './contracts/BehaviorPriority';
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
        
        // Sort behaviors by priority (lower = earlier execution)
        // This ensures deterministic execution order and prevents order-dependent bugs
        this.behaviors.sort((a, b) => {
            const priorityA = a.priority ?? PRIORITY_DEFAULT;
            const priorityB = b.priority ?? PRIORITY_DEFAULT;
            return priorityA - priorityB;
        });

        // Validate behavior dependencies (required/conflicting behaviors)
        // Catches configuration errors at construction time rather than runtime
        this.validateBehaviorDependencies();

        // Register default 'next' handler to bridge explicit next events to block.next()
        this.registerDefaultHandler();

        // Register event dispatcher to route events to behaviors
        this.registerEventDispatcher();
    }

    /**
     * Validates behavior dependencies at construction time.
     * Checks that required behaviors are present and conflicting behaviors are absent.
     * 
     * @throws Error if a required behavior is missing or a conflicting behavior is present
     * @private
     */
    private validateBehaviorDependencies(): void {
        for (const behavior of this.behaviors) {
            // Check required behaviors
            if (behavior.requiredBehaviors) {
                for (const required of behavior.requiredBehaviors) {
                    const found = this.behaviors.some(b => b instanceof required);
                    if (!found) {
                        throw new Error(
                            `Behavior ${behavior.constructor.name} requires ` +
                            `${required.name} but it is not present in block "${this.label}"`
                        );
                    }
                }
            }
            
            // Check conflicting behaviors
            if (behavior.conflictingBehaviors) {
                for (const conflict of behavior.conflictingBehaviors) {
                    const found = this.behaviors.some(b => b instanceof conflict);
                    if (found) {
                        throw new Error(
                            `Behavior ${behavior.constructor.name} conflicts with ` +
                            `${conflict.name} in block "${this.label}"`
                        );
                    }
                }
            }
        }
    }

    private registerDefaultHandler() {
        // Note: 'next' event handling is done via NextAction which is triggered by NextEventHandler.
        // This handler is kept for backwards compatibility but should not process 'next' events
        // since NextAction already calls block.next() directly.
        const handler: IEventHandler = {
            id: `handler-tick-${this.key.toString()}`,
            name: `TickHandler-${this.label}`,
            handler: (event: IEvent, _runtime: IScriptRuntime) => {
                // Skip 'next' events - handled by NextAction via NextEventHandler
                if (event.name === 'next') return [];

                // Note: No manual active block check needed here.
                // The EventBus filters handlers by scope automatically.
                // This handler uses 'active' scope (default), so it only fires
                // when this block is the current block on the stack.

                return [];
            }
        };

        // Register with event bus using default 'active' scope
        // Handler only fires when this block is the current block on the stack
        const unsub = this._runtime?.eventBus?.register?.('next', handler, this.key.toString());
        if (unsub) {
            this._unsubscribers.push(unsub);
        }
    }

    private registerEventDispatcher() {
        const handler: IEventHandler = {
            id: `dispatcher-${this.key.toString()}`,
            name: `EventDispatcher-${this.label}`,
            handler: (event: IEvent, _runtime: IScriptRuntime) => {
                // Note: No manual active block check needed here.
                // The EventBus filters handlers by scope automatically.
                // This handler uses 'active' scope (default), so it only fires
                // when this block is the current block on the stack.

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

        // Register with event bus using default 'active' scope
        // Handler only fires when this block is the current block on the stack
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
        this.executionTiming.startTime = startTime;

        // Call behaviors
        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onPush?.(this, runtime.clock);
            if (result) { actions.push(...result); }
        }

        return actions;
    }

    /**
     * Called when a child block completes execution.
     * Determines the next block(s) to execute or signals completion.
     */
    next(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        if (options?.completedAt) {
            this.executionTiming.completedAt = options.completedAt;
        }
        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onNext?.(this, runtime.clock);
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
        this.executionTiming.completedAt = completedAt;

        // Attach an elapsed-time fragment and metric when completion timing is available.
        this.recordElapsedTimeArtifact();

        // Call behavior cleanup first
        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            const result = behavior?.onPop?.(this, runtime.clock);
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
