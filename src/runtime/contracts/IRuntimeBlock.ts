import { BlockKey } from '../../core/models/BlockKey';
import { IRuntimeAction } from './IRuntimeAction';
import { IBlockContext } from './IBlockContext';
import { IScriptRuntime } from './IScriptRuntime';
import { IRuntimeBehavior } from './IRuntimeBehavior';
import { IRuntimeClock } from './IRuntimeClock';
import { IMemoryLocation, MemoryTag } from '../memory/MemoryLocation';
import { MemoryType, MemoryValueOf } from '../memory/MemoryTypes';
import { FragmentVisibility } from '../memory/FragmentVisibility';

/**
 * Backward-compatible memory entry shape.
 * Provides a shim over IMemoryLocation for callers still using the old API.
 */
export interface IMemoryEntryShim<V = unknown> {
    readonly value: V;
    subscribe(listener: (newValue: V | undefined, oldValue: V | undefined) => void): () => void;
}

export interface BlockLifecycleOptions {
    /** Start timestamp when the block was pushed onto the stack. */
    startTime?: Date;
    /** Completion timestamp when the block was popped from the stack. */
    completedAt?: Date;
    /** Current timestamp for the operation (onNext, etc). */
    now?: Date;
    
    /**
     * Clock to use for this lifecycle operation.
     * 
     * If provided, this clock is passed to behaviors and child operations,
     * allowing consistent timing during execution chains (pop → next → push).
     * 
     * Use `SnapshotClock.at(clock, time)` to freeze time during an execution chain:
     * - When a timer expires at T₁, create a snapshot at T₁
     * - Pass the snapshot through pop → parent.next → child push
     * - All operations see T₁ as `clock.now`, ensuring no timing gaps
     * 
     * If not provided, defaults to `runtime.clock`.
     */
    clock?: IRuntimeClock;
}

/**
 * Represents a runtime block that can be executed within the WOD runtime stack.
 * 
 * ## Lifecycle Management
 * 
 * Lifecycle pattern:
 * - Blocks initialize in constructors and register resources
 * - RuntimeStack.push() validates and stores blocks
 * - RuntimeStack.pop() orchestrates unmount → dispose → context.release → parent.next
 * - Blocks must implement dispose/unmount, but callers no longer manually dispose popped blocks
 * 
 * ## Performance Requirements
 * - All lifecycle methods should complete within 50ms
 * - Stack operations should be optimized for frequent push/pop cycles
 * - Memory usage should be minimized during execution
 */
export interface IRuntimeBlock {
    /**
     * Execution timing metadata propagated by the runtime (start/completion timestamps).
     * Implementations can rely on RuntimeStack/PushBlockAction to set this.
     */
    executionTiming?: BlockLifecycleOptions;

    /**
     * Unique identifier for this block instance.
     * Used for tracking and debugging purposes.
     */
    readonly key: BlockKey;

    /**
     * Source code location identifiers.
     * Links block to original workout script positions.
     */
    readonly sourceIds: number[];

    /**
     * Type discriminator for UI display and logging.
     * Enables identification of block types (Timer, Rounds, Effort, etc.).
     */
    readonly blockType?: string;

    /**
     * Human-readable label for the block.
     * Computed from the block's Label fragment in fragment:display memory.
     * Falls back to blockType or 'Block' if no Label fragment exists.
     * e.g., "Round 1 of 3", "21 Reps", "For Time"
     */
    readonly label: string;

    /**
     * The execution context for this block.
     * Manages memory allocation and cleanup.
     */
    readonly context: IBlockContext;

    /**
     * Called when this block is pushed onto the runtime stack.
     * Sets up initial state and registers event listeners.
     * 
     * Note: Event registration and resource allocation should happen here,
     * not in the constructor, to ensure they are active only while mounted.
     * 
     * @param runtime The script runtime context
     * @param options Lifecycle timing data (start time)
     * @returns Array of runtime actions to execute after mount
     */
    mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[];

    /**
     * Called to advance the block's execution state.
     * 
     * Triggers:
     * 1. **Automatic**: Called by RuntimeStack when a child block is popped (child completion).
     * 2. **Manual**: Called by NextAction when user manually acts (e.g., skips block).
     * 3. **Timer**: Called by TimerBehavior when a timer completes (implicit next).
     * 
     * Responsibilities:
     * - Determine the next step in the block's execution flow.
     * - If block has children (e.g., loops), push the next child.
     * - If block is simple (e.g., single movement), mark itself complete.
     * - If block is a timer, handle timer completion logic.
     * 
     * @param runtime The script runtime context
     * @param options Lifecycle timing data (completion timestamp if triggered by child pop)
     * @returns Array of runtime actions representing next execution steps (e.g., PushBlock, MarkComplete)
     */
    next(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[];

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic, cleanup, and resource disposal.
     * 
     * Note: This method MUST unsubscribe from events and dispose 
     * memory entries to complete any active observables.
     * 
     * @param runtime The script runtime context
     * @param options Lifecycle timing data (completion timestamp)
     * @returns Array of runtime actions to execute after unmount
     */
    unmount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[];

    /**
     * Cleans up any resources held by this block.
     * 
     * ## Critical Requirements
     * - MUST be called by consumer after popping from stack
     * - Should complete within 50ms for performance
     * - Must handle being called multiple times safely
     * - Should not throw exceptions during cleanup
     * 
     * ## Resource Management
     * - Close file handles, network connections
     * - Unregister event listeners and callbacks
     * - Release memory references and clear caches
     * - Dispose of child objects and dependencies
     * 
     * @param runtime The script runtime context
     * @throws Never - Should handle all cleanup errors internally
     */
    dispose(runtime: IScriptRuntime): void;

    /**
     * Gets a specific behavior by type from the behaviors array.
     * @param behaviorType Constructor/class of the behavior to find
     * @returns The behavior instance or undefined if not found
     */
    getBehavior<T extends IRuntimeBehavior>(behaviorType: new (...args: any[]) => T): T | undefined;

    /**
     * Read-only list of all behaviors attached to this block.
     * Useful for debug/inspection UIs.
     */
    readonly behaviors: readonly IRuntimeBehavior[];

    // ============================================================================
    // List-Based Memory API
    // ============================================================================

    /**
     * Push a new memory location onto the block's memory list.
     * Multiple locations with the same tag can coexist.
     *
     * @param location The memory location to add
     */
    pushMemory(location: IMemoryLocation): void;

    /**
     * Get all memory locations matching the given tag.
     * Returns an empty array if no locations match.
     *
     * @param tag The memory tag to filter by
     * @returns Array of memory locations with the given tag
     */
    getMemoryByTag(tag: MemoryTag): IMemoryLocation[];

    /**
     * Get all memory locations owned by this block.
     * Returns the full memory list in insertion order.
     *
     * @returns Array of all memory locations
     */
    getAllMemory(): IMemoryLocation[];

    /**
     * Get all fragment memory locations matching a given visibility tier.
     *
     * Fragment tags follow the `fragment:*` namespace convention and are
     * classified into three visibility tiers: `'display'`, `'promote'`,
     * and `'private'`. This method filters all memory locations to those
     * with fragment tags belonging to the specified tier.
     *
     * @param visibility The visibility tier to filter by
     * @returns Array of memory locations in the requested tier
     *
     * @example
     * ```typescript
     * // Get fragments visible in the UI card
     * const displayLocs = block.getFragmentMemoryByVisibility('display');
     *
     * // Get all tiers for debug view
     * const all = (['display', 'promote', 'private'] as const)
     *   .flatMap(v => block.getFragmentMemoryByVisibility(v));
     * ```
     */
    getFragmentMemoryByVisibility(visibility: FragmentVisibility): IMemoryLocation[];

    /**
     * Indicates whether this block has completed execution.
     * When true, the stack will pop this block during its next completion sweep.
     * 
     * @remarks
     * - Set by behaviors when their completion condition is met
     * - Read by the stack after action/event processing
     * - Once true, should not be reset to false
     */
    readonly isComplete: boolean;

    /**
     * The reason this block was completed, if any.
     * 
     * Set by `markComplete(reason)`. Common values:
     * - `'user-advance'` — user clicked next (self-pop)
     * - `'forced-pop'` — parent popped this block (e.g., timer expiry)
     * - `'timer-expired'` — block's own timer completed
     * - `'rounds-complete'` — all rounds finished
     * 
     * Available during `onUnmount` so output behaviors can include
     * completion context in the emitted output.
     */
    readonly completionReason?: string;

    /**
     * Marks the block as complete. Idempotent - subsequent calls have no effect.
     * Called by behaviors when their completion condition is met.
     * 
     * @param reason Optional reason for completion (for debugging/history)
     */
    markComplete(reason?: string): void;

    // ============================================================================
    // Backward-Compatible Memory API (shims over list-based memory)
    // ============================================================================

    /**
     * @deprecated Use getMemoryByTag() instead. Backward-compatible shim that
     * reads from the list-based memory and returns a legacy-shaped entry.
     */
    getMemory<T extends MemoryType>(type: T): IMemoryEntryShim<MemoryValueOf<T>> | undefined;

    /**
     * @deprecated Use getMemoryByTag().length > 0 instead. Backward-compatible shim.
     */
    hasMemory(type: MemoryType): boolean;

    /**
     * @deprecated Use pushMemory() or the BehaviorContext API instead.
     * Backward-compatible shim that updates the first matching memory location's
     * fragment value, or creates a new location if none exists.
     */
    setMemoryValue<T extends MemoryType>(type: T, value: MemoryValueOf<T>): void;
}
