import { BlockKey } from "../core/models/BlockKey";
import { IRuntimeAction } from "./IRuntimeAction";
import { IScriptRuntime } from "./IScriptRuntime";
import { IRuntimeBehavior } from "./IRuntimeBehavior";
import { IBlockContext } from "./IBlockContext";
import { RuntimeMetric } from "./RuntimeMetric";

/**
 * Represents a runtime block that can be executed within the WOD runtime stack.
 * 
 * ## Lifecycle Management
 * 
 * This interface supports two lifecycle patterns:
 * 
 * ### 1. Constructor-Based Initialization (Preferred)
 * - Blocks are initialized during construction
 * - RuntimeStack.push() adds block without calling lifecycle methods
 * - Consumer is responsible for proper resource management
 * - Provides better performance and cleaner separation of concerns
 * 
 * ### 2. Consumer-Managed Disposal (Required)
 * - RuntimeStack.pop() returns block without cleanup
 * - Consumer MUST call dispose() on returned blocks
 * - Optional cleanup() method called before dispose() if present
 * - Ensures explicit resource management and prevents memory leaks
 * 
 * ## Performance Requirements
 * - All lifecycle methods should complete within 50ms
 * - Stack operations should be optimized for frequent push/pop cycles
 * - Memory usage should be minimized during execution
 * 
 * @example
 * ```typescript
 * // Constructor-based initialization
 * const block = new MyRuntimeBlock(config); // Initialization happens here
 * stack.push(block); // No lifecycle method calls
 * 
 * // Consumer-managed disposal
 * const poppedBlock = stack.pop(); // No cleanup method calls
 * if (poppedBlock) {
 *   poppedBlock.dispose(); // Consumer responsibility
 * }
 * ```
 */
export interface IRuntimeBlock {
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
     * Pre-compiled metrics from FragmentCompilationManager.
     * Set during strategy compilation phase, used by ExecutionRecord.
     * 
     * This eliminates the need for regex parsing of block.label during stack push.
     * Metrics flow: Parser → Fragments → FragmentCompilationManager → compiledMetrics → ExecutionRecord
     */
    readonly compiledMetrics?: RuntimeMetric;

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
     * @returns Array of runtime actions to execute after mount
     */
    mount(runtime: IScriptRuntime): IRuntimeAction[];

    /**
     * Called when a child block completes execution.
     * Determines the next block(s) to execute or signals completion.
     * 
     * @param runtime The script runtime context
     * @returns Array of runtime actions representing next execution steps
     */
    next(runtime: IScriptRuntime): IRuntimeAction[];

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic and manages result spans.
     * 
     * Note: In consumer-managed disposal pattern,
     * this method does NOT clean up resources.
     * 
     * @param runtime The script runtime context
     * @returns Array of runtime actions to execute after unmount
     */
    unmount(runtime: IScriptRuntime): IRuntimeAction[];

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
}
