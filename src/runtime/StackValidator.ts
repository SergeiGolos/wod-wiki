/**
 * StackValidator
 * 
 * Implements validation logic for RuntimeStack push/pop operations
 * to ensure stack integrity during execution.
 */

import { IRuntimeBlock } from './IRuntimeBlock';
import { IStackValidator } from './IStackValidator';

const MAX_STACK_DEPTH = 10;

export class StackValidator implements IStackValidator {
    validatePush(block: IRuntimeBlock, currentDepth: number): void {
        // Check block is not null/undefined
        if (block === null || block === undefined) {
            throw new TypeError('Block cannot be null or undefined');
        }

        // Verify block has valid key
        if (!block.key) {
            throw new TypeError('Block must have a valid key');
        }

        // Verify block has sourceIds
        if (!block.sourceIds || !Array.isArray(block.sourceIds)) {
            throw new TypeError(`Block must have a valid sourceIds array (block key: ${block.key})`);
        }

        // Check stack depth < 10
        if (currentDepth >= MAX_STACK_DEPTH) {
            throw new TypeError(
                `Stack overflow: maximum depth (${MAX_STACK_DEPTH}) exceeded (current depth: ${currentDepth}, block: ${block.key})`
            );
        }
    }

    validatePop(currentDepth: number): boolean {
        // Check stack is not empty - return false instead of throwing
        // This allows RuntimeStack.pop() to return undefined gracefully
        if (currentDepth === 0) {
            return false;
        }
        return true;
    }
}
