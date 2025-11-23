// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRuntimeExecution } from './useRuntimeExecution';
import { ScriptRuntime } from '../../runtime/ScriptRuntime';

// Mock ScriptRuntime
vi.mock('../../runtime/ScriptRuntime');

describe('useRuntimeExecution', () => {
    let mockRuntime: any;

    beforeEach(() => {
        vi.useFakeTimers();
        mockRuntime = {
            handle: vi.fn(),
            isComplete: vi.fn().mockReturnValue(false),
        };
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    it('should initialize with idle status', () => {
        const { result } = renderHook(() => useRuntimeExecution(mockRuntime));
        expect(result.current.status).toBe('idle');
        expect(result.current.stepCount).toBe(0);
        expect(result.current.elapsedTime).toBe(0);
    });

    it('should start execution', () => {
        const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

        act(() => {
            result.current.start();
        });

        expect(result.current.status).toBe('running');
        expect(mockRuntime.handle).toHaveBeenCalledTimes(0); // No immediate step
        
        act(() => {
            vi.advanceTimersByTime(20);
        });
        
        expect(mockRuntime.handle).toHaveBeenCalledTimes(1);
        expect(result.current.stepCount).toBe(1);
    });

    it('should continue execution with interval', () => {
        const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

        act(() => {
            result.current.start();
        });

        expect(mockRuntime.handle).toHaveBeenCalledTimes(0);

        act(() => {
            vi.advanceTimersByTime(20);
        });

        expect(mockRuntime.handle).toHaveBeenCalledTimes(1);
        
        act(() => {
            vi.advanceTimersByTime(20);
        });

        expect(mockRuntime.handle).toHaveBeenCalledTimes(2);
    });

    it('should stop execution', () => {
        const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

        act(() => {
            result.current.start();
        });
        
        // Advance one tick to start
        act(() => {
            vi.advanceTimersByTime(20);
        });

        act(() => {
            result.current.stop();
        });

        expect(result.current.status).toBe('idle');
        expect(result.current.stepCount).toBe(0);
        expect(result.current.elapsedTime).toBe(0);

        // Verify interval is cleared
        act(() => {
            vi.advanceTimersByTime(100);
        });

        // Should not have called handle again (was 1 from start)
        expect(mockRuntime.handle).toHaveBeenCalledTimes(1);
    });

    it('should handle immediate completion', () => {
        // Runtime completes immediately
        mockRuntime.isComplete.mockReturnValue(true);

        const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

        act(() => {
            result.current.start();
        });
        
        // Advance one tick
        act(() => {
            vi.advanceTimersByTime(20);
        });

        // Should execute one step, then stop
        expect(mockRuntime.handle).toHaveBeenCalledTimes(1);
        
        // Status should be completed (or idle if stop resets it?)
        // executeStep calls stop() then setStatus('completed')
        expect(result.current.status).toBe('completed');
        
        // Interval should be cleared
        act(() => {
            vi.advanceTimersByTime(100);
        });
        
        expect(mockRuntime.handle).toHaveBeenCalledTimes(1);
    });

    it('should handle error in execution', () => {
        mockRuntime.handle.mockImplementation(() => {
            throw new Error('Runtime error');
        });

        const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

        act(() => {
            result.current.start();
        });
        
        // Advance one tick
        act(() => {
            vi.advanceTimersByTime(20);
        });

        expect(result.current.status).toBe('error');
        
        // Interval should be cleared
        act(() => {
            vi.advanceTimersByTime(100);
        });
        
        expect(mockRuntime.handle).toHaveBeenCalledTimes(1);
    });
});
