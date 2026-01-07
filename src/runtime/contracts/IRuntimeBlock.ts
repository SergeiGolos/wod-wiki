import { BlockKey } from '../../core/models/BlockKey';
import { IRuntimeAction } from './IRuntimeAction';
import { IBlockContext } from './IBlockContext';
import { IScriptRuntime } from './IScriptRuntime';
import { IRuntimeBehavior } from './IRuntimeBehavior';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';

export interface BlockLifecycleOptions {
    /** Start timestamp when the block was pushed onto the stack. */
    startTime?: Date;
    /** Completion timestamp when the block was popped from the stack. */
    completedAt?: Date;
    /** Current timestamp for the operation (onNext, etc). */
    now?: Date;
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
     * Used for logging, UI display, and execution history.
     * e.g., "Round 1 of 3", "21 Reps", "For Time"
     */
    readonly label: string;

    /**
     * Fragment groups associated with this block. Each inner array represents one execution bucket
     * (e.g., per round or per interval). Runtime recording can append to these groups to preserve
     * iteration-specific data.
     */
    readonly fragments?: ICodeFragment[][];

    /**
     * The execution context for this block.
     * Manages memory allocation and cleanup.
     */
    readonly context: IBlockContext;

    /**
     * Called when this block is pushed onto the runtime stack.
     * Sets up initial state and registers event listeners.
     * 
     * Note: In constructor-based initialization pattern,
     * this method handles runtime registration only.
     * 
     * @param runtime The script runtime context
     * @param options Lifecycle timing data (start time)
     * @returns Array of runtime actions to execute after mount
     */
    mount(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[];

    /**
     * Called when a child block completes execution.
     * Determines the next block(s) to execute or signals completion.
     * 
     * @param runtime The script runtime context
     * @param options Lifecycle timing data (completion timestamp)
     * @returns Array of runtime actions representing next execution steps
     */
    next(runtime: IScriptRuntime, options?: BlockLifecycleOptions): IRuntimeAction[];

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic and manages result spans.
     * 
     * Note: In consumer-managed disposal pattern,
     * this method does NOT clean up resources.
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
     * Find the first fragment of a given type, optionally matching a predicate.
     */
    findFragment<T extends ICodeFragment = ICodeFragment>(
        type: FragmentType,
        predicate?: (f: ICodeFragment) => boolean
    ): T | undefined;

    /**
     * Get all fragments of a given type.
     */
    filterFragments<T extends ICodeFragment = ICodeFragment>(
        type: FragmentType
    ): T[];

    /**
     * Check if a fragment of a given type exists.
     */
    hasFragment(type: FragmentType): boolean;

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
     * Marks the block as complete. Idempotent - subsequent calls have no effect.
     * Called by behaviors when their completion condition is met.
     * 
     * @param reason Optional reason for completion (for debugging/history)
     */
    markComplete(reason?: string): void;
}
