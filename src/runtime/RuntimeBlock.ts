import { BlockKey } from '../core/models/BlockKey';
import { IScriptRuntime } from './contracts/IScriptRuntime';
import { IRuntimeBehavior } from './contracts/IRuntimeBehavior';
import { BlockLifecycleOptions, IRuntimeBlock } from './contracts/IRuntimeBlock';
import { IRuntimeAction } from './contracts/IRuntimeAction';
import { IBlockContext } from './contracts/IBlockContext';
import { BlockContext } from './BlockContext';
import { IMemoryEntry } from './memory/IMemoryEntry';
import { MemoryType, MemoryValueOf } from './memory/MemoryTypes';
import { BehaviorContext } from './BehaviorContext';
import { FragmentGroupStore } from './memory/FragmentGroupStore';
import { FragmentGroupEntry } from './memory/FragmentGroupEntry';
import { FragmentDisplayView, FragmentStateView } from './memory/FragmentDisplayView';
import { FragmentVisibility } from '../core/models/CodeFragment';
import { ICodeFragment } from '../core/models/CodeFragment';
import { RuntimeLogger } from './RuntimeLogger';

/**
 * RuntimeBlock represents an executable unit in the workout runtime.
 * 
 * Blocks are composed of behaviors that handle specific aspects (time, iteration, completion, etc.)
 * Behaviors receive an IBehaviorContext that provides access to memory, events, and output emission.
 * 
 * ## Lifecycle
 * 
 * 1. Block is created by a strategy with behaviors attached
 * 2. mount() is called when pushed onto stack - behaviors receive onMount(ctx)
 * 3. next() is called when child completes or user advances - behaviors receive onNext(ctx)
 * 4. unmount() is called when popped from stack - behaviors receive onUnmount(ctx)
 * 5. dispose() is called for cleanup - behaviors receive onDispose(ctx)
 */
export class RuntimeBlock implements IRuntimeBlock {
    protected readonly behaviors: IRuntimeBehavior[] = [];
    public readonly key: BlockKey;
    public readonly blockType?: string;
    public readonly label: string;
    public readonly context: IBlockContext;
    public readonly sourceIds: number[];

    // Unified store for all block state
    private readonly _store: FragmentGroupStore = new FragmentGroupStore();

    // IDs of groups that hold ICodeFragment[] data (from parser/compiler)
    private readonly _fragmentGroupIds: string[] = [];

    // Cached virtual views (created on first access)
    private _displayView?: FragmentDisplayView;
    private _fragmentView?: FragmentStateView;

    // Behavior context (created on mount)
    protected _behaviorContext?: BehaviorContext;

    // Execution timing
    public readonly executionTiming: { startTime?: Date; endTime?: Date } = {};

    // Completion state
    private _isComplete: boolean = false;
    private _completionReason?: string;

    // Event unsubscribers
    private _eventUnsubscribers: Array<() => void> = [];

    // Runtime reference (set during mount)
    protected _runtime?: IScriptRuntime;

    constructor(
        runtime: IScriptRuntime,
        sourceIds: number[] = [],
        behaviors: IRuntimeBehavior[] = [],
        contextOrBlockType?: IBlockContext | string,
        blockKey?: BlockKey,
        blockTypeParam?: string,
        label?: string,
        initialFragments?: ICodeFragment[][]
    ) {
        this._runtime = runtime;
        this.sourceIds = sourceIds;
        this.behaviors = behaviors;

        // Handle backward compatibility: if contextOrBlockType is a string, it's the old blockType parameter
        if (typeof contextOrBlockType === 'string' || contextOrBlockType === undefined) {
            this.key = blockKey ?? new BlockKey();
            this.blockType = contextOrBlockType as string | undefined;
            this.label = label || (contextOrBlockType as string) || 'Block';
            this.context = new BlockContext(runtime, this.key.toString());
        } else {
            this.key = blockKey ?? new BlockKey();
            this.context = contextOrBlockType;
            this.blockType = blockTypeParam;
            this.label = label || blockTypeParam || 'Block';
        }

        // Seed the store with parser/compiler fragment groups
        if (initialFragments && initialFragments.length > 0) {
            for (let i = 0; i < initialFragments.length; i++) {
                const gid = `frag-${i}`;
                this._store.upsert(gid, initialFragments[i], 'public');
                this._fragmentGroupIds.push(gid);
            }
        }
    }

    // ============================================================================
    // Memory Access
    // ============================================================================

    /**
     * Get a typed memory entry.
     * Routes virtual queries ('fragment', 'fragment:display') to computed views;
     * direct queries to the FragmentGroupStore via FragmentGroupEntry adapters.
     */
    getMemory<T extends MemoryType>(type: T): IMemoryEntry<T, MemoryValueOf<T>> | undefined {
        // Virtual queries (computed views over the store)
        if (type === 'fragment:display') {
            if (this._fragmentGroupIds.length === 0) return undefined;
            return this.getDisplayView() as unknown as IMemoryEntry<T, MemoryValueOf<T>>;
        }
        if (type === 'fragment') {
            if (this._fragmentGroupIds.length === 0) return undefined;
            return this.getFragmentView() as unknown as IMemoryEntry<T, MemoryValueOf<T>>;
        }

        // Direct group lookup
        if (!this._store.has(type)) return undefined;
        return new FragmentGroupEntry<T, MemoryValueOf<T>>(type, this._store, type);
    }

    /**
     * Check if a memory entry exists.
     */
    hasMemory(type: MemoryType): boolean {
        if (type === 'fragment:display' || type === 'fragment') {
            return this._fragmentGroupIds.length > 0;
        }
        return this._store.has(type);
    }

    /**
     * Set a typed memory entry (protected - called by strategies/behaviors/tests).
     * Transition shim: extracts the value and stores it in the FragmentGroupStore.
     */
    protected setMemory<T extends MemoryType>(type: T, entry: IMemoryEntry<T, MemoryValueOf<T>>): void {
        const visibility = MEMORY_VISIBILITY[type] ?? 'private';
        this._store.upsert(type, entry.value, visibility);
    }

    /**
     * Allocate a typed memory entry on this block.
     * Transition shim: extracts the value and stores it in the FragmentGroupStore.
     */
    allocateMemory<T extends MemoryType>(type: T, entry: IMemoryEntry<T, MemoryValueOf<T>>): void {
        const visibility = MEMORY_VISIBILITY[type] ?? 'private';
        this._store.upsert(type, entry.value, visibility);
    }

    /**
     * Set memory value directly. Routes to the FragmentGroupStore.
     * This is the public API for behaviors to store state.
     */
    setMemoryValue<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void {
        const visibility = MEMORY_VISIBILITY[type] ?? 'private';
        this._store.upsert(type, value, visibility);

        // Log memory update
        RuntimeLogger.logMemoryUpdate(this.key.toString(), type, value);
    }

    // ============================================================================
    // Lifecycle Methods
    // ============================================================================

    /**
     * Register default event handlers for block-level events.
     * 
     * Note: 'next' events are handled globally by NextEventHandler
     * registered in ScriptRuntime. Per-block 'next' handlers are not
     * needed and were removed to avoid unnecessary handler registrations.
     */
    protected registerDefaultHandler(): void {
        // No per-block handlers currently needed.
        // The global NextEventHandler in ScriptRuntime handles 'next' events.
    }

    /**
     * Called when this block is pushed onto the runtime stack.
     */
    mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        this._runtime = runtime;

        // Use provided clock or fall back to runtime clock
        const clock = options?.clock ?? runtime.clock;
        this.executionTiming.startTime = options?.startTime ?? clock.now;

        // Register default event handlers
        this.registerDefaultHandler();

        // Create behavior context with the appropriate clock
        const stackLevel = Math.max(0, runtime.stack.count - 1);
        this._behaviorContext = new BehaviorContext(this, clock, stackLevel, runtime);

        // Call behavior onMount hooks
        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            if (behavior.onMount) {
                const result = behavior.onMount(this._behaviorContext);
                if (result) {
                    actions.push(...result);
                }
            }
        }

        return actions;
    }

    /**
     * Called when a child block completes or user advances.
     * 
     * @param runtime The script runtime context
     * @param options Lifecycle options including optional clock for timing consistency
     */
    next(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        if (!this._behaviorContext) {
            console.warn('[RuntimeBlock] next() called before mount()');
            return [];
        }

        // Use provided clock or fall back to existing context clock
        const clock = options?.clock ?? this._behaviorContext.clock;

        // Create a fresh context for this next() call with the appropriate clock
        // This ensures all behaviors in this next() chain see the same frozen time
        const nextContext = new BehaviorContext(
            this,
            clock,
            this._behaviorContext.stackLevel,
            runtime
        );

        // Prepare phase: reset per-call state on behaviors that need it.
        // This ensures properties like allChildrenCompleted return accurate
        // values regardless of behavior ordering in the chain.
        for (const behavior of this.behaviors) {
            if (typeof (behavior as any).prepareForNextCycle === 'function') {
                (behavior as any).prepareForNextCycle();
            }
        }

        const actions: IRuntimeAction[] = [];
        for (const behavior of this.behaviors) {
            if (behavior.onNext) {
                const result = behavior.onNext(nextContext);
                if (result) {
                    actions.push(...result);
                }
            }
        }

        // Dispose the temporary context to clean up any subscriptions
        // registered by behaviors during onNext
        nextContext.dispose();

        // Log the next call with resulting actions
        RuntimeLogger.logNext(this, actions);

        return actions;
    }

    /**
     * Called when this block is popped from the runtime stack.
     * 
     * @param runtime The script runtime context
     * @param options Lifecycle options including optional clock for timing consistency
     */
    unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[] {
        // Use provided clock or fall back to runtime clock
        const clock = options?.clock ?? runtime.clock;
        this.executionTiming.endTime = options?.completedAt ?? clock.now;

        const actions: IRuntimeAction[] = [];

        // Call behavior onUnmount hooks
        if (this._behaviorContext) {
            for (const behavior of this.behaviors) {
                if (behavior.onUnmount) {
                    const result = behavior.onUnmount(this._behaviorContext);
                    if (result) {
                        actions.push(...result);
                    }
                }
            }
        }

        // Emit unmount event and capture any resulting actions
        const unmountEventActions = runtime.eventBus.dispatch({
            name: 'unmount',
            timestamp: runtime.clock.now,
            data: { blockKey: this.key.toString() }
        }, runtime);
        if (unmountEventActions.length > 0) {
            actions.push(...unmountEventActions);
        }

        // Dispose memory store and virtual views
        this._displayView?.dispose();
        this._displayView = undefined;
        this._fragmentView = undefined;
        this._store.dispose();

        // Unregister event handlers
        for (const unsub of this._eventUnsubscribers) {
            try {
                unsub();
            } catch (err) {
                console.error('[RuntimeBlock] Error unsubscribing event handler:', err);
            }
        }
        this._eventUnsubscribers = [];

        // Dispose behavior context (cleans up subscriptions)
        if (this._behaviorContext) {
            this._behaviorContext.dispose();
            this._behaviorContext = undefined;
        }

        return actions;
    }

    /**
     * Called for final cleanup.
     */
    dispose(runtime: IScriptRuntime): void {
        // Create a temporary context if needed for dispose
        const ctx = this._behaviorContext ?? new BehaviorContext(
            this,
            runtime.clock,
            0,
            runtime
        );

        for (const behavior of this.behaviors) {
            if (behavior.onDispose) {
                behavior.onDispose(ctx);
            }
        }

        // Clean up temporary context if we created one
        if (!this._behaviorContext && ctx) {
            ctx.dispose();
        }
    }

    // ============================================================================
    // Completion
    // ============================================================================

    get isComplete(): boolean {
        return this._isComplete;
    }

    get completionReason(): string | undefined {
        return this._completionReason;
    }

    markComplete(reason?: string): void {
        this._isComplete = true;
        this._completionReason = reason;
    }

    // ============================================================================
    // Utilities
    // ============================================================================

    /**
     * Get all memory types owned by this block.
     */
    getMemoryTypes(): MemoryType[] {
        const types = this._store.keys() as MemoryType[];
        if (this._fragmentGroupIds.length > 0) {
            if (!types.includes('fragment')) types.push('fragment');
            if (!types.includes('fragment:display')) types.push('fragment:display');
        }
        return types;
    }

    // ============================================================================
    // Utilities
    // ============================================================================

    /**
     * Gets a specific behavior by type from the behaviors array.
     */
    getBehavior<T extends IRuntimeBehavior>(behaviorType: new (...args: any[]) => T): T | undefined {
        return this.behaviors.find(b => b instanceof behaviorType) as T | undefined;
    }

    // ── Private helpers ──

    private getDisplayView(): FragmentDisplayView {
        if (!this._displayView) {
            this._displayView = new FragmentDisplayView(
                this.key.toString(),
                this._store,
                this._fragmentGroupIds
            );
        }
        return this._displayView;
    }

    private getFragmentView(): FragmentStateView {
        if (!this._fragmentView) {
            this._fragmentView = new FragmentStateView(this._store, this._fragmentGroupIds);
        }
        return this._fragmentView;
    }
}

/** Default visibility by memory type */
const MEMORY_VISIBILITY: Partial<Record<MemoryType, FragmentVisibility>> = {
    timer: 'private',
    round: 'private',
    display: 'public',
    controls: 'public',
};
