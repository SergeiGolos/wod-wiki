/**
 * Contract Test: LazyCompilationBehavior
 * 
 * Purpose: Test constructor, onNext() lazy compilation, error handling
 * Success Criteria: Tests fail (no implementation), validate JIT integration, ErrorRuntimeBlock on failure
 * Performance: Validate compilation within budget
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CodeStatement } from '../../../../src/CodeStatement';
import { IScriptRuntime } from '../../../../src/runtime/IScriptRuntime';
import { IRuntimeBlock } from '../../../../src/runtime/IRuntimeBlock';
import { PushBlockAction } from '../../../../src/runtime/PushBlockAction';

// Import will fail until implementation exists
import { LazyCompilationBehavior } from '../../../../src/runtime/behaviors/LazyCompilationBehavior';
import { ChildAdvancementBehavior } from '../../../../src/runtime/behaviors/ChildAdvancementBehavior';

describe('LazyCompilationBehavior - Contract Tests', () => {
    let mockRuntime: IScriptRuntime;
    let mockBlock: IRuntimeBlock;
    let testChildren: CodeStatement[];
    let compiledBlock: IRuntimeBlock;

    beforeEach(() => {
        // Create compiled block mock
        compiledBlock = {
            key: { toString: () => 'compiled-block' },
            sourceId: [0, 0, 0],
            push: vi.fn(() => []),
            next: vi.fn(() => []),
            pop: vi.fn(() => []),
            dispose: vi.fn()
        } as any;

        // Create mock runtime with JIT compiler
        mockRuntime = {
            jit: {
                compile: vi.fn((statements: CodeStatement[]) => compiledBlock)
            }
        } as any;

        // Create test children
        testChildren = [
            { id: [0, 0, 0], sourceId: [0, 0, 0] } as CodeStatement,
            { id: [0, 0, 1], sourceId: [0, 0, 1] } as CodeStatement
        ];

        // Create mock block with ChildAdvancementBehavior
        const childBehavior = new ChildAdvancementBehavior(testChildren);
        mockBlock = {
            key: { toString: () => 'test-block' },
            sourceId: [0, 0],
            // Mock getBehavior to return child advancement behavior
            getBehavior: vi.fn((type: any) => {
                if (type === ChildAdvancementBehavior) {
                    return childBehavior;
                }
                return undefined;
            })
        } as any;
    });

    describe('Constructor', () => {
        it('should construct with default caching disabled', () => {
            const behavior = new LazyCompilationBehavior();
            expect(behavior).toBeDefined();
        });

        it('should construct with caching enabled', () => {
            const behavior = new LazyCompilationBehavior(true);
            expect(behavior).toBeDefined();
        });

        it('should construct with caching disabled explicitly', () => {
            const behavior = new LazyCompilationBehavior(false);
            expect(behavior).toBeDefined();
        });
    });

    describe('onNext() - Lazy Compilation', () => {
        it('should compile current child using JIT', () => {
            const behavior = new LazyCompilationBehavior();
            const childBehavior = mockBlock.getBehavior?.(ChildAdvancementBehavior) as ChildAdvancementBehavior;
            
            // Call onNext which should trigger compilation
            behavior.onNext?.(mockRuntime, mockBlock);
            
            // Verify JIT compile was called with current child
            expect(mockRuntime.jit.compile).toHaveBeenCalledWith(
                [testChildren[0]],
                mockRuntime
            );
        });

        it('should return PushBlockAction with compiled block on success', () => {
            const behavior = new LazyCompilationBehavior();
            
            const actions = behavior.onNext?.(mockRuntime, mockBlock);
            
            expect(actions).toBeDefined();
            expect(actions?.length).toBe(1);
            expect(actions?.[0]).toBeInstanceOf(PushBlockAction);
            expect((actions?.[0] as PushBlockAction).block).toBe(compiledBlock);
        });

        it('should handle compilation errors gracefully', () => {
            // Make JIT throw error
            (mockRuntime.jit.compile as any).mockImplementation(() => {
                throw new Error('Compilation failed');
            });
            
            const behavior = new LazyCompilationBehavior();
            
            // Should not throw, but return empty array
            const actions = behavior.onNext?.(mockRuntime, mockBlock);
            
            expect(actions).toBeDefined();
            expect(actions?.length).toBe(0);
            // TODO: Should return PushBlockAction with ErrorRuntimeBlock in future
        });

        it('should compile different children sequentially', () => {
            const behavior = new LazyCompilationBehavior();
            const childBehavior = mockBlock.getBehavior?.(ChildAdvancementBehavior) as ChildAdvancementBehavior;
            
            // First call - should compile first child
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(mockRuntime.jit.compile).toHaveBeenCalledWith([testChildren[0]], mockRuntime);
            
            // Advance to next child
            childBehavior.onNext?.(mockRuntime, mockBlock);
            
            // Second call - should compile second child
            vi.clearAllMocks();
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(mockRuntime.jit.compile).toHaveBeenCalledWith([testChildren[1]], mockRuntime);
        });
    });

    describe('Caching Behavior', () => {
        it('should not cache when caching disabled', () => {
            const behavior = new LazyCompilationBehavior(false);
            
            // Compile same child twice
            behavior.onNext?.(mockRuntime, mockBlock);
            behavior.onNext?.(mockRuntime, mockBlock);
            
            // Should call JIT twice
            expect(mockRuntime.jit.compile).toHaveBeenCalledTimes(2);
        });

        it('should cache when caching enabled', () => {
            const behavior = new LazyCompilationBehavior(true);
            
            // Compile same child twice
            behavior.onNext?.(mockRuntime, mockBlock);
            const firstCall = mockRuntime.jit.compile;
            
            behavior.onNext?.(mockRuntime, mockBlock);
            
            // Should call JIT only once (second from cache)
            expect(mockRuntime.jit.compile).toHaveBeenCalledTimes(1);
        });

        it('should clear cache when clearCache called', () => {
            const behavior = new LazyCompilationBehavior(true);
            
            // Compile and cache
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(mockRuntime.jit.compile).toHaveBeenCalledTimes(1);
            
            // Clear cache
            behavior.clearCache();
            
            // Compile again - should call JIT again
            vi.clearAllMocks();
            behavior.onNext?.(mockRuntime, mockBlock);
            expect(mockRuntime.jit.compile).toHaveBeenCalledTimes(1);
        });
    });

    describe('Performance Requirements', () => {
        it('should complete onNext with compilation in < 10ms', () => {
            const behavior = new LazyCompilationBehavior();
            
            const start = performance.now();
            behavior.onNext?.(mockRuntime, mockBlock);
            const end = performance.now();
            
            const duration = end - start;
            expect(duration).toBeLessThan(10);
        });

        it('should benefit from caching on repeated compilations', () => {
            const behaviorNoCaching = new LazyCompilationBehavior(false);
            const behaviorWithCaching = new LazyCompilationBehavior(true);
            
            // Measure without caching
            const startNoCache = performance.now();
            for (let i = 0; i < 10; i++) {
                behaviorNoCaching.onNext?.(mockRuntime, mockBlock);
            }
            const endNoCache = performance.now();
            const noCacheDuration = endNoCache - startNoCache;
            
            // Measure with caching
            vi.clearAllMocks();
            const startCache = performance.now();
            for (let i = 0; i < 10; i++) {
                behaviorWithCaching.onNext?.(mockRuntime, mockBlock);
            }
            const endCache = performance.now();
            const cacheDuration = endCache - startCache;
            
            // Caching should be faster (or at least not significantly slower)
            expect(cacheDuration).toBeLessThanOrEqual(noCacheDuration * 1.1);
        });
    });

    describe('Integration with ChildAdvancementBehavior', () => {
        it('should get current child from ChildAdvancementBehavior', () => {
            const behavior = new LazyCompilationBehavior();
            
            behavior.onNext?.(mockRuntime, mockBlock);
            
            // Should have called getBehavior to get ChildAdvancementBehavior
            expect(mockBlock.getBehavior).toHaveBeenCalledWith(ChildAdvancementBehavior);
        });

        it('should handle missing ChildAdvancementBehavior gracefully', () => {
            const behavior = new LazyCompilationBehavior();
            const blockWithoutChild = {
                ...mockBlock,
                getBehavior: vi.fn(() => undefined)
            } as any;
            
            // Should not throw
            expect(() => {
                behavior.onNext?.(mockRuntime, blockWithoutChild);
            }).not.toThrow();
        });

        it('should return empty array when no children available', () => {
            const behavior = new LazyCompilationBehavior();
            const emptyChildBehavior = new ChildAdvancementBehavior([]);
            const blockWithEmptyChildren = {
                ...mockBlock,
                getBehavior: vi.fn(() => emptyChildBehavior)
            } as any;
            
            const actions = behavior.onNext?.(mockRuntime, blockWithEmptyChildren);
            expect(actions).toEqual([]);
        });
    });
});
