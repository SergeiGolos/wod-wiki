import { describe, expect, it, vi } from 'bun:test';
import { ScriptRuntime } from '../ScriptRuntime';
import { RuntimeStack } from '../RuntimeStack';
import { RuntimeClock } from '../RuntimeClock';
import { EventBus } from '../events/EventBus';
import { WodScript } from '../../parser/WodScript';
import { JitCompiler } from '../compiler/JitCompiler';
import { BlockKey } from '../../core/models/BlockKey';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { BlockContext } from '../BlockContext';

// Helper to create a mock block
const createMockBlock = (
    label: string,
    runtime: ScriptRuntime,
    onNextActions: IRuntimeAction[] = []
): any => {
    const key = new BlockKey(label);
    const context = new BlockContext(runtime, key.toString());

    return {
        key,
        label,
        sourceIds: [1],
        context,
        mount: vi.fn().mockReturnValue([]),
        next: vi.fn().mockReturnValue(onNextActions),
        unmount: vi.fn().mockReturnValue([]),
        dispose: vi.fn(),
        isComplete: false,
        fragments: [],
        memoryMap: new Map(),
        getBehavior: vi.fn(),
        pushMemory: vi.fn(),
        getMemoryByTag: vi.fn().mockReturnValue([]),
        getAllMemory: vi.fn().mockReturnValue([]),
        hasMemory: vi.fn(),
        getMemory: vi.fn(),
        setMemoryValue: vi.fn(),
        markComplete: vi.fn(),
    };
};

describe('ScriptRuntime Iteration (Explicit Next)', () => {
    it('should call parent.next() when child is popped', () => {
        // Setup
        const script = new WodScript('test', []);
        const compiler = {} as JitCompiler;
        const dependencies = {
            stack: new RuntimeStack(),
            clock: new RuntimeClock(),
            eventBus: new EventBus()
        };
        const runtime = new ScriptRuntime(script, compiler, dependencies);

        // Create Parent and Child
        const nextAction: IRuntimeAction = {
            type: 'parent-next-action',
            do: vi.fn()
        };
        const parent = createMockBlock('Parent', runtime, [nextAction]);
        const child = createMockBlock('Child', runtime);

        // Push blocks
        runtime.pushBlock(parent);
        runtime.pushBlock(child);

        expect(runtime.stack.current).toBe(child);
        expect(runtime.stack.count).toBe(2);

        // Pop Child
        runtime.popBlock();

        // Verify Child is gone
        expect(runtime.stack.current).toBe(parent);
        expect(runtime.stack.count).toBe(1);

        // Verify Parent.next() was called
        expect(parent.next).toHaveBeenCalledTimes(1);

        // Verify action from parent.next() was executed
        // processActions is called by queueActions, which is called by popBlock for next actions
        expect(nextAction.do).toHaveBeenCalled();
    });

    it('should not call next() if no parent exists (popping root)', () => {
        // Setup
        const script = new WodScript('test', []);
        const compiler = {} as JitCompiler;
        const dependencies = {
            stack: new RuntimeStack(),
            clock: new RuntimeClock(),
            eventBus: new EventBus()
        };
        const runtime = new ScriptRuntime(script, compiler, dependencies);

        const root = createMockBlock('Root', runtime);

        runtime.pushBlock(root);
        runtime.popBlock();

        expect(runtime.stack.count).toBe(0);
        // No parent to call next() on from stack, ensuring no crash
    });
});
