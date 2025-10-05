/**
 * Contract Test: CompletionTrackingBehavior
 * 
 * Purpose: Test constructor, onNext() completion detection, state transitions
 * Success Criteria: Tests fail (no implementation), validate completion flag updates correctly
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeStatement } from '../../../../src/CodeStatement';
import { IScriptRuntime } from '../../../../src/runtime/IScriptRuntime';
import { IRuntimeBlock } from '../../../../src/runtime/IRuntimeBlock';

// Import will fail until implementation exists
import { CompletionTrackingBehavior } from '../../../../src/runtime/behaviors/CompletionTrackingBehavior';
import { ChildAdvancementBehavior } from '../../../../src/runtime/behaviors/ChildAdvancementBehavior';

describe('CompletionTrackingBehavior - Contract Tests', () => {
    let mockRuntime: IScriptRuntime;
    let mockBlock: IRuntimeBlock;
    let testChildren: CodeStatement[];
    let childBehavior: ChildAdvancementBehavior;

    beforeEach(() => {
        mockRuntime = {
            jit: { compile: vi.fn() }
        } as any;

        testChildren = [
            { id: [0, 0, 0], sourceId: [0, 0, 0] } as CodeStatement,
            { id: [0, 0, 1], sourceId: [0, 0, 1] } as CodeStatement
        ];

        childBehavior = new ChildAdvancementBehavior(testChildren);

        mockBlock = {
            key: { toString: () => 'test-block' },
            sourceId: [0, 0],
            getBehavior: vi.fn((type: any) => {
                if (type === ChildAdvancementBehavior) {
                    return childBehavior;
                }
                return undefined;
            })
        } as any;
    });

    describe('Constructor', () => {
        it('should construct with no parameters', () => {
            const behavior = new CompletionTrackingBehavior();
            expect(behavior).toBeDefined();
        });

        it('should initialize with incomplete state', () => {
            const behavior = new CompletionTrackingBehavior();
            expect(behavior.getIsComplete()).toBe(false);
        });
    });

    describe('Completion State Tracking', () => {
        it('should start in incomplete state', () => {
            const behavior = new CompletionTrackingBehavior();
            expect(behavior.getIsComplete()).toBe(false);
        });

        it('should detect completion when ChildAdvancementBehavior completes', () => {
            const behavior = new CompletionTrackingBehavior();
            
            // Advance through all children
            childBehavior.onNext?.(mockRuntime, mockBlock);
            childBehavior.onNext?.(mockRuntime, mockBlock);
            
            // Should now be complete
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(behavior.getIsComplete()).toBe(true);
        });

        it('should remain incomplete while children remain', () => {
            const behavior = new CompletionTrackingBehavior();
            
            // Advance through first child only
            childBehavior.onNext?.(mockRuntime, mockBlock);
            
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(behavior.getIsComplete()).toBe(false);
        });

        it('should mark complete immediately for empty children', () => {
            const emptyChildBehavior = new ChildAdvancementBehavior([]);
            const emptyBlock = {
                ...mockBlock,
                getBehavior: vi.fn(() => emptyChildBehavior)
            } as any;
            
            const behavior = new CompletionTrackingBehavior();
            behavior.onNext?.(mockRuntime, emptyBlock);
            
            expect(behavior.getIsComplete()).toBe(true);
        });
    });

    describe('State Transitions', () => {
        it('should transition from incomplete to complete only once', () => {
            const behavior = new CompletionTrackingBehavior();
            
            expect(behavior.getIsComplete()).toBe(false);
            
            // Complete all children
            childBehavior.onNext?.(mockRuntime, mockBlock);
            childBehavior.onNext?.(mockRuntime, mockBlock);
            behavior.onNext?.(mockRuntime, mockBlock);
            
            expect(behavior.getIsComplete()).toBe(true);
            
            // Multiple calls should not change state
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(behavior.getIsComplete()).toBe(true);
        });

        it('should not transition back to incomplete', () => {
            const behavior = new CompletionTrackingBehavior();
            
            // Mark complete explicitly
            behavior.markComplete();
            expect(behavior.getIsComplete()).toBe(true);
            
            // Should remain complete
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(behavior.getIsComplete()).toBe(true);
        });
    });

    describe('markComplete() Method', () => {
        it('should explicitly mark as complete', () => {
            const behavior = new CompletionTrackingBehavior();
            
            expect(behavior.getIsComplete()).toBe(false);
            behavior.markComplete();
            expect(behavior.getIsComplete()).toBe(true);
        });

        it('should allow early completion marking', () => {
            const behavior = new CompletionTrackingBehavior();
            
            // Mark complete before any children processed
            behavior.markComplete();
            expect(behavior.getIsComplete()).toBe(true);
        });
    });

    describe('onNext() Return Value', () => {
        it('should return empty array when incomplete', () => {
            const behavior = new CompletionTrackingBehavior();
            const actions = behavior.onNext?.(mockRuntime, mockBlock);
            expect(actions).toEqual([]);
        });

        it('should return empty array when complete', () => {
            const behavior = new CompletionTrackingBehavior();
            behavior.markComplete();
            const actions = behavior.onNext?.(mockRuntime, mockBlock);
            expect(actions).toEqual([]);
        });
    });

    describe('Integration with ChildAdvancementBehavior', () => {
        it('should observe ChildAdvancementBehavior completion', () => {
            const behavior = new CompletionTrackingBehavior();
            
            // Process all children
            for (let i = 0; i < testChildren.length; i++) {
                childBehavior.onNext?.(mockRuntime, mockBlock);
            }
            
            // CompletionTracking should detect completion
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(behavior.getIsComplete()).toBe(childBehavior.isComplete());
        });

        it('should handle missing ChildAdvancementBehavior', () => {
            const blockWithoutChild = {
                ...mockBlock,
                getBehavior: vi.fn(() => undefined)
            } as any;
            
            const behavior = new CompletionTrackingBehavior();
            
            // Should not throw
            expect(() => {
                behavior.onNext?.(mockRuntime, blockWithoutChild);
            }).not.toThrow();
        });
    });

    describe('Performance Requirements', () => {
        it('should complete onNext in < 1ms', () => {
            const behavior = new CompletionTrackingBehavior();
            
            const start = performance.now();
            behavior.onNext?.(mockRuntime, mockBlock);
            const end = performance.now();
            
            const duration = end - start;
            expect(duration).toBeLessThan(1);
        });

        it('should complete getIsComplete in < 0.1ms', () => {
            const behavior = new CompletionTrackingBehavior();
            
            const start = performance.now();
            for (let i = 0; i < 1000; i++) {
                behavior.getIsComplete();
            }
            const end = performance.now();
            
            const avgDuration = (end - start) / 1000;
            expect(avgDuration).toBeLessThan(0.1);
        });
    });
});
