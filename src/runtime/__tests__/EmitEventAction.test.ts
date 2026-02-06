import { describe, it, expect, vi, beforeEach } from 'bun:test';
import { EmitEventAction } from '../actions/events/EmitEventAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';

describe('EmitEventAction', () => {
    let mockRuntime: IScriptRuntime;

    beforeEach(() => {
        mockRuntime = {
            eventBus: {
                dispatch: vi.fn().mockReturnValue([]),
            },
            do: vi.fn(),
            handle: vi.fn(),
        } as unknown as IScriptRuntime;
    });

    it('should have correct action type', () => {
        const action = new EmitEventAction('test:event');
        expect(action.type).toBe('emit-event');
    });

    it('should dispatch event with correct name and data', () => {
        const action = new EmitEventAction('test:event', { key: 'value' });
        action.do(mockRuntime);

        expect(mockRuntime.eventBus.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'test:event',
                data: { key: 'value' },
            }),
            mockRuntime
        );
    });

    it('should process returned actions via runtime.do()', () => {
        const returnedAction1 = { type: 'action-1', do: vi.fn() };
        const returnedAction2 = { type: 'action-2', do: vi.fn() };
        (mockRuntime.eventBus.dispatch as any).mockReturnValueOnce([returnedAction1, returnedAction2]);

        const action = new EmitEventAction('test:event');
        action.do(mockRuntime);

        // Should call runtime.do() for each returned action (in reverse for LIFO)
        expect(mockRuntime.do).toHaveBeenCalledTimes(2);
        expect(mockRuntime.do).toHaveBeenCalledWith(returnedAction2);
        expect(mockRuntime.do).toHaveBeenCalledWith(returnedAction1);
    });

    it('should not call runtime.do() when no actions are returned', () => {
        (mockRuntime.eventBus.dispatch as any).mockReturnValueOnce([]);

        const action = new EmitEventAction('test:event');
        action.do(mockRuntime);

        expect(mockRuntime.do).not.toHaveBeenCalled();
    });

    it('should use provided timestamp', () => {
        const timestamp = new Date('2024-06-15T10:30:00Z');
        const action = new EmitEventAction('test:event', undefined, timestamp);
        action.do(mockRuntime);

        expect(mockRuntime.eventBus.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({
                timestamp,
            }),
            mockRuntime
        );
    });
});
