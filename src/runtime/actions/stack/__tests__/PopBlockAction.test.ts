import { describe, it, expect, vi } from 'vitest';
import { PopBlockAction } from '../PopBlockAction';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';
import { IRuntimeBlock } from '../../../contracts/IRuntimeBlock';

function createRuntimeWithBlock(block: IRuntimeBlock): IScriptRuntime {
    let currentBlock: IRuntimeBlock | undefined = block;

    const stack = {
        get current() {
            return currentBlock;
        },
        count: 0,
        pop: vi.fn(() => {
            const popped = currentBlock;
            currentBlock = undefined;
            return popped;
        }),
    };

    return {
        stack: stack as any,
        clock: { now: new Date(2000), isRunning: true } as any,
        addOutput: vi.fn(),
        script: {} as any,
        eventBus: {} as any,
        options: {},
        tracker: {} as any,
        jit: {} as any,
        errors: [],
        subscribeToOutput: vi.fn(),
        getOutputStatements: vi.fn(() => []),
        subscribeToStack: vi.fn(),
        dispose: vi.fn(),
        do: vi.fn(),
        pushBlock: vi.fn(),
        popBlock: vi.fn(),
    } as unknown as IScriptRuntime;
}

function createBlock(): IRuntimeBlock {
    return {
        key: { toString: () => 'block-1' } as any,
        sourceIds: [101],
        blockType: 'Timer',
        label: 'Timer Block',
        context: { release: vi.fn() } as any,
        behaviors: [],
        executionTiming: {
            startTime: new Date(1000),
            completedAt: undefined,
        },
        isComplete: true,
        completionReason: undefined,

        mount: vi.fn().mockReturnValue([]),
        next: vi.fn().mockReturnValue([]),
        unmount: vi.fn().mockReturnValue([]),
        dispose: vi.fn(),
        markComplete: vi.fn(),
        getBehavior: vi.fn(),
        pushMemory: vi.fn(),
        getMemoryByTag: vi.fn().mockReturnValue([]),
        getAllMemory: vi.fn().mockReturnValue([]),
        getFragmentMemoryByVisibility: vi.fn().mockReturnValue([]),
    } as unknown as IRuntimeBlock;
}

describe('PopBlockAction', () => {
    it('does not emit output statements directly', () => {
        const block = createBlock();
        const runtime = createRuntimeWithBlock(block);
        const action = new PopBlockAction();

        action.do(runtime);

        expect(runtime.addOutput).not.toHaveBeenCalled();
    });
});
