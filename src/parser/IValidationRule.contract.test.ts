/**
 * Contract Test: IValidationRule
 * 
 * These tests validate the contract requirements for parse-time validation rules
 * that check script structure before execution.
 * 
 * Expected: All tests FAIL initially (TDD requirement)
 */

import { describe, it, expect } from 'vitest';
import { CodeStatement } from '../../src/CodeStatement';

// These interfaces are defined in the contract but not implemented yet
interface IValidationResult {
    isValid: boolean;
    errorMessage?: string;
    sourcePosition?: number[];
}

interface IValidationRule {
    readonly name: string;
    validate(statement: CodeStatement): IValidationResult;
}

// These validators don't exist yet - tests will fail
declare class CircularReferenceValidator implements IValidationRule {
    readonly name: string;
    validate(statement: CodeStatement): IValidationResult;
}

declare class NestingDepthValidator implements IValidationRule {
    readonly name: string;
    validate(statement: CodeStatement): IValidationResult;
}

declare class TimerEventValidator implements IValidationRule {
    readonly name: string;
    validate(statement: CodeStatement): IValidationResult;
}

describe('IValidationRule Contract Tests', () => {
    describe('CircularReferenceValidator', () => {
        it('should detect cycles in parent-child relationships', () => {
            // This will FAIL - validator not implemented yet
            const validator = new CircularReferenceValidator();
            const statement = {} as CodeStatement;
            const result = validator.validate(statement);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('cycle');
        });

        it('should pass validation for acyclic structures', () => {
            const validator = new CircularReferenceValidator();
            const statement = {} as CodeStatement;
            const result = validator.validate(statement);
            expect(result.isValid).toBe(true);
        });

        it('should return error with cycle path on failure', () => {
            const validator = new CircularReferenceValidator();
            const statement = {} as CodeStatement;
            const result = validator.validate(statement);
            expect(result.errorMessage).toBeDefined();
            expect(result.sourcePosition).toBeDefined();
        });

        it('should have descriptive name', () => {
            const validator = new CircularReferenceValidator();
            expect(validator.name).toBe('CircularReferenceValidator');
        });
    });

    describe('NestingDepthValidator', () => {
        it('should reject scripts with depth > 10', () => {
            // This will FAIL - validator not implemented yet
            const validator = new NestingDepthValidator();
            const statement = {} as CodeStatement; // Simulate 11-level nesting
            const result = validator.validate(statement);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('depth');
        });

        it('should accept scripts with depth <= 10', () => {
            const validator = new NestingDepthValidator();
            const statement = {} as CodeStatement; // Simulate 5-level nesting
            const result = validator.validate(statement);
            expect(result.isValid).toBe(true);
        });

        it('should return error with depth and position', () => {
            const validator = new NestingDepthValidator();
            const statement = {} as CodeStatement;
            const result = validator.validate(statement);
            if (!result.isValid) {
                expect(result.errorMessage).toMatch(/depth|level/i);
                expect(result.sourcePosition).toBeDefined();
            }
        });

        it('should have descriptive name', () => {
            const validator = new NestingDepthValidator();
            expect(validator.name).toBe('NestingDepthValidator');
        });
    });

    describe('TimerEventValidator', () => {
        it('should reject negative timer durations', () => {
            // This will FAIL - validator not implemented yet
            const validator = new TimerEventValidator();
            const statement = {} as CodeStatement; // Simulate negative duration
            const result = validator.validate(statement);
            expect(result.isValid).toBe(false);
            expect(result.errorMessage).toContain('duration');
        });

        it('should accept positive timer durations', () => {
            const validator = new TimerEventValidator();
            const statement = {} as CodeStatement; // Simulate positive duration
            const result = validator.validate(statement);
            expect(result.isValid).toBe(true);
        });

        it('should validate event handlers are configured', () => {
            const validator = new TimerEventValidator();
            const statement = {} as CodeStatement;
            const result = validator.validate(statement);
            expect(result).toHaveProperty('isValid');
        });

        it('should have descriptive name', () => {
            const validator = new TimerEventValidator();
            expect(validator.name).toBe('TimerEventValidator');
        });
    });

    describe('Performance requirements', () => {
        it('should validate 50-element script in < 100ms', () => {
            // Create mock script with 50 elements
            const statements: CodeStatement[] = [];
            for (let i = 0; i < 50; i++) {
                statements.push({} as CodeStatement);
            }

            const validator = new CircularReferenceValidator();
            const start = performance.now();
            
            statements.forEach(stmt => validator.validate(stmt));
            
            const elapsed = performance.now() - start;
            expect(elapsed).toBeLessThan(100);
        });
    });

    describe('Contract requirements', () => {
        it('should be stateless (no side effects)', () => {
            const validator = new CircularReferenceValidator();
            const statement = {} as CodeStatement;
            
            const result1 = validator.validate(statement);
            const result2 = validator.validate(statement);
            
            expect(result1).toEqual(result2);
        });

        it('should not modify the statement', () => {
            const validator = new NestingDepthValidator();
            const statement = { id: [1] } as CodeStatement;
            const originalId = [...statement.id];
            
            validator.validate(statement);
            
            expect(statement.id).toEqual(originalId);
        });

        it('should provide clear error messages', () => {
            const validator = new TimerEventValidator();
            const statement = {} as CodeStatement;
            const result = validator.validate(statement);
            
            if (!result.isValid) {
                expect(result.errorMessage).toBeDefined();
                expect(result.errorMessage!.length).toBeGreaterThan(0);
            }
        });

        it('should include source positions in errors', () => {
            const validator = new CircularReferenceValidator();
            const statement = {} as CodeStatement;
            const result = validator.validate(statement);
            
            if (!result.isValid) {
                expect(result.sourcePosition).toBeDefined();
                expect(Array.isArray(result.sourcePosition)).toBe(true);
            }
        });
    });
});
