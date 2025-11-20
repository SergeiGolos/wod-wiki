/**
 * NestingDepthValidator
 * 
 * Ensures maximum nesting depth is not exceeded to prevent stack overflow
 * and maintain performance.
 */

import { CodeStatement } from '../../core/models/CodeStatement';
import { IValidationRule, IValidationResult } from '../IValidationRule';

const MAX_NESTING_DEPTH = 10;

export class NestingDepthValidator implements IValidationRule {
    readonly name = 'NestingDepthValidator';

    validate(statement: CodeStatement): IValidationResult {
        return this.validateDepth(statement, 0);
    }

    private validateDepth(statement: CodeStatement, currentDepth: number): IValidationResult {
        // Check if we've exceeded maximum depth
        if (currentDepth > MAX_NESTING_DEPTH) {
            return {
                isValid: false,
                errorMessage: `Nesting depth exceeds maximum of ${MAX_NESTING_DEPTH} levels (current depth: ${currentDepth})`,
                sourcePosition: statement.id
            };
        }

        // Validate children if present
        if (statement.children && Array.isArray(statement.children)) {
            for (const childGroup of statement.children) {
                if (Array.isArray(childGroup)) {
                    // Each level of children increases depth by 1
                    const childResult = this.validateDepth(statement, currentDepth + 1);
                    if (!childResult.isValid) {
                        return childResult;
                    }
                }
            }
        }

        return {
            isValid: true
        };
    }
}
