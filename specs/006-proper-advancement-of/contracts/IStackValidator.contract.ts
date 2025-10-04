/**
 * Contract: Runtime Stack Validation
 * 
 * Defines validation behavior for RuntimeStack push/pop operations
 * to ensure stack integrity during execution.
 */

import { IRuntimeBlock } from "../../../src/runtime/IRuntimeBlock";

/**
 * Stack validator interface for runtime checks
 * 
 * Contract Requirements:
 * - Must validate before push/pop operations
 * - Must throw TypeError on validation failure
 * - Must include stack state in error messages
 * - Must be O(1) complexity (no deep traversals)
 */
export interface IStackValidator {
    /**
     * Validates a block before pushing to stack
     * 
     * Contract:
     * - Must check block is not null/undefined
     * - Must verify block has valid key
     * - Must verify block has sourceId
     * - Must check stack depth < 10
     * - Must throw TypeError on failure
     * - Must complete in O(1) time
     * 
     * @throws TypeError if validation fails
     */
    validatePush(block: IRuntimeBlock, currentDepth: number): void;

    /**
     * Validates before popping from stack
     * 
     * Contract:
     * - Must check stack is not empty
     * - Must throw Error on failure
     * - Must complete in O(1) time
     * 
     * @throws Error if stack is empty
     */
    validatePop(currentDepth: number): void;
}

/**
 * Stack validation error scenarios:
 * 
 * 1. Push null block:
 *    - TypeError: "Block cannot be null or undefined"
 * 
 * 2. Push block without key:
 *    - TypeError: "Block must have a valid key"
 * 
 * 3. Push at depth 10:
 *    - TypeError: "Stack overflow: maximum depth (10) exceeded"
 * 
 * 4. Pop from empty stack:
 *    - Error: "Cannot pop from empty stack"
 * 
 * 5. Push with duplicate key:
 *    - TypeError: "Duplicate block key: {key}"
 */

/**
 * Test scenarios:
 * 
 * 1. Valid push at depth 5:
 *    - Should not throw
 * 
 * 2. Push null:
 *    - Should throw TypeError with message
 * 
 * 3. Push at depth 10:
 *    - Should throw TypeError (overflow)
 * 
 * 4. Pop from empty:
 *    - Should throw Error
 * 
 * 5. Performance:
 *    - validatePush() < 0.1ms
 *    - validatePop() < 0.1ms
 */
