/**
 * Contract Test: ChildAdvancementBehavior
 * 
 * Purpose: Test constructor, onNext() sequential advancement, completion tracking
 * Success Criteria: Tests fail (no implementation), validate onNext returns empty when complete
 * Performance: Validate onNext < 5ms requirement
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeStatement } from '../../../../src/CodeStatement';
import { IScriptRuntime } from '../../../../src/runtime/IScriptRuntime';
import { IRuntimeBlock } from '../../../../src/runtime/IRuntimeBlock';

// Import will fail until implementation exists
import { ChildAdvancementBehavior } from '../../../../src/runtime/behaviors/ChildAdvancementBehavior';

describe('ChildAdvancementBehavior - Contract Tests', () => {
    let mockRuntime: IScriptRuntime;
    let mockBlock: IRuntimeBlock;
    let testChildren: CodeStatement[];

    beforeEach(() => {
        // Create mock runtime
        mockRuntime = {
            jit: {
                compile: vi.fn()
            }
        } as any;

        // Create mock block
        mockBlock = {
            key: { toString: () => 'test-block' },
            sourceId: [0, 0]
        } as any;

        // Create test children
        testChildren = [
            { id: [0, 0, 0], sourceId: [0, 0, 0] } as CodeStatement,
            { id: [0, 0, 1], sourceId: [0, 0, 1] } as CodeStatement,
            { id: [0, 0, 2], sourceId: [0, 0, 2] } as CodeStatement
        ];
    });

    describe('Constructor', () => {
        it('should construct with valid children array', () => {
            const behavior = new ChildAdvancementBehavior(testChildren);
            expect(behavior).toBeDefined();
        });

        it('should construct with empty children array', () => {
            const behavior = new ChildAdvancementBehavior([]);
            expect(behavior).toBeDefined();
        });

        it('should initialize currentChildIndex to 0', () => {
            const behavior = new ChildAdvancementBehavior(testChildren);
            expect(behavior.getCurrentChildIndex()).toBe(0);
        });

        it('should store children as readonly array', () => {
            const behavior = new ChildAdvancementBehavior(testChildren);
            const children = behavior.getChildren();
            expect(children).toEqual(testChildren);
            expect(children.length).toBe(3);
        });
    });

    describe('onNext() - Sequential Advancement', () => {
        it('should return empty array when complete (no children)', () => {
            const behavior = new ChildAdvancementBehavior([]);
            const actions = behavior.onNext?.(mockRuntime, mockBlock);
            expect(actions).toEqual([]);
        });

        it('should advance index on each onNext call', () => {
            const behavior = new ChildAdvancementBehavior(testChildren);
            
            expect(behavior.getCurrentChildIndex()).toBe(0);
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(behavior.getCurrentChildIndex()).toBe(1);
            
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(behavior.getCurrentChildIndex()).toBe(2);
            
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(behavior.getCurrentChildIndex()).toBe(3);
        });

        it('should return empty array after all children processed', () => {
            const behavior = new ChildAdvancementBehavior(testChildren);
            
            // Advance through all children
            behavior.onNext?.(mockRuntime, mockBlock);
            behavior.onNext?.(mockRuntime, mockBlock);
            behavior.onNext?.(mockRuntime, mockBlock);
            
            // Should be complete now
            const actions = behavior.onNext?.(mockRuntime, mockBlock);
            expect(actions).toEqual([]);
        });

        it('should not advance beyond children length', () => {
            const behavior = new ChildAdvancementBehavior(testChildren);
            
            // Call onNext 5 times (more than children count)
            for (let i = 0; i < 5; i++) {
                behavior.onNext?.(mockRuntime, mockBlock);
            }
            
            // Index should not exceed children length
            expect(behavior.getCurrentChildIndex()).toBe(testChildren.length);
        });
    });

    describe('Completion Tracking', () => {
        it('should report not complete initially with children', () => {
            const behavior = new ChildAdvancementBehavior(testChildren);
            expect(behavior.isComplete()).toBe(false);
        });

        it('should report complete with empty children', () => {
            const behavior = new ChildAdvancementBehavior([]);
            expect(behavior.isComplete()).toBe(true);
        });

        it('should report complete after processing all children', () => {
            const behavior = new ChildAdvancementBehavior(testChildren);
            
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(behavior.isComplete()).toBe(false);
            
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(behavior.isComplete()).toBe(false);
            
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(behavior.isComplete()).toBe(true);
        });
    });

    describe('Performance Requirements', () => {
        it('should complete onNext in < 5ms', () => {
            const behavior = new ChildAdvancementBehavior(testChildren);
            
            const start = performance.now();
            behavior.onNext?.(mockRuntime, mockBlock);
            const end = performance.now();
            
            const duration = end - start;
            expect(duration).toBeLessThan(5);
        });

        it('should handle 100 calls in < 500ms total (avg < 5ms)', () => {
            const manyChildren = Array.from({ length: 100 }, (_, i) => ({
                id: [0, 0, i],
                sourceId: [0, 0, i]
            } as CodeStatement));
            
            const behavior = new ChildAdvancementBehavior(manyChildren);
            
            const start = performance.now();
            for (let i = 0; i < 100; i++) {
                behavior.onNext?.(mockRuntime, mockBlock);
            }
            const end = performance.now();
            
            const totalDuration = end - start;
            expect(totalDuration).toBeLessThan(500);
        });
    });

    describe('Immutability', () => {
        it('should not allow children array modification', () => {
            const behavior = new ChildAdvancementBehavior(testChildren);
            const children = behavior.getChildren();
            
            // TypeScript readonly prevents this, but test runtime behavior
            expect(() => {
                (children as any).push({ id: [999] });
            }).toThrow();
        });

        it('should maintain original children reference', () => {
            const behavior = new ChildAdvancementBehavior(testChildren);
            const children1 = behavior.getChildren();
            const children2 = behavior.getChildren();
            
            expect(children1).toBe(children2);
        });
    });
});
