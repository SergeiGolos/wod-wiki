/**
 * Contract: Enhanced Runtime Block with Advancement Tracking
 * 
 * This contract extends the existing IRuntimeBlock interface to support
 * proper advancement behavior with lazy child compilation.
 */

import { BlockKey } from "../../../src/BlockKey";
import { CodeStatement } from "../../../src/CodeStatement";
import { IRuntimeAction } from "../../../src/runtime/IRuntimeAction";

/**
 * Enhanced runtime block interface supporting parent-child advancement.
 * 
 * Contract Requirements:
 * - Must track current position in child sequence
 * - Must support lazy compilation of children
 * - Must maintain parent context for proper stack unwinding
 * - Must handle resource cleanup on disposal
 */
export interface IAdvancedRuntimeBlock {
    /**
     * Unique identifier for this block instance.
     * Contract: Must be set during construction, immutable thereafter
     */
    readonly key: BlockKey;
    
    /**
     * Source code location identifier.
     * Contract: Must link to original CodeStatement
     */
    readonly sourceId: number[];

    /**
     * Current index in children array for sequential advancement.
     * Contract: 
     * - Must be initialized to 0
     * - Must be >= 0 and <= children.length
     * - Must increment on each successful next() call
     */
    readonly currentChildIndex: number;

    /**
     * Uncompiled child statements for lazy JIT compilation.
     * Contract:
     * - Must be set during construction
     * - Remains uncompiled until next() is called
     * - Empty array if block is a leaf node
     */
    readonly children: CodeStatement[];

    /**
     * Reference to parent block for stack unwinding.
     * Contract:
     * - Must be undefined for root blocks
     * - Must reference actual parent for child blocks
     * - Must be cleared on dispose()
     */
    readonly parentContext: IAdvancedRuntimeBlock | undefined;

    /**
     * Indicates whether all children have been processed.
     * Contract:
     * - Initially false
     * - Set to true when currentChildIndex >= children.length
     * - Determines when block can be popped
     */
    readonly isComplete: boolean;

    /**
     * Called when this block is pushed onto the runtime stack.
     * 
     * Contract:
     * - Must register necessary event handlers
     * - Must return array of actions to execute
     * - Must not modify stack directly
     * - Must complete within 1ms
     */
    push(): IRuntimeAction[];

    /**
     * Called to advance to the next child or sibling.
     * 
     * Contract:
     * - Must lazily compile child at currentChildIndex
     * - Must increment currentChildIndex after compilation
     * - Must return NextAction with compiled child
     * - Must return empty array [] when no more children
     * - Must complete within 5ms (including JIT compilation)
     * - Must set isComplete=true when children exhausted
     */
    next(): IRuntimeAction[];

    /**
     * Called when this block is popped from the runtime stack.
     * 
     * Contract:
     * - Must return completion actions
     * - Must NOT clean up resources (handled by dispose)
     * - Must complete within 1ms
     */
    pop(): IRuntimeAction[];

    /**
     * Cleans up resources held by this block.
     * 
     * Contract:
     * - Must clear parent context reference
     * - Must clear children array
     * - Must be idempotent (safe to call multiple times)
     * - Must not throw exceptions
     * - Should complete within 50ms
     * - Must make block eligible for garbage collection
     */
    dispose(): void;
}

/**
 * Test scenarios for contract validation:
 * 
 * 1. Leaf block (no children):
 *    - currentChildIndex = 0
 *    - children = []
 *    - next() returns []
 *    - isComplete = true
 * 
 * 2. Parent block with one child:
 *    - currentChildIndex starts at 0
 *    - children.length = 1
 *    - First next() compiles child, returns NextAction, increments to 1
 *    - Second next() returns [], isComplete = true
 * 
 * 3. Parent block with multiple children:
 *    - Each next() compiles one child sequentially
 *    - currentChildIndex increments on each call
 *    - Returns [] only when currentChildIndex >= children.length
 * 
 * 4. Disposal:
 *    - After dispose(), parentContext = undefined
 *    - After dispose(), children.length = 0
 *    - Multiple dispose() calls are safe
 * 
 * 5. Performance:
 *    - push() completes in < 1ms
 *    - pop() completes in < 1ms
 *    - next() completes in < 5ms (including compilation)
 *    - dispose() completes in < 50ms
 */
