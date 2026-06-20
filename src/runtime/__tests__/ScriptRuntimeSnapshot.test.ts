import { describe, expect, it, vi, beforeEach, afterEach } from 'bun:test';
import { ScriptRuntime } from '../ScriptRuntime';
import { RuntimeStack } from '../RuntimeStack';
import { RuntimeClock } from '../RuntimeClock';
import { EventBus } from '../events/EventBus';
import { WhiteboardScript } from '../../parser/WhiteboardScript';
import { IJitCompiler } from '../contracts/IJitCompiler';
import { BlockKey } from '../../core/models/BlockKey';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { StackSnapshot } from '../contracts/IRuntimeStack';

// Minimal test double: only the fields ScriptRuntime reads during this test.
const createMockBlock = (label: string): IRuntimeBlock => {
    const key = new BlockKey(label);

    const block = {
        key,
        label,
        sourceIds: [1],
        mount: vi.fn().mockReturnValue([]),
        next: vi.fn().mockReturnValue([]),
        unmount: vi.fn().mockReturnValue([]),
        dispose: vi.fn(),
        isComplete: false,
        metrics: [],
        memoryMap: new Map(),
        getBehavior: vi.fn(),
        behaviors: [],
        pushMemory: vi.fn(),
        getMemoryByTag: vi.fn().mockReturnValue([]),
        getAllMemory: vi.fn().mockReturnValue([]),
        markComplete: vi.fn(),
    };

    // The double matches the contract; cast avoids plumbing every private symbol.
    return block as unknown as IRuntimeBlock;
};

describe('ScriptRuntime StackSnapshot construction', () => {
    let runtime: ScriptRuntime;
    let clock: RuntimeClock;

    beforeEach(() => {
        const script = new WhiteboardScript('test', []);
        // Compiler is not exercised in these tests; empty double is enough.
        const compiler = {} as unknown as IJitCompiler;
        const stack = new RuntimeStack();
        clock = new RuntimeClock();
        const eventBus = new EventBus();
        runtime = new ScriptRuntime(script, compiler, { stack, clock, eventBus });
    });

    afterEach(() => {
        runtime.dispose();
        vi.useRealTimers();
    });

    it('notifies existing observers synchronously on settle with the shared initial snapshot shape', () => {
        const received: StackSnapshot[] = [];
        runtime.subscribeToStack((snapshot) => received.push(snapshot));
        // Ignore the deferred initial snapshot; we are testing the synchronous settle path.
        received.length = 0;

        const block = createMockBlock('SettledBlock');
        const before = clock.currentDate.getTime();
        runtime.pushBlock(block);
        const after = clock.currentDate.getTime();

        const settled = received.find((s) => s.type === 'initial' && s.blocks.includes(block));
        expect(settled).toBeDefined();
        expect(settled?.depth).toBe(1);
        const snapshotTime = settled?.clockTime.getTime() ?? 0;
        expect(snapshotTime).toBeGreaterThanOrEqual(before);
        expect(snapshotTime).toBeLessThanOrEqual(after);
    });

    it('defers the initial snapshot for a new subscriber via setTimeout using the shared snapshot shape', () => {
        vi.useFakeTimers();
        const block = createMockBlock('DeferredBlock');
        runtime.pushBlock(block);

        const before = clock.currentDate.getTime();
        const received: StackSnapshot[] = [];
        runtime.subscribeToStack((snapshot) => received.push(snapshot));
        const after = clock.currentDate.getTime();

        expect(received.length).toBe(0);
        vi.runAllTimers();
        expect(received.length).toBe(1);
        expect(received[0].type).toBe('initial');
        expect(received[0].depth).toBe(1);
        expect(received[0].blocks).toEqual(runtime.stack.blocks);
        const snapshotTime = received[0].clockTime.getTime();
        expect(snapshotTime).toBeGreaterThanOrEqual(before);
        expect(snapshotTime).toBeLessThanOrEqual(after);
    });
});
