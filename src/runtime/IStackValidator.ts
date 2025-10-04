/**
 * Runtime Stack Validation
 * 
 * Defines validation behavior for RuntimeStack push/pop operations
 * to ensure stack integrity during execution.
 */

import { IRuntimeBlock } from './IRuntimeBlock';

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
