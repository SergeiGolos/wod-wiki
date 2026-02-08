import { ICodeFragment, FragmentType } from '../core/models/CodeFragment';
import { BlockKey } from '../core/models/BlockKey';
import { IScriptRuntime } from './contracts/IScriptRuntime';
import { IRuntimeBehavior } from './contracts/IRuntimeBehavior';
import { BlockLifecycleOptions, IRuntimeBlock } from './contracts/IRuntimeBlock';
import { IRuntimeAction } from './contracts/IRuntimeAction';
import { IBlockContext } from './contracts/IBlockContext';
import { BlockContext } from './BlockContext';
import { IEventHandler } from './contracts/events/IEventHandler';
import { IEvent } from './contracts/events/IEvent';
import { IMemoryEntry } from './memory/IMemoryEntry';
import { MemoryType, MemoryValueOf } from './memory/MemoryTypes';
import { BehaviorContext } from './BehaviorContext';
import { SimpleMemoryEntry } from './memory/SimpleMemoryEntry';

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

    // Typed memory entries
    private _memoryEntries: Map<MemoryType, IMemoryEntry<MemoryType, any>> = new Map();

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
        label?: string
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
    }

    // ============================================================================
    // Memory Access
    // ============================================================================

    /**
     * Get a typed memory entry.
     */
    getMemory<T extends MemoryType>(type: T): IMemoryEntry<T, MemoryValueOf<T>> | undefined {
        return this._memoryEntries.get(type) as IMemoryEntry<T, MemoryValueOf<T>> | undefined;
    }

    /**
     * Check if a memory entry exists.
     */
    hasMemory(type: MemoryType): boolean {
        return this._memoryEntries.has(type);
    }

    /**
     * Set a typed memory entry (protected - called by strategies/behaviors).
     */
    protected setMemory<T extends MemoryType>(type: T, entry: IMemoryEntry<T, MemoryValueOf<T>>): void {
        this._memoryEntries.set(type, entry);
    }

    /**
     * Set memory value directly. Creates a new SimpleMemoryEntry or updates existing.
     * This is the public API for behaviors to store state.
     */
    setMemoryValue<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void {
        const existing = this._memoryEntries.get(type);
        if (existing && typeof (existing as any).update === 'function') {
            // Update existing entry
            (existing as any).update(value);
        } else {
            // Create new SimpleMemoryEntry
            this._memoryEntries.set(type, new SimpleMemoryEntry(type, value));
        }
    }

    // ============================================================================
    // Lifecycle Methods
    // ============================================================================

    /**
     * Register default event handler for 'next' events.
     */
    protected registerDefaultHandler(): void {
        if (!this._runtime?.eventBus?.register) return;

        const handler: IEventHandler = {
            id: `handler-next-${this.key.toString()}`,
            name: `NextHandler-${this.label}`,
            handler: (_event: IEvent, _runtime: IScriptRuntime): IRuntimeAction[] => {
                // Skip 'next' events - handled by NextAction directly
                // This handler is kept for other events if needed
                return [];
            }
        };

        const unsub = this._runtime.eventBus.register('next', handler, this.key.toString());
        if (unsub) {
            this._eventUnsubscribers.push(unsub);
        }
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

        // Dispose memory entries
        for (const [_type, entry] of this._memoryEntries) {
            if (typeof (entry as any).dispose === 'function') {
                (entry as any).dispose();
            }
        }
        this._memoryEntries.clear();

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
    // Fragment Access (for output generation)
    // ============================================================================

    get fragments(): ICodeFragment[][] {
        // Return fragments from fragment memory if available, wrapped in array of arrays
        const fragmentEntry = this.getMemory('fragment');
        return fragmentEntry?.value.fragments ? [[...fragmentEntry.value.fragments]] : [];
    }

    /**
     * Find the first fragment of a given type, optionally matching a predicate.
     */
    findFragment<T extends ICodeFragment = ICodeFragment>(
        type: FragmentType,
        predicate?: (f: ICodeFragment) => boolean
    ): T | undefined {
        for (const group of this.fragments) {
            for (const fragment of group) {
                if (fragment.fragmentType === type) {
                    if (!predicate || predicate(fragment)) {
                        return fragment as T;
                    }
                }
            }
        }
        return undefined;
    }

    /**
     * Get all fragments of a given type.
     */
    filterFragments<T extends ICodeFragment = ICodeFragment>(type: FragmentType): T[] {
        const result: T[] = [];
        for (const group of this.fragments) {
            for (const fragment of group) {
                if (fragment.fragmentType === type) {
                    result.push(fragment as T);
                }
            }
        }
        return result;
    }

    /**
     * Check if a fragment of a given type exists.
     */
    hasFragment(type: FragmentType): boolean {
        return this.findFragment(type) !== undefined;
    }

    /**
     * Get all memory types owned by this block.
     */
    getMemoryTypes(): MemoryType[] {
        return Array.from(this._memoryEntries.keys());
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
}
