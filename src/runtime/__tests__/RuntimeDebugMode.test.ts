import { describe, test, expect, beforeEach, vi } from 'bun:test';
import { RuntimeBuilder } from '../compiler/RuntimeBuilder';
import { ScriptRuntime } from '../ScriptRuntime';
import { JitCompiler } from '../compiler/JitCompiler';
import { WodScript } from '../../parser/WodScript';
import { TestableBlock } from '../../testing/testable/TestableBlock';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { BlockKey } from '../../core/models/BlockKey';
import { IBlockContext } from '../contracts/IBlockContext';
import { RuntimeStackWrapper } from '../contracts/IRuntimeOptions';
import { RuntimeMemory } from '../RuntimeMemory';
import { RuntimeStack } from '../RuntimeStack';
import { RuntimeClock } from '../RuntimeClock';
import { EventBus } from '../events/EventBus';

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
        set: vi.fn(),
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
        pushMemory: vi.fn(),
        getMemoryByTag: vi.fn().mockReturnValue([]),
        getAllMemory: vi.fn().mockReturnValue([]),
        hasMemory: vi.fn().mockReturnValue(false),
        getMemory: vi.fn().mockReturnValue(undefined),
        setMemoryValue: vi.fn(),
        isComplete: false,
        markComplete: vi.fn(),
    };
}

/**
 * Creates a debug wrapper that tracks wrapped blocks in a Map.
 * This is the pattern tests should use to inspect wrapped blocks.
 */
function createDebugWrapper(): { wrapper: RuntimeStackWrapper; wrappedBlocks: Map<string, TestableBlock> } {
    const wrappedBlocks = new Map<string, TestableBlock>();

    const wrapper: RuntimeStackWrapper = {
        wrap: (block: IRuntimeBlock) => {
            if (block instanceof TestableBlock) {
                wrappedBlocks.set(block.key.toString(), block);
                return block;
            }
            const wrapped = new TestableBlock(block, {
                testId: `debug-${block.key.toString()}`,
                mountMode: 'spy',
                nextMode: 'spy',
                unmountMode: 'spy',
                disposeMode: 'spy',
            });
            wrappedBlocks.set(block.key.toString(), wrapped);
            return wrapped;
        },
        cleanup: (block: IRuntimeBlock) => {
            const key = block instanceof TestableBlock
                ? block.wrapped.key.toString()
                : block.key.toString();
            wrappedBlocks.delete(key);
        },
    };

    return { wrapper, wrappedBlocks };
}

describe('Runtime Debugging and Testing Architecture', () => {
    let compiler: JitCompiler;
    let script: WodScript;

    beforeEach(() => {
        compiler = new JitCompiler([]);
        script = new WodScript('10 Pushups', []);
    });

    describe('RuntimeBuilder', () => {
        test('should create runtime with default options', () => {
            const runtime = new RuntimeBuilder(script, compiler).build();

            expect(runtime).toBeInstanceOf(ScriptRuntime);
            expect(runtime.options.debugMode).toBeFalsy();
        });

        test('should auto-enable logging when debug mode is enabled', () => {
            const runtime = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .build();

            expect(runtime.options.enableLogging).toBe(true);
        });

        test('should enable logging independently of debug mode', () => {
            const runtime = new RuntimeBuilder(script, compiler)
                .withLogging(true)
                .build();

            expect(runtime.options.debugMode).toBeFalsy();
            expect(runtime.options.enableLogging).toBe(true);
        });

        test('should return options via getOptions()', () => {
            const builder = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .withLogging(true);

            const options = builder.getOptions();

            expect(options.debugMode).toBe(true);
            expect(options.enableLogging).toBe(true);
        });

        test('should support buildWithOptions() for debugging', () => {
            const result = new RuntimeBuilder(script, compiler)
                .withDebugMode(true)
                .buildWithOptions();

            expect(result.runtime).toBeInstanceOf(ScriptRuntime);
            expect(result.options.debugMode).toBe(true);
        });
    });

    describe('Custom Wrapper Integration', () => {
        test('should wrap blocks when custom wrapper is provided', () => {
            const { wrapper, wrappedBlocks } = createDebugWrapper();

            const dependencies = {
                stack: new RuntimeStack(),
                clock: new RuntimeClock(),
                eventBus: new EventBus(),
            };
            const runtime = new ScriptRuntime(script, compiler, dependencies, { wrapper });

            const mockBlock = createMockBlock('test-block');
            runtime.pushBlock(mockBlock);

            // The current block should be a TestableBlock wrapper
            const current = runtime.stack.current;
            expect(current).toBeDefined();
            expect(current).toBeInstanceOf(TestableBlock);

            // Verify wrapper tracked the block
            expect(wrappedBlocks.size).toBe(1);
            expect(wrappedBlocks.has('test-block')).toBe(true);
        });

        test('should not double-wrap TestableBlocks', () => {
            const { wrapper, wrappedBlocks } = createDebugWrapper();

            const dependencies = {
                stack: new RuntimeStack(),
                clock: new RuntimeClock(),
                eventBus: new EventBus(),
            };
            const runtime = new ScriptRuntime(script, compiler, dependencies, { wrapper });

            const mockBlock = createMockBlock('test-block');
            const alreadyWrapped = new TestableBlock(mockBlock, { testId: 'already-wrapped' });

            runtime.pushBlock(alreadyWrapped);

            // Should use the existing wrapper
            const current = runtime.stack.current;
            expect(current).toBe(alreadyWrapped);
            expect(wrappedBlocks.size).toBe(1);
        });

        test('should record method calls on wrapped blocks', () => {
            const { wrapper, wrappedBlocks } = createDebugWrapper();

            const dependencies = {
                stack: new RuntimeStack(),
                clock: new RuntimeClock(),
                eventBus: new EventBus(),
            };
            const runtime = new ScriptRuntime(script, compiler, dependencies, { wrapper });

            const mockBlock = createMockBlock('test-block');
            runtime.pushBlock(mockBlock);

            // Get the wrapped block and check calls
            const wrapped = wrappedBlocks.get('test-block');
            expect(wrapped).toBeDefined();
            expect(wrapped!.wasCalled('mount')).toBe(true);
            expect(wrapped!.callCount('mount')).toBe(1);
        });

        test('should track multiple blocks and their calls', () => {
            const { wrapper, wrappedBlocks } = createDebugWrapper();

            const dependencies = {
                stack: new RuntimeStack(),
                clock: new RuntimeClock(),
                eventBus: new EventBus(),
            };
            const runtime = new ScriptRuntime(script, compiler, dependencies, { wrapper });

            const mockBlock1 = createMockBlock('block-1');
            const mockBlock2 = createMockBlock('block-2');

            runtime.pushBlock(mockBlock1);

            runtime.pushBlock(mockBlock2);
            runtime.stack.current!.next(runtime);

            expect(wrappedBlocks.size).toBe(2);

            const block1 = wrappedBlocks.get('block-1');
            const block2 = wrappedBlocks.get('block-2');

            expect(block1?.callCount('mount')).toBe(1);
            expect(block2?.callCount('mount')).toBe(1);
            expect(block2?.callCount('next')).toBe(1);
        });

        test('should cleanup wrapped blocks on pop', () => {
            const { wrapper, wrappedBlocks } = createDebugWrapper();

            const dependencies = {
                stack: new RuntimeStack(),
                clock: new RuntimeClock(),
                eventBus: new EventBus(),
            };
            const runtime = new ScriptRuntime(script, compiler, dependencies, { wrapper });

            const mockBlock = createMockBlock('test-block');
            runtime.pushBlock(mockBlock);

            expect(wrappedBlocks.size).toBe(1);

            runtime.popBlock();

            expect(wrappedBlocks.size).toBe(0);
        });
    });

    describe('TestableBlock Direct Usage', () => {
        test('should allow direct TestableBlock creation for testing', () => {
            const dependencies = {
                memory: new RuntimeMemory(),
                stack: new RuntimeStack(),
                clock: new RuntimeClock(),
                eventBus: new EventBus(),
            };
            const runtime = new ScriptRuntime(script, compiler, dependencies);

            const mockBlock = createMockBlock('test-block');
            const testable = new TestableBlock(mockBlock, {
                testId: 'test-wrapper',
                mountMode: 'spy',
                nextMode: 'spy',
            });

            runtime.pushBlock(testable);

            testable.next(runtime);

            expect(testable.wasCalled('mount')).toBe(true);
            expect(testable.wasCalled('next')).toBe(true);
            expect(testable.callCount('mount')).toBe(1);
            expect(testable.callCount('next')).toBe(1);
        });

        test('should support clearCalls() on TestableBlock', () => {
            const mockBlock = createMockBlock('test-block');
            const testable = new TestableBlock(mockBlock, { testId: 'test' });

            const dependencies = {
                stack: new RuntimeStack(),
                clock: new RuntimeClock(),
                eventBus: new EventBus(),
            };
            const runtime = new ScriptRuntime(script, compiler, dependencies);

            testable.mount(runtime);
            expect(testable.callCount('mount')).toBe(1);

            testable.clearCalls();
            expect(testable.callCount('mount')).toBe(0);
        });
    });
});
