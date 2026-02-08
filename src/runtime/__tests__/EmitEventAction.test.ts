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
            doAll: vi.fn(),
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

    it('should return dispatched actions for ExecutionContext to process', () => {
        const returnedAction1 = { type: 'action-1', do: vi.fn() };
        const returnedAction2 = { type: 'action-2', do: vi.fn() };
        (mockRuntime.eventBus.dispatch as any).mockReturnValueOnce([returnedAction1, returnedAction2]);

        const action = new EmitEventAction('test:event');
        const result = action.do(mockRuntime);

        // Should return the dispatched actions (ExecutionContext pushes them onto the stack)
        expect(result).toEqual([returnedAction1, returnedAction2]);
    });

    it('should return empty array when no actions are returned from dispatch', () => {
        (mockRuntime.eventBus.dispatch as any).mockReturnValueOnce([]);

        const action = new EmitEventAction('test:event');
        const result = action.do(mockRuntime);

        expect(result).toEqual([]);
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
