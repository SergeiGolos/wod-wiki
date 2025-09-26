import { BlockKey } from "../BlockKey";
import { IRuntimeAction } from "./IRuntimeAction";

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
     * Source code location identifier.
     * Links block to original workout script position.
     */
    readonly sourceId: number[];        

    /**
     * Called when this block is pushed onto the runtime stack.
     * Sets up initial state and registers event listeners.
     * 
     * Note: In constructor-based initialization pattern,
     * this method handles runtime registration only.
     * 
     * @returns Array of runtime actions to execute after push
     */
    push(): IRuntimeAction[];

    /**
     * Called when a child block completes execution.
     * Determines the next block(s) to execute or signals completion.
     * 
     * @returns Array of runtime actions representing next execution steps
     */
    next(): IRuntimeAction[];

    /**
     * Called when this block is popped from the runtime stack.
     * Handles completion logic and manages result spans.
     * 
     * Note: In consumer-managed disposal pattern,
     * this method does NOT clean up resources.
     * 
     * @returns Array of runtime actions to execute after pop
     */
    pop(): IRuntimeAction[];

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
     * @throws Never - Should handle all cleanup errors internally
     */
    dispose(): void;
}
