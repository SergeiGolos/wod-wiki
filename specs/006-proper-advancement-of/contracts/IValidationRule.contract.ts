/**
 * Contract: Parse-Time Validation Rules
 * 
 * Defines the interface for validation rules that check script structure
 * during the parsing phase to prevent runtime advancement errors.
 */

import { CodeStatement } from "../../../src/CodeStatement";

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

/**
 * Required validation rules for advancement feature:
 * 
 * 1. CircularReferenceValidator
 *    - Detects cycles in parent-child relationships
 *    - Tracks visited statements during tree walk
 *    - Returns error with cycle path
 * 
 * 2. NestingDepthValidator
 *    - Ensures maximum depth not exceeded (10 levels)
 *    - Counts depth during recursive traversal
 *    - Returns error with depth and position
 * 
 * 3. ParentChildValidator
 *    - Verifies parent blocks have children OR are leaf nodes
 *    - Checks child references are valid
 *    - Returns error for orphaned children
 * 
 * 4. TimerEventValidator
 *    - Validates timer duration values (must be positive)
 *    - Checks event handlers are properly configured
 *    - Returns error for invalid timer configuration
 */

/**
 * Test scenarios:
 * 
 * 1. Valid simple script (sequential):
 *    - Should pass all validators
 * 
 * 2. Valid nested script (3 levels):
 *    - Should pass all validators
 * 
 * 3. Circular reference:
 *    - CircularReferenceValidator should fail
 *    - Error should show cycle path
 * 
 * 4. Excessive nesting (11 levels):
 *    - NestingDepthValidator should fail
 *    - Error should show depth and position
 * 
 * 5. Invalid timer duration (negative):
 *    - TimerEventValidator should fail
 *    - Error should show duration value
 * 
 * 6. Performance:
 *    - Validation of 50-element script < 100ms
 */
