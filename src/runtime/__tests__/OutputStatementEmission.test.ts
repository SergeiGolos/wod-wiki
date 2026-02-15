import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { ScriptRuntime } from '../ScriptRuntime';
import { RuntimeStack } from '../RuntimeStack';
import { EventBus } from '../events/EventBus';
import { JitCompiler } from '../compiler/JitCompiler';
import { WodScript } from '../../parser/WodScript';
import { BlockKey } from '../../core/models/BlockKey';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { IOutputStatement } from '../../core/models/OutputStatement';
import { OutputStatement } from '../../core/models/OutputStatement';
import { RuntimeClock } from '../RuntimeClock';
import { TimeSpan } from '../models/TimeSpan';

/**
 * Minimal mock block for testing output statement emission.
 */
function createMockBlock(options: {
    key?: string;
    label?: string;
    sourceIds?: number[];
    fragments?: ICodeFragment[][];
} = {}): IRuntimeBlock {
    const key = new BlockKey(options.key ?? `test-block-${Date.now()}`);
    const fragmentGroups = options.fragments;

    return {
        key,
        label: options.label ?? 'Test Block',
        sourceIds: options.sourceIds ?? [1],
        blockType: 'test',
        context: { release: vi.fn() },
        isComplete: false,
        executionTiming: {
            startTime: new Date(),
            completedAt: undefined,
        },

        mount: vi.fn().mockReturnValue([]),
        next: vi.fn().mockReturnValue([]),
        // Simulate behavior-driven output: emit completion on unmount
        unmount: vi.fn().mockImplementation(function (this: IRuntimeBlock, runtime: any) {
            const startTime = this.executionTiming?.startTime?.getTime() ?? Date.now();
            const endTime = this.executionTiming?.completedAt?.getTime() ?? Date.now();
            const timeSpan = new TimeSpan(startTime, endTime);
            // Access fragments through memory (new API)
            const fragmentMem = this.getMemory?.('fragment');
            const fragments = fragmentMem?.value?.groups?.flat() ?? [];

            const output = new OutputStatement({
                outputType: 'completion',
                timeSpan,
                sourceBlockKey: this.key.toString(),
                sourceStatementId: this.sourceIds?.[0],
                stackLevel: runtime.stack?.count ?? 0,
                fragments,
                parent: undefined,
                children: [],
            });
            runtime.addOutput(output);
            return [];
        }),
        dispose: vi.fn(),
        markComplete: vi.fn(),

        getBehavior: vi.fn().mockReturnValue(undefined),

        pushMemory: vi.fn(),
        getMemoryByTag: vi.fn().mockImplementation((tag: string) => {
            if (tag === 'fragment' && fragmentGroups) {
                return [{ tag: 'fragment', fragments: fragmentGroups.flat() }] as any;
            }
            return [];
        }),
        getAllMemory: vi.fn().mockImplementation(() => {
            if (fragmentGroups) {
                return [{ tag: 'fragment', fragments: fragmentGroups.flat() }] as any;
            }
            return [];
        }),

        hasMemory: vi.fn().mockImplementation((type: string) => {
            if (type === 'fragment' && fragmentGroups) return true;
            return false;
        }),
        getMemory: vi.fn().mockImplementation((type: string) => {
            if (type === 'fragment' && fragmentGroups) {
                return { type: 'fragment', value: { groups: fragmentGroups } };
            }
            return undefined;
        }),
    } as unknown as IRuntimeBlock;
}

/**
 * Creates a minimal runtime for testing output statements.
 */
function createTestRuntime(): ScriptRuntime {
    const dependencies = {
        stack: new RuntimeStack(),
        clock: new RuntimeClock(),
        eventBus: new EventBus(),
    };

    const script = new WodScript('test workout', []);
    // JitCompiler expects strategies array, pass empty for test
    const jit = new JitCompiler([]);

    return new ScriptRuntime(script, jit, dependencies);
}

describe('ScriptRuntime Output Statements', () => {
    let runtime: ScriptRuntime;

    beforeEach(() => {
        OutputStatement.resetIdCounter();
        runtime = createTestRuntime();
    });

    describe('subscribeToOutput', () => {
        it('should return an unsubscribe function', () => {
            const listener = vi.fn();
            const unsubscribe = runtime.subscribeToOutput(listener);

            expect(typeof unsubscribe).toBe('function');
        });

        it('should notify listener when block is popped', () => {
            const listener = vi.fn();
            runtime.subscribeToOutput(listener);

            const block = createMockBlock({ label: 'Output Test Block' });
            runtime.pushBlock(block);
            runtime.popBlock();

            // Pop emits a system output (lifecycle event), not a completion output
            expect(listener).toHaveBeenCalled();

            const output: IOutputStatement = listener.mock.calls[0][0];
            expect(output.outputType).toBe('system');
            expect(output.sourceBlockKey).toBe(block.key.toString());
        });

        it('should stop notifying after unsubscribe', () => {
            const listener = vi.fn();
            const unsubscribe = runtime.subscribeToOutput(listener);

            const block1 = createMockBlock({ label: 'Block 1' });
            runtime.pushBlock(block1);
            runtime.popBlock();

            expect(listener).toHaveBeenCalledTimes(1);

            unsubscribe();

            const block2 = createMockBlock({ label: 'Block 2' });
            runtime.pushBlock(block2);
            runtime.popBlock();

            // Still only 1 call - listener was unsubscribed
            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('should support multiple listeners', () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();

            runtime.subscribeToOutput(listener1);
            runtime.subscribeToOutput(listener2);

            const block = createMockBlock({ label: 'Multi-listener Block' });
            runtime.pushBlock(block);
            runtime.popBlock();

            expect(listener1).toHaveBeenCalledTimes(1);
            expect(listener2).toHaveBeenCalledTimes(1);
        });
    });

    describe('getOutputStatements', () => {
        it('should return empty array initially', () => {
            const outputs = runtime.getOutputStatements();
            expect(outputs).toEqual([]);
        });

        it('should return all emitted output statements', () => {
            const block1 = createMockBlock({ label: 'Block 1', sourceIds: [10] });
            const block2 = createMockBlock({ label: 'Block 2', sourceIds: [20] });

            runtime.pushBlock(block1);
            runtime.popBlock();

            runtime.pushBlock(block2);
            runtime.popBlock();

            const outputs = runtime.getOutputStatements();
            expect(outputs).toHaveLength(2);
            expect(outputs[0].sourceStatementId).toBe(10);
            expect(outputs[1].sourceStatementId).toBe(20);
        });

        it('should return a copy of the internal array', () => {
            const block = createMockBlock({ label: 'Copy Test Block' });
            runtime.pushBlock(block);
            runtime.popBlock();

            const outputs1 = runtime.getOutputStatements();
            const outputs2 = runtime.getOutputStatements();

            expect(outputs1).not.toBe(outputs2); // Different array instances
            expect(outputs1).toEqual(outputs2);   // Same content
        });
    });

    describe('output statement content', () => {
        it('should include timeSpan with start and end times', () => {
            const listener = vi.fn();
            runtime.subscribeToOutput(listener);

            const block = createMockBlock({ label: 'Timing Block' });
            runtime.pushBlock(block);
            runtime.popBlock();

            const output: IOutputStatement = listener.mock.calls[0][0];
            expect(output.timeSpan).toBeDefined();
            expect(output.timeSpan.started).toBeDefined();
        });

        it('should include fragments from the block', () => {
            const fragments: ICodeFragment[][] = [[
                { type: 'effort', fragmentType: FragmentType.Effort, value: 'Push-ups', image: 'Push-ups' }
            ]];

            const listener = vi.fn();
            runtime.subscribeToOutput(listener);

            const block = createMockBlock({
                label: 'Fragment Block',
                fragments
            });
            runtime.pushBlock(block);
            runtime.popBlock();

            const output: IOutputStatement = listener.mock.calls[0][0];
            expect(output.fragments).toHaveLength(1);
            expect(output.fragments[0].value).toBe('Push-ups');
        });

        it('should link to source statement ID', () => {
            const listener = vi.fn();
            runtime.subscribeToOutput(listener);

            const block = createMockBlock({
                label: 'Source Link Block',
                sourceIds: [42, 43, 44]
            });
            runtime.pushBlock(block);
            runtime.popBlock();

            const output: IOutputStatement = listener.mock.calls[0][0];
            expect(output.sourceStatementId).toBe(42); // First source ID
        });

        it('should have unique IDs for each output', () => {
            const block1 = createMockBlock({ label: 'Block 1' });
            const block2 = createMockBlock({ label: 'Block 2' });

            runtime.pushBlock(block1);
            runtime.popBlock();

            runtime.pushBlock(block2);
            runtime.popBlock();

            const outputs = runtime.getOutputStatements();
            expect(outputs[0].id).not.toBe(outputs[1].id);
        });
    });
});
