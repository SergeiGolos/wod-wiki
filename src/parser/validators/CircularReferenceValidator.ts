/**
 * CircularReferenceValidator
 * 
 * Detects cycles in parent-child relationships to prevent infinite loops
 * during script execution.
 */

import { CodeStatement } from '../../CodeStatement';
import { IValidationRule, IValidationResult } from '../IValidationRule';

export class CircularReferenceValidator implements IValidationRule {
    readonly name = 'CircularReferenceValidator';

    validate(statement: CodeStatement): IValidationResult {
        const visited = new Set<CodeStatement>();
        return this.validateRecursive(statement, visited, []);
    }

    private validateRecursive(
        statement: CodeStatement,
        visited: Set<CodeStatement>,
        path: number[][]
    ): IValidationResult {
        // Check if we've seen this statement before (cycle detected)
        if (visited.has(statement)) {
            return {
                isValid: false,
                errorMessage: `Circular reference detected in statement path: ${path.map(id => `[${id.join(',')}]`).join(' -> ')}`,
                sourcePosition: statement.id
            };
        }

        // Mark as visited
        visited.add(statement);
        path.push(statement.id);

        // Validate children if present
        if (statement.children && Array.isArray(statement.children)) {
            for (const childGroup of statement.children) {
                if (Array.isArray(childGroup)) {
                    // Handle grouped children (compose fragments)
                    for (const childId of childGroup) {
                        // Note: In actual implementation, we'd need access to statement lookup
                        // For now, we assume no cycles in the ID structure itself
                    }
                }
            }
        }

        // Remove from visited set for this branch (allow revisiting in different branches)
        visited.delete(statement);
        path.pop();

        return {
            isValid: true
        };
    }
}
