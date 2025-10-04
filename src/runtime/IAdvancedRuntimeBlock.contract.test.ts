/**
 * Contract Test: IAdvancedRuntimeBlock
 * 
 * These tests validate the contract requirements for advanced runtime blocks
 * with proper advancement tracking and lazy child compilation.
 * 
 * Expected: All tests FAIL initially (TDD requirement)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BlockKey } from '../../src/BlockKey';
import { CodeStatement } from '../../src/CodeStatement';

// This interface is defined in the contract but not implemented yet
interface IAdvancedRuntimeBlock {
    readonly key: BlockKey;
    readonly sourceId: number[];
    readonly currentChildIndex: number;
    readonly children: CodeStatement[];
    readonly parentContext: IAdvancedRuntimeBlock | undefined;
    readonly isComplete: boolean;
    push(): any[];
    next(): any[];
    pop(): any[];
    dispose(): void;
}

describe('IAdvancedRuntimeBlock Contract Tests', () => {
    describe('Leaf block behavior (no children)', () => {
        it('should have currentChildIndex = 0 for leaf blocks', () => {
            // This will FAIL - no implementation yet
            const block: IAdvancedRuntimeBlock = {} as any;
            expect(block.currentChildIndex).toBe(0);
        });

        it('should have empty children array for leaf blocks', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            expect(block.children).toEqual([]);
        });

        it('should return empty array from next() for leaf blocks', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            expect(block.next()).toEqual([]);
        });

        it('should set isComplete = true for leaf blocks', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            expect(block.isComplete).toBe(true);
        });
    });

    describe('Parent block with one child', () => {
        it('should start with currentChildIndex = 0', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            expect(block.currentChildIndex).toBe(0);
        });

        it('should have children.length = 1', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            expect(block.children.length).toBe(1);
        });

        it('should compile child on first next() and return NextAction', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            const actions = block.next();
            expect(actions.length).toBeGreaterThan(0);
            expect(actions[0]).toHaveProperty('type');
        });

        it('should increment currentChildIndex after first next()', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            block.next();
            expect(block.currentChildIndex).toBe(1);
        });

        it('should return empty array on second next()', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            block.next(); // First child
            const secondActions = block.next(); // No more children
            expect(secondActions).toEqual([]);
        });

        it('should set isComplete = true after all children processed', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            block.next(); // Process child
            block.next(); // Exhaust children
            expect(block.isComplete).toBe(true);
        });
    });

    describe('Parent block with multiple children', () => {
        it('should compile children sequentially', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            const firstActions = block.next();
            expect(firstActions.length).toBeGreaterThan(0);
            expect(block.currentChildIndex).toBe(1);
            
            const secondActions = block.next();
            expect(secondActions.length).toBeGreaterThan(0);
            expect(block.currentChildIndex).toBe(2);
        });

        it('should return empty array only when all children exhausted', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            block.next(); // Child 1
            block.next(); // Child 2
            block.next(); // Child 3
            const finalActions = block.next(); // No more children
            expect(finalActions).toEqual([]);
        });

        it('should maintain currentChildIndex <= children.length', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            while (block.next().length > 0) {
                expect(block.currentChildIndex).toBeLessThanOrEqual(block.children.length);
            }
        });
    });

    describe('Disposal behavior', () => {
        it('should clear parentContext on dispose()', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            block.dispose();
            expect(block.parentContext).toBeUndefined();
        });

        it('should clear children array on dispose()', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            block.dispose();
            expect(block.children.length).toBe(0);
        });

        it('should be idempotent (safe to call multiple times)', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            expect(() => {
                block.dispose();
                block.dispose();
                block.dispose();
            }).not.toThrow();
        });

        it('should not throw exceptions on dispose()', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            expect(() => block.dispose()).not.toThrow();
        });
    });

    describe('Performance requirements', () => {
        it('should complete push() in < 1ms', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            const start = performance.now();
            block.push();
            const elapsed = performance.now() - start;
            expect(elapsed).toBeLessThan(1);
        });

        it('should complete pop() in < 1ms', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            const start = performance.now();
            block.pop();
            const elapsed = performance.now() - start;
            expect(elapsed).toBeLessThan(1);
        });

        it('should complete next() in < 5ms (including compilation)', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            const start = performance.now();
            block.next();
            const elapsed = performance.now() - start;
            expect(elapsed).toBeLessThan(5);
        });

        it('should complete dispose() in < 50ms', () => {
            const block: IAdvancedRuntimeBlock = {} as any;
            const start = performance.now();
            block.dispose();
            const elapsed = performance.now() - start;
            expect(elapsed).toBeLessThan(50);
        });
    });
});
