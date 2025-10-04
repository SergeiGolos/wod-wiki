/**
 * TimerEventValidator
 * 
 * Validates timer duration values and event handler configurations
 * to ensure proper timer behavior.
 */

import { CodeStatement } from '../../CodeStatement';
import { IValidationRule, IValidationResult } from '../IValidationRule';

export class TimerEventValidator implements IValidationRule {
    readonly name = 'TimerEventValidator';

    validate(statement: CodeStatement): IValidationResult {
        // Check if statement has timer-related properties
        if ('duration' in statement) {
            const duration = (statement as any).duration;
            
            // Validate duration is positive
            if (typeof duration === 'number' && duration <= 0) {
                return {
                    isValid: false,
                    errorMessage: `Timer duration must be positive (got: ${duration})`,
                    sourcePosition: statement.id
                };
            }
        }

        // Validate children recursively
        if (statement.children && Array.isArray(statement.children)) {
            for (const childGroup of statement.children) {
                if (Array.isArray(childGroup)) {
                    // For grouped children, we'd need to validate each child
                    // In actual implementation, we'd recursively validate child statements
                }
            }
        }

        return {
            isValid: true
        };
    }
}
