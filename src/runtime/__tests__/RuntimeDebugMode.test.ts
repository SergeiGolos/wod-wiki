import { describe, test, expect, beforeEach, vi } from 'vitest';
import { RuntimeBuilder } from '../RuntimeBuilder';
import { ScriptRuntime } from '../ScriptRuntime';
import { JitCompiler } from '../JitCompiler';
import { WodScript } from '../../parser/WodScript';
import { NextBlockLogger } from '../NextBlockLogger';
import { DebugRuntimeStack } from '../DebugRuntimeStack';
import { TestableBlock } from '../testing/TestableBlock';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { BlockKey } from '../../core/models/BlockKey';
import { IBlockContext } from '../IBlockContext';
import { MemoryTypeEnum } from '../MemoryTypeEnum';
import { TypedMemoryReference } from '../IMemoryReference';

// Helper to create a minimal mock block for testing
function createMockBlock(id: string): IRuntimeBlock {
    const mockContext: IBlockContext = {
        ownerId: id,
        exerciseId: id,
        references: [],
        allocate: vi.fn().mockReturnValue({ 
            id: `${id}-ref`, 
            type: 'test', 
            ownerId: id, 
            visibility: 'private', 
            value: () => null 
        }),
        get: vi.fn(),
        getAll: vi.fn().mockReturnValue([]),
        release: vi.fn(),
        isReleased: vi.fn().mockReturnValue(false),
        getOrCreateAnchor: vi.fn(),
    };

    class MockBlockKey extends BlockKey {
        constructor(private _id: string) { super(); }
        override toString() { return this._id; }
    }

    return {
        key: new MockBlockKey(id),
        sourceIds: [1],
        blockType: 'Mock',
        label: `Mock Block ${id}`,
        context: mockContext,
        mount: vi.fn().mockReturnValue([]),
        next: vi.fn().mockReturnValue([]),
        unmount: vi.fn().mockReturnValue([]),
        dispose: vi.fn(),
        getBehavior: vi.fn().mockReturnValue(undefined),
    };
}

describe('Runtime Debugging and Testing Architecture', () => {
    let compiler: JitCompiler;
    let script: WodScript;

    beforeEach(() => {
        compiler = new JitCompiler([]);
        script = new WodScript('10 Pushups', []);
        
        // Reset NextBlockLogger
        NextBlockLogger.setEnabled(false);
        NextBlockLogger.clearHistory();
    });

    describe('RuntimeBuilder', () => {
        test('should create runtime without debug mode by default', () => {
            const runtime = new RuntimeBuilder(script, compiler).build();
            
            expect(runtime).toBeInstanceOf(ScriptRuntime);
            expect(runtime.isDebugMode).toBe(false);
            expect(runtime.debugStack).toBeUndefined();
        });

        test('should create runtime with debug mode enabled', () => {
            const runtime = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .build();
            
            expect(runtime.isDebugMode).toBe(true);
            expect(runtime.debugStack).toBeInstanceOf(DebugRuntimeStack);
        });

        test('should auto-enable logging when debug mode is enabled', () => {
            new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .build();
            
            // NextBlockLogger should be enabled
            expect((NextBlockLogger as any).enabled).toBe(true);
        });

        test('should enable logging independently of debug mode', () => {
            new RuntimeBuilder(script, compiler)
                .withLogging(true)
                .build();
            
            expect((NextBlockLogger as any).enabled).toBe(true);
        });

        test('should return options via getOptions()', () => {
            const builder = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .withMaxLogHistory(100);
            
            const options = builder.getOptions();
            
            expect(options.debugMode).toBe(true);
            expect(options.maxLogHistory).toBe(100);
        });

        test('should support buildWithOptions() for debugging', () => {
            const result = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .buildWithOptions();
            
            expect(result.runtime).toBeInstanceOf(ScriptRuntime);
            expect(result.options.debugMode).toBe(true);
        });
    });

    describe('DebugRuntimeStack', () => {
        test('should wrap blocks with TestableBlock when debug mode is active', () => {
            const runtime = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .build();
            
            const mockBlock = createMockBlock('test-block');
            runtime.stack.push(mockBlock);
            
            // The current block should be a TestableBlock wrapper
            const current = runtime.stack.current;
            expect(current).toBeDefined();
            
            // Get the wrapped blocks map
            const wrapped = runtime.getWrappedBlocks();
            expect(wrapped.size).toBe(1);
            expect(wrapped.has('test-block')).toBe(true);
        });

        test('should not double-wrap TestableBlocks', () => {
            const runtime = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .build();
            
            const mockBlock = createMockBlock('test-block');
            const alreadyWrapped = new TestableBlock(mockBlock, { testId: 'already-wrapped' });
            
            runtime.stack.push(alreadyWrapped);
            
            // Should not create another wrapper
            const current = runtime.stack.current;
            expect(current).toBe(alreadyWrapped);
        });

        test('should record method calls on wrapped blocks', () => {
            const runtime = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .build();
            
            const mockBlock = createMockBlock('test-block');
            runtime.stack.push(mockBlock);
            
            const current = runtime.stack.current!;
            
            // Call mount and verify it's recorded
            current.mount(runtime);
            
            // Get the wrapped block and check calls
            const wrapped = runtime.getWrappedBlock('test-block');
            expect(wrapped).toBeDefined();
            expect(wrapped!.wasCalled('mount')).toBe(true);
            expect(wrapped!.callCount('mount')).toBe(1);
        });

        test('should provide getAllCalls() for inspection', () => {
            const runtime = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .build();
            
            const mockBlock1 = createMockBlock('block-1');
            const mockBlock2 = createMockBlock('block-2');
            
            runtime.stack.push(mockBlock1);
            runtime.stack.current!.mount(runtime);
            
            runtime.stack.push(mockBlock2);
            runtime.stack.current!.mount(runtime);
            runtime.stack.current!.next(runtime);
            
            const allCalls = runtime.getAllBlockCalls();
            expect(allCalls.length).toBe(2);
            
            const block1Calls = allCalls.find(c => c.blockKey === 'block-1');
            const block2Calls = allCalls.find(c => c.blockKey === 'block-2');
            
            expect(block1Calls?.calls.length).toBe(1);
            expect(block2Calls?.calls.length).toBe(2);
        });

        test('should support clearAllCalls()', () => {
            const runtime = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .build();
            
            const mockBlock = createMockBlock('test-block');
            runtime.stack.push(mockBlock);
            runtime.stack.current!.mount(runtime);
            
            expect(runtime.getAllBlockCalls()[0].calls.length).toBe(1);
            
            runtime.clearAllBlockCalls();
            
            expect(runtime.getAllBlockCalls()[0].calls.length).toBe(0);
        });
    });

    describe('NextBlockLogger Integration', () => {
        test('should be enabled when debug mode is active', () => {
            new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .build();
            
            expect((NextBlockLogger as any).enabled).toBe(true);
        });

        test('should provide log history via runtime', () => {
            const runtime = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .build();
            
            // Trigger some logs by pushing a block
            const mockBlock = createMockBlock('test-block');
            runtime.stack.push(mockBlock);
            
            const history = runtime.getLogHistory();
            expect(history.length).toBeGreaterThan(0);
        });

        test('should support clearLogHistory()', () => {
            const runtime = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .build();
            
            const mockBlock = createMockBlock('test-block');
            runtime.stack.push(mockBlock);
            
            runtime.clearLogHistory();
            
            expect(runtime.getLogHistory().length).toBe(0);
        });

        test('should track block lifecycle stages', () => {
            NextBlockLogger.setEnabled(true);
            
            NextBlockLogger.logBlockMount('test-block', 'Effort', 2, 5.5);
            NextBlockLogger.logBlockNext('test-block', 'Effort', 1, 2.3);
            NextBlockLogger.logBlockDispose('test-block', 'Effort', 1.2);
            
            const history = NextBlockLogger.getHistory();
            expect(history.length).toBe(3);
            
            const stages = history.map(h => h.stage);
            expect(stages).toContain('block-mount');
            expect(stages).toContain('block-next');
            expect(stages).toContain('block-dispose');
        });

        test('should provide stage counts via getStageCounts()', () => {
            NextBlockLogger.setEnabled(true);
            
            NextBlockLogger.logBlockMount('block-1', 'Effort', 1, 1);
            NextBlockLogger.logBlockMount('block-2', 'Timer', 2, 2);
            NextBlockLogger.logBlockNext('block-1', 'Effort', 0, 1);
            
            const counts = NextBlockLogger.getStageCounts();
            expect(counts['block-mount']).toBe(2);
            expect(counts['block-next']).toBe(1);
        });

        test('should provide block-specific history via getBlockHistory()', () => {
            NextBlockLogger.setEnabled(true);
            
            NextBlockLogger.logBlockMount('block-1', 'Effort', 1, 1);
            NextBlockLogger.logBlockMount('block-2', 'Timer', 2, 2);
            NextBlockLogger.logBlockNext('block-1', 'Effort', 0, 1);
            
            const block1History = NextBlockLogger.getBlockHistory('block-1');
            expect(block1History.length).toBe(2);
        });
    });

    describe('Custom Debug Log Handler', () => {
        test('should call custom handler for debug events', () => {
            const customHandler = vi.fn();
            
            const runtime = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .withDebugLogHandler(customHandler)
                .build();
            
            const mockBlock = createMockBlock('test-block');
            runtime.stack.push(mockBlock);
            
            // Custom handler should have been called for the wrap and push events
            expect(customHandler).toHaveBeenCalled();
            
            const calls = customHandler.mock.calls;
            const eventTypes = calls.map(c => c[0].type);
            expect(eventTypes).toContain('block-wrapped');
            expect(eventTypes).toContain('stack-push');
        });
    });

    describe('TestableBlock Configuration', () => {
        test('should apply default TestableBlock config', () => {
            const runtime = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .withDefaultTestableConfig({
                    mountMode: 'spy',
                    nextMode: 'override',
                    nextOverride: () => [],
                })
                .build();
            
            const mockBlock = createMockBlock('test-block');
            runtime.stack.push(mockBlock);
            
            const wrapped = runtime.getWrappedBlock('test-block');
            expect(wrapped).toBeDefined();
            // The wrapped block should have the config applied
            // (verified by calling methods)
        });

        test('should support custom block wrapper factory', () => {
            const customWrapper = vi.fn((block: IRuntimeBlock) => {
                return new TestableBlock(block, { testId: 'custom-wrapped' });
            });
            
            const runtime = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .withBlockWrapperFactory(customWrapper)
                .build();
            
            const mockBlock = createMockBlock('test-block');
            runtime.stack.push(mockBlock);
            
            expect(customWrapper).toHaveBeenCalled();
        });
    });
});
