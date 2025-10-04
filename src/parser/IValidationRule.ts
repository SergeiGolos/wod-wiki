/**
 * Parse-Time Validation Rules
 * 
 * Defines the interface for validation rules that check script structure
 * during the parsing phase to prevent runtime advancement errors.
 */

import { CodeStatement } from '../CodeStatement';

/**
 * Result of a validation check
 */
export interface IValidationResult {
    /**
     * Whether validation passed
     */
    isValid: boolean;

    /**
     * Error message if validation failed
     * Contract: Must be undefined if isValid=true
     */
    errorMessage?: string;

    /**
     * Source position where error occurred
     * Contract: Must include statement location for debugging
     */
    sourcePosition?: number[];
}

/**
 * Validation rule interface for parse-time checks
 * 
 * Contract Requirements:
 * - Must be stateless (no side effects)
 * - Must be fast (<100ms for typical scripts)
 * - Must provide clear error messages
 * - Must include source positions in errors
 */
export interface IValidationRule {
    /**
     * Name of this validation rule for debugging
     * Contract: Must be unique and descriptive
     */
    readonly name: string;

    /**
     * Validates a CodeStatement and its children
     * 
     * Contract:
     * - Must check entire subtree if applicable
     * - Must return detailed error on failure
     * - Must not modify the statement
     * - Must complete within 100ms
     */
    validate(statement: CodeStatement): IValidationResult;
}
