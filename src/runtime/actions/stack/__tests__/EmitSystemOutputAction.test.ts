import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmitSystemOutputAction } from '../EmitSystemOutputAction';
import { FragmentType } from '../../../../core/models/CodeFragment';
import { IScriptRuntime } from '../../../contracts/IScriptRuntime';
import { IRuntimeStack } from '../../../contracts/IRuntimeStack';

function createMockRuntime(): IScriptRuntime {
    const now = new Date('2024-01-15T12:00:00Z');
    const mockStack: Partial<IRuntimeStack> = {
        count: 2,
    };
    return {
        clock: { now, isRunning: true },
        stack: mockStack as IRuntimeStack,
        addOutput: vi.fn(),
        // Add other required IScriptRuntime fields as vi.fn() stubs
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

describe('EmitSystemOutputAction', () => {
    let runtime: IScriptRuntime;

    beforeEach(() => {
        runtime = createMockRuntime();
    });

    it('should have type "emit-system-output"', () => {
        const action = new EmitSystemOutputAction('test message', 'push', 'block-1');
        expect(action.type).toBe('emit-system-output');
    });

    it('should emit a system output statement', () => {
        const action = new EmitSystemOutputAction('push: Burpees [abc12345]', 'push', 'block-1', 'Burpees', 2);
        const result = action.do(runtime);

        expect(result).toEqual([]);
        expect(runtime.addOutput).toHaveBeenCalledTimes(1);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        expect(output.outputType).toBe('system');
        expect(output.sourceBlockKey).toBe('block-1');
        expect(output.stackLevel).toBe(2);
    });

    it('should create a System fragment with lifecycle type', () => {
        const action = new EmitSystemOutputAction('push: Test', 'push', 'block-1');
        action.do(runtime);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        expect(output.fragments).toHaveLength(1);

        const fragment = output.fragments[0];
        expect(fragment.fragmentType).toBe(FragmentType.System);
        expect(fragment.type).toBe('lifecycle');
        expect(fragment.image).toBe('push: Test');
        expect(fragment.origin).toBe('runtime');
        expect(fragment.value.event).toBe('push');
        expect(fragment.value.blockKey).toBe('block-1');
    });

    it('should use event-action type for event-action events', () => {
        const action = new EmitSystemOutputAction('event: timer-expired', 'event-action', 'block-1');
        action.do(runtime);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        const fragment = output.fragments[0];
        expect(fragment.type).toBe('event-action');
    });

    it('should include extra data in fragment value', () => {
        const action = new EmitSystemOutputAction(
            'pop: Test', 'pop', 'block-1', 'Test', 1,
            { completionReason: 'timer-expired' }
        );
        action.do(runtime);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        const fragment = output.fragments[0];
        expect(fragment.value.completionReason).toBe('timer-expired');
    });

    it('should create a point-in-time TimeSpan', () => {
        const action = new EmitSystemOutputAction('next: Test', 'next', 'block-1');
        action.do(runtime);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        expect(output.timeSpan.started).toBe(output.timeSpan.ended);
    });

    it('should fall back to runtime stack count when stackLevel not provided', () => {
        const action = new EmitSystemOutputAction('push: Test', 'push', 'block-1');
        action.do(runtime);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        expect(output.stackLevel).toBe(2); // from mock runtime.stack.count
    });

    it('should include blockLabel in fragment value when provided', () => {
        const action = new EmitSystemOutputAction('push: 5×Burpees', 'push', 'block-1', '5×Burpees');
        action.do(runtime);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        const fragment = output.fragments[0];
        expect(fragment.value.blockLabel).toBe('5×Burpees');
    });

    it('should use runtime clock timestamp for fragment', () => {
        const action = new EmitSystemOutputAction('next: Test', 'next', 'block-1');
        action.do(runtime);

        const output = (runtime.addOutput as any).mock.calls[0][0];
        const fragment = output.fragments[0];
        expect(fragment.timestamp).toEqual(new Date('2024-01-15T12:00:00Z'));
    });
});
