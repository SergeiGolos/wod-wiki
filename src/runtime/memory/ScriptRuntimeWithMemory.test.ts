import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptRuntimeWithMemory } from '../ScriptRuntimeWithMemory';
import { RuntimeBlockWithMemoryBase } from '../RuntimeBlockWithMemoryBase';
import { WodScript } from '../../WodScript';
import { JitCompiler } from '../JitCompiler';
import { BlockKey } from '../../BlockKey';
import { EventHandler, IRuntimeEvent } from '../EventHandler';
import { IResultSpanBuilder } from '../ResultSpanBuilder';
import { RuntimeMetric } from '../RuntimeMetric';
import { IMetricInheritance } from '../IMetricInheritance';

// Mock implementations for testing
class TestBlock extends RuntimeBlockWithMemoryBase {
    key = new BlockKey('test-block');
    spans = {} as IResultSpanBuilder;
    handlers: EventHandler[] = [];
    metrics: RuntimeMetric[] = [];
    parent?: import("./IRuntimeBlock").IRuntimeBlock | undefined;

    tick(): IRuntimeEvent[] {
        return [];
    }

    isDone(): boolean {
        return false;
    }

    reset(): void {}

    inherit(): IMetricInheritance[] {
        return [];
    }
}

describe('ScriptRuntimeWithMemory', () => {
    let runtime: ScriptRuntimeWithMemory;
    let mockScript: WodScript;
    let mockCompiler: JitCompiler;

    beforeEach(() => {
        // Create minimal mocks
        mockScript = {} as WodScript;
        mockCompiler = {} as JitCompiler;
        
        runtime = new ScriptRuntimeWithMemory(mockScript, mockCompiler);
        runtime.initialize();
    });

    describe('memory integration', () => {
        it('should provide memory and debugMemory interfaces', () => {
            expect(runtime.memory).toBeDefined();
            expect(runtime.debugMemory).toBeDefined();
            expect(typeof runtime.memory.allocate).toBe('function');
            expect(typeof runtime.debugMemory.getMemorySnapshot).toBe('function');
        });

        it('should allocate memory through the memory interface', () => {
            const memRef = runtime.memory.allocate<string>('test-type', 'test-value', 'test-owner');
            
            expect(memRef.isValid()).toBe(true);
            expect(memRef.type).toBe('test-type');
            expect(memRef.get()).toBe('test-value');
        });

        it('should provide debug memory snapshot', () => {
            runtime.memory.allocate<string>('string-type', 'value1', 'owner1');
            runtime.memory.allocate<number>('number-type', 42, 'owner2');

            const snapshot = runtime.getMemorySnapshot();

            expect(snapshot.entries).toHaveLength(2);
            expect(snapshot.totalAllocated).toBe(2);
            expect(snapshot.summary.byType).toEqual({
                'string-type': 1,
                'number-type': 1
            });
        });
    });

    describe('block memory integration', () => {
        it('should set runtime context when pushing memory-aware blocks', () => {
            const block = new TestBlock();
            const setRuntimeSpy = vi.spyOn(block, 'setRuntime');

            runtime.stack.push(block);

            expect(setRuntimeSpy).toHaveBeenCalledWith(runtime);
        });

        it('should allow blocks to allocate memory', () => {
            const block = new TestBlock();
            runtime.stack.push(block);

            const memRef = block.allocateMemory<string>('block-state', 'initial-state');

            expect(memRef.isValid()).toBe(true);
            expect(memRef.type).toBe('block-state');
            expect(memRef.get()).toBe('initial-state');
            expect(block.memory).toHaveLength(1);
            expect(block.memory[0]).toBe(memRef);
        });

        it('should allow blocks to retrieve memory by type', () => {
            const block = new TestBlock();
            runtime.stack.push(block);

            const memRef1 = block.allocateMemory<string>('state', 'value1');
            const memRef2 = block.allocateMemory<number>('counter', 42);

            expect(block.getMemory<string>('state')).toBe(memRef1);
            expect(block.getMemory<number>('counter')).toBe(memRef2);
            expect(block.getMemory<boolean>('nonexistent')).toBeUndefined();
        });

        it('should clean up block memory when popped from stack', () => {
            const block = new TestBlock();
            runtime.stack.push(block);

            const memRef1 = block.allocateMemory<string>('state', 'value1');
            const memRef2 = block.allocateMemory<number>('counter', 42);

            expect(memRef1.isValid()).toBe(true);
            expect(memRef2.isValid()).toBe(true);

            // Pop the block from the stack
            const poppedBlock = runtime.stack.pop();

            expect(poppedBlock).toBe(block);
            expect(memRef1.isValid()).toBe(false);
            expect(memRef2.isValid()).toBe(false);
            expect(block.memory).toHaveLength(0);
        });

        it('should call onMemoryCleanup when block is popped', () => {
            const block = new TestBlock();
            const cleanupSpy = vi.fn();
            block.onMemoryCleanup = cleanupSpy;

            runtime.stack.push(block);
            block.allocateMemory<string>('state', 'value');

            runtime.stack.pop();

            expect(cleanupSpy).toHaveBeenCalled();
        });
    });

    describe('debugging capabilities', () => {
        it('should enable independent memory state inspection', () => {
            const block1 = new TestBlock();
            const block2 = new TestBlock();
            
            runtime.stack.push(block1);
            runtime.stack.push(block2);

            const mem1 = block1.allocateMemory<string>('block1-state', 'state1');
            const mem2 = block2.allocateMemory<number>('block2-state', 100);

            // Get debug view without affecting execution
            const snapshot = runtime.debugMemory.getMemorySnapshot();

            expect(snapshot.entries).toHaveLength(2);
            
            // Verify we can inspect memory by owner
            const block1Memory = runtime.debugMemory.getByOwner(block1.key.toString());
            const block2Memory = runtime.debugMemory.getByOwner(block2.key.toString());

            expect(block1Memory).toHaveLength(1);
            expect(block2Memory).toHaveLength(1);
            expect(block1Memory[0].value).toBe('state1');
            expect(block2Memory[0].value).toBe(100);

            // Verify original references are still valid during debugging
            expect(mem1.isValid()).toBe(true);
            expect(mem2.isValid()).toBe(true);
        });

        it('should show memory hierarchy for nested allocations', () => {
            const block = new TestBlock();
            runtime.stack.push(block);

            const parentMem = block.allocateMemory<string>('parent-state', 'parent');
            const childMem1 = parentMem.createChild<string>('child-state', 'child1');
            const childMem2 = parentMem.createChild<string>('child-state', 'child2');

            const hierarchy = runtime.getMemoryHierarchy();

            expect(hierarchy.roots).toHaveLength(1);
            expect(hierarchy.roots[0].entry.value).toBe('parent');
            expect(hierarchy.roots[0].children).toHaveLength(2);
        });
    });
});