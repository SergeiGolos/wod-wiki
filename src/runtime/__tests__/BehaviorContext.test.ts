import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { BehaviorContext } from '../BehaviorContext';
import { BlockKey } from '../../core/models/BlockKey';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { ICodeFragment, FragmentType } from '../../core/models/CodeFragment';
import { IOutputStatement } from '../../core/models/OutputStatement';

/**
 * Create a minimal mock block for testing.
 */
function createMockBlock(label: string = 'Test Block'): IRuntimeBlock {
    const key = new BlockKey(`test-block-${Date.now()}`);
    return {
        key,
        label,
        sourceIds: [1],
        fragments: [],
        blockType: 'test',
        context: { release: vi.fn() } as any,
        isComplete: false,
        executionTiming: {},
        mount: vi.fn().mockReturnValue([]),
        next: vi.fn().mockReturnValue([]),
        unmount: vi.fn().mockReturnValue([]),
        dispose: vi.fn(),
        markComplete: vi.fn(),
        getBehavior: vi.fn(),
        findFragment: vi.fn(),
        filterFragments: vi.fn().mockReturnValue([]),
        hasFragment: vi.fn().mockReturnValue(false),
        hasMemory: vi.fn().mockReturnValue(false),
        getMemory: vi.fn().mockReturnValue(undefined),
        getMemoryTypes: vi.fn().mockReturnValue([]),
    } as unknown as IRuntimeBlock;
}

/**
 * Create a minimal mock clock.
 */
function createMockClock(): IRuntimeClock {
    return {
    now: new Date('2026-01-27T12:00:00Z'),
    start: vi.fn(),
    stop: vi.fn(),    
    elapsed: 0,
    isRunning: false,
    spans: []    
};
}

/**
 * Create a minimal mock runtime.
 */
function createMockRuntime(): IScriptRuntime {
    const outputs: IOutputStatement[] = [];
    const outputListeners = new Set<(output: IOutputStatement) => void>();

    return {
        eventBus: {
            dispatch: vi.fn().mockReturnValue([]),
            register: vi.fn().mockReturnValue(() => { }),
            unregisterByOwner: vi.fn(),
        } as any,
        clock: createMockClock(),
        memory: {} as any,
        stack: { count: 1 } as any,
        jit: {} as any,
        script: {} as any,
        errors: [],
        options: {} as any,
        do: vi.fn(),
        doAll: vi.fn(),
        handle: vi.fn(),
        // Output tracking
        _outputStatements: outputs,
        _outputListeners: outputListeners,
        addOutput: vi.fn((output: IOutputStatement) => {
            outputs.push(output);
            for (const listener of outputListeners) {
                listener(output);
            }
        }),
        subscribeToOutput: (listener: (output: IOutputStatement) => void) => {
            outputListeners.add(listener);
            return () => outputListeners.delete(listener);
        },
        getOutputStatements: () => [...outputs],
    } as unknown as IScriptRuntime;
}

describe('BehaviorContext', () => {
    let block: IRuntimeBlock;
    let clock: IRuntimeClock;
    let runtime: IScriptRuntime;
    let ctx: BehaviorContext;

    beforeEach(() => {
        block = createMockBlock('Test Block');
        clock = createMockClock();
        runtime = createMockRuntime();
        ctx = new BehaviorContext(block, clock, 0, runtime);
    });

    describe('constructor', () => {
        it('should store block, clock, and stackLevel', () => {
            expect(ctx.block).toBe(block);
            expect(ctx.clock).toBe(clock);
            expect(ctx.stackLevel).toBe(0);
        });

        it('should support different stack levels', () => {
            const ctx2 = new BehaviorContext(block, clock, 3, runtime);
            expect(ctx2.stackLevel).toBe(3);
        });
    });

    describe('emitEvent', () => {
        it('should dispatch event via runtime.handle()', () => {
            const event = { name: 'timer:started', timestamp: new Date(), data: {} };
            ctx.emitEvent(event);
            expect(runtime.handle).toHaveBeenCalledWith(event);
        });

        it('should delegate to runtime.handle() for action processing', () => {
            const event = { name: 'custom:event', timestamp: new Date(), data: {} };
            ctx.emitEvent(event);

            // Should call runtime.handle() which dispatches and processes actions internally
            expect(runtime.handle).toHaveBeenCalledWith(event);
        });

        it('should handle events with no data', () => {
            const event = { name: 'noop:event', timestamp: new Date(), data: {} };
            ctx.emitEvent(event);

            expect(runtime.handle).toHaveBeenCalledWith(event);
        });
    });

    describe('emitOutput', () => {
        it('should create an output statement and add to runtime', () => {
            const fragment: ICodeFragment = {
                fragmentType: FragmentType.Timer,
                image: '1:00',
                origin: 'runtime',
                type: 'test'
            };

            ctx.emitOutput('segment', [fragment], { label: 'Test Output' });

            // Check that addOutput was called
            expect((runtime as any).addOutput).toHaveBeenCalled();

            // Get the output that was added
            const outputs = runtime.getOutputStatements();
            expect(outputs).toHaveLength(1);
            expect(outputs[0].outputType).toBe('segment');
            expect(outputs[0].stackLevel).toBe(0);
            expect(outputs[0].sourceBlockKey).toBe(block.key.toString());
        });

        it('should include correct stackLevel in output', () => {
            const ctx3 = new BehaviorContext(block, clock, 3, runtime);
            ctx3.emitOutput('completion', [], {});

            const outputs = runtime.getOutputStatements();
            expect(outputs).toHaveLength(1);
            expect(outputs[0].stackLevel).toBe(3);
        });

        it('should tag fragments with sourceBlockKey if not provided', () => {
            const fragment: ICodeFragment = {
                fragmentType: FragmentType.Timer,
                image: '2:00',
                origin: 'runtime',
                type: ''
            };

            ctx.emitOutput('milestone', [fragment], {});

            const outputs = runtime.getOutputStatements();
            expect(outputs[0].fragments[0].sourceBlockKey).toBe(block.key.toString());
        });
    });

    describe('subscribe', () => {
        it('should register handler with event bus', () => {
            const listener = vi.fn().mockReturnValue([]);
            ctx.subscribe('tick', listener);

            expect(runtime.eventBus.register).toHaveBeenCalledWith(
                'tick',
                expect.objectContaining({
                    id: expect.stringContaining('behavior-'),
                    name: expect.stringContaining('BehaviorHandler-Test Block-tick'),
                }),
                block.key.toString(),
                { scope: 'active' }
            );
        });

        it('should return unsubscribe function', () => {
            const unsubscribe = vi.fn();
            (runtime.eventBus.register as any).mockReturnValue(unsubscribe);

            const listener = vi.fn().mockReturnValue([]);
            const result = ctx.subscribe('next', listener);

            expect(result).toBe(unsubscribe);
        });
    });

    describe('markComplete', () => {
        it('should call block.markComplete with reason', () => {
            ctx.markComplete('timer:complete');
            expect(block.markComplete).toHaveBeenCalledWith('timer:complete');
        });
    });

    describe('getMemory', () => {
        it('should return undefined when no memory exists', () => {
            const result = ctx.getMemory('timer');
            expect(result).toBeUndefined();
        });

        it('should return memory value when it exists', () => {
            const mockEntry = { value: { elapsed: 1000 } };
            (block.getMemory as any).mockReturnValue(mockEntry);

            const result = ctx.getMemory('timer');
            expect(result).toEqual({ elapsed: 1000 });
        });
    });

    describe('dispose', () => {
        it('should call all unsubscribe functions', () => {
            const unsub1 = vi.fn();
            const unsub2 = vi.fn();
            (runtime.eventBus.register as any)
                .mockReturnValueOnce(unsub1)
                .mockReturnValueOnce(unsub2);

            ctx.subscribe('tick', vi.fn().mockReturnValue([]));
            ctx.subscribe('next', vi.fn().mockReturnValue([]));

            ctx.dispose();

            expect(unsub1).toHaveBeenCalled();
            expect(unsub2).toHaveBeenCalled();
        });

        it('should clear subscriptions after dispose', () => {
            const unsub = vi.fn();
            (runtime.eventBus.register as any).mockReturnValue(unsub);

            ctx.subscribe('tick', vi.fn().mockReturnValue([]));
            ctx.dispose();

            // Second dispose should not call unsub again
            ctx.dispose();
            expect(unsub).toHaveBeenCalledTimes(1);
        });
    });
});
