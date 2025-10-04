/**
 * Contract Test: IStackValidator
 * 
 * These tests validate the contract requirements for runtime stack validation
 * to ensure stack integrity during execution.
 * 
 * Expected: All tests FAIL initially (TDD requirement)
 */

import { describe, it, expect } from 'vitest';
import { IRuntimeBlock } from '../../src/runtime/IRuntimeBlock';
import { BlockKey } from '../../src/BlockKey';

// This interface is defined in the contract but not implemented yet
interface IStackValidator {
    validatePush(block: IRuntimeBlock, currentDepth: number): void;
    validatePop(currentDepth: number): void;
}

// This class doesn't exist yet - tests will fail
declare class StackValidator implements IStackValidator {
    validatePush(block: IRuntimeBlock, currentDepth: number): void;
    validatePop(currentDepth: number): void;
}

describe('IStackValidator Contract Tests', () => {
    describe('validatePush', () => {
        it('should reject null block', () => {
            // This will FAIL - validator not implemented yet
            const validator = new StackValidator();
            expect(() => {
                validator.validatePush(null as any, 0);
            }).toThrow(TypeError);
        });

        it('should reject undefined block', () => {
            const validator = new StackValidator();
            expect(() => {
                validator.validatePush(undefined as any, 0);
            }).toThrow(TypeError);
        });

        it('should reject block without key', () => {
            const validator = new StackValidator();
            const block = { sourceId: [1] } as any;
            expect(() => {
                validator.validatePush(block, 0);
            }).toThrow(TypeError);
        });

        it('should reject block without sourceId', () => {
            const validator = new StackValidator();
            const block = { key: 'test-key' as BlockKey } as any;
            expect(() => {
                validator.validatePush(block, 0);
            }).toThrow(TypeError);
        });

        it('should reject push at depth 10 (overflow)', () => {
            const validator = new StackValidator();
            const block = {
                key: 'test-key' as BlockKey,
                sourceId: [1]
            } as IRuntimeBlock;
            expect(() => {
                validator.validatePush(block, 10);
            }).toThrow(TypeError);
            expect(() => {
                validator.validatePush(block, 10);
            }).toThrow(/overflow|maximum depth/i);
        });

        it('should accept valid push at depth < 10', () => {
            const validator = new StackValidator();
            const block = {
                key: 'test-key' as BlockKey,
                sourceId: [1]
            } as IRuntimeBlock;
            expect(() => {
                validator.validatePush(block, 5);
            }).not.toThrow();
        });

        it('should include stack state in error messages', () => {
            const validator = new StackValidator();
            try {
                validator.validatePush(null as any, 5);
                expect.fail('Should have thrown');
            } catch (error: any) {
                expect(error.message).toMatch(/stack|block/i);
            }
        });
    });

    describe('validatePop', () => {
        it('should reject pop from empty stack', () => {
            // This will FAIL - validator not implemented yet
            const validator = new StackValidator();
            expect(() => {
                validator.validatePop(0);
            }).toThrow(Error);
            expect(() => {
                validator.validatePop(0);
            }).toThrow(/empty/i);
        });

        it('should accept pop from non-empty stack', () => {
            const validator = new StackValidator();
            expect(() => {
                validator.validatePop(5);
            }).not.toThrow();
        });

        it('should accept pop at depth 1', () => {
            const validator = new StackValidator();
            expect(() => {
                validator.validatePop(1);
            }).not.toThrow();
        });
    });

    describe('Performance requirements', () => {
        it('should complete validatePush in < 0.1ms', () => {
            const validator = new StackValidator();
            const block = {
                key: 'test-key' as BlockKey,
                sourceId: [1]
            } as IRuntimeBlock;

            const start = performance.now();
            validator.validatePush(block, 5);
            const elapsed = performance.now() - start;
            
            expect(elapsed).toBeLessThan(0.1);
        });

        it('should complete validatePop in < 0.1ms', () => {
            const validator = new StackValidator();

            const start = performance.now();
            validator.validatePop(5);
            const elapsed = performance.now() - start;
            
            expect(elapsed).toBeLessThan(0.1);
        });

        it('should maintain O(1) complexity', () => {
            const validator = new StackValidator();
            const block = {
                key: 'test-key' as BlockKey,
                sourceId: [1]
            } as IRuntimeBlock;

            // Time at depth 1
            const start1 = performance.now();
            validator.validatePush(block, 1);
            const time1 = performance.now() - start1;

            // Time at depth 9
            const start9 = performance.now();
            validator.validatePush(block, 9);
            const time9 = performance.now() - start9;

            // Should be roughly the same time (O(1))
            expect(time9).toBeLessThan(time1 * 2); // Allow for some variance
        });
    });

    describe('Error message quality', () => {
        it('should provide clear error for null block', () => {
            const validator = new StackValidator();
            try {
                validator.validatePush(null as any, 0);
                expect.fail('Should have thrown');
            } catch (error: any) {
                expect(error.message).toMatch(/null|undefined/i);
            }
        });

        it('should provide clear error for missing key', () => {
            const validator = new StackValidator();
            const block = { sourceId: [1] } as any;
            try {
                validator.validatePush(block, 0);
                expect.fail('Should have thrown');
            } catch (error: any) {
                expect(error.message).toMatch(/key/i);
            }
        });

        it('should provide clear error for stack overflow', () => {
            const validator = new StackValidator();
            const block = {
                key: 'test-key' as BlockKey,
                sourceId: [1]
            } as IRuntimeBlock;
            try {
                validator.validatePush(block, 10);
                expect.fail('Should have thrown');
            } catch (error: any) {
                expect(error.message).toMatch(/overflow|maximum|depth/i);
            }
        });

        it('should provide clear error for empty stack pop', () => {
            const validator = new StackValidator();
            try {
                validator.validatePop(0);
                expect.fail('Should have thrown');
            } catch (error: any) {
                expect(error.message).toMatch(/empty/i);
            }
        });
    });
});
