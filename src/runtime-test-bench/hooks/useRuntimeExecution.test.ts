/**
 * useRuntimeExecution Hook Tests
 * 
 * Tests execution lifecycle management with fixed 20ms tick rate.
 * 
 * Test Strategy:
 * - Use @testing-library/react-hooks for hook testing
 * - Mock ScriptRuntime for controlled testing
 * - Verify interval management and cleanup
 * - Test all execution states and transitions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRuntimeExecution } from './useRuntimeExecution';
import type { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { EXECUTION_TICK_RATE_MS } from '../config/constants';

describe('useRuntimeExecution', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should start in idle state with zero counters', () => {
      const { result } = renderHook(() => useRuntimeExecution(null));

      expect(result.current.status).toBe('idle');
      expect(result.current.elapsedTime).toBe(0);
      expect(result.current.stepCount).toBe(0);
    });

    it('should provide all control methods', () => {
      const { result } = renderHook(() => useRuntimeExecution(null));

      expect(typeof result.current.start).toBe('function');
      expect(typeof result.current.pause).toBe('function');
      expect(typeof result.current.stop).toBe('function');
      expect(typeof result.current.reset).toBe('function');
      expect(typeof result.current.step).toBe('function');
    });
  });

  describe('start()', () => {
    it('should change status to "running"', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
      });

      expect(result.current.status).toBe('running');
    });

    it('should not start if runtime is null', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useRuntimeExecution(null));

      act(() => {
        result.current.start();
      });

      expect(result.current.status).toBe('idle');
      expect(consoleSpy).toHaveBeenCalledWith('Cannot start execution: runtime is null');
      consoleSpy.mockRestore();
    });

    it('should execute first step immediately', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
      });

      expect(mockRuntime.handle).toHaveBeenCalledTimes(1);
      expect(result.current.stepCount).toBe(1);
    });

    it('should set up interval with EXECUTION_TICK_RATE_MS', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
      });

      // Fast-forward time by tick rate
      act(() => {
        vi.advanceTimersByTime(EXECUTION_TICK_RATE_MS);
      });

      expect(mockRuntime.handle).toHaveBeenCalledTimes(2); // Initial + 1 interval
      expect(result.current.stepCount).toBe(2);
    });

    it('should execute multiple steps over time', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
      });

      // Fast-forward 5 ticks
      act(() => {
        vi.advanceTimersByTime(EXECUTION_TICK_RATE_MS * 5);
      });

      expect(mockRuntime.handle).toHaveBeenCalledTimes(6); // Initial + 5 intervals
      expect(result.current.stepCount).toBe(6);
    });

    it('should not start if already running', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
      });

      // Status should be running after first start
      expect(result.current.status).toBe('running');

      // Try to start again - should remain in running state without error
      act(() => {
        result.current.start();
      });

      // Status should still be running (not restarted)
      expect(result.current.status).toBe('running');
    });
  });

  describe('pause()', () => {
    it('should change status to "paused"', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
        result.current.pause();
      });

      expect(result.current.status).toBe('paused');
    });

    it('should stop executing steps', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
      });

      const initialCallCount = mockRuntime.handle.mock.calls.length;

      act(() => {
        result.current.pause();
        vi.advanceTimersByTime(EXECUTION_TICK_RATE_MS * 3);
      });

      expect(mockRuntime.handle).toHaveBeenCalledTimes(initialCallCount);
    });

    it('should preserve stepCount and elapsedTime', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
        vi.advanceTimersByTime(EXECUTION_TICK_RATE_MS * 3);
      });

      const stepCountBeforePause = result.current.stepCount;

      act(() => {
        result.current.pause();
      });

      expect(result.current.stepCount).toBe(stepCountBeforePause);
    });
  });

  describe('stop()', () => {
    it('should change status to "idle"', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
        result.current.stop();
      });

      expect(result.current.status).toBe('idle');
    });

    it('should reset counters to zero', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
        vi.advanceTimersByTime(EXECUTION_TICK_RATE_MS * 3);
        result.current.stop();
      });

      expect(result.current.stepCount).toBe(0);
      expect(result.current.elapsedTime).toBe(0);
    });

    it('should clear interval', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
        result.current.stop();
        vi.advanceTimersByTime(EXECUTION_TICK_RATE_MS * 3);
      });

      expect(mockRuntime.handle).toHaveBeenCalledTimes(1); // Only initial call
    });
  });

  describe('reset()', () => {
    it('should reset counters to zero', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
        vi.advanceTimersByTime(EXECUTION_TICK_RATE_MS * 3);
        result.current.reset();
      });

      expect(result.current.stepCount).toBe(0);
      expect(result.current.elapsedTime).toBe(0);
    });

    it('should change status to "idle"', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
    });
  });

  describe('step()', () => {
    it('should execute a single step', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.step();
      });

      expect(mockRuntime.handle).toHaveBeenCalledTimes(1);
      expect(result.current.stepCount).toBe(1);
    });

    it('should change status to "paused"', () => {
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.step();
      });

      expect(result.current.status).toBe('paused');
    });

    it('should not step if runtime is null', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useRuntimeExecution(null));

      act(() => {
        result.current.step();
      });

      expect(result.current.stepCount).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('Cannot step: runtime is null');
      consoleSpy.mockRestore();
    });

    it('should not step while running', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const mockRuntime = createMockRuntime();
      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
      });

      // Ensure status is running
      expect(result.current.status).toBe('running');

      act(() => {
        result.current.step(); // Try to step while running
      });

      expect(consoleSpy).toHaveBeenCalledWith('Cannot step while running');
      consoleSpy.mockRestore();
    });
  });

  describe('Completion Detection', () => {
    it('should change status to "completed" when runtime finishes', () => {
      const mockRuntime = createMockRuntime();
      mockRuntime.isComplete.mockReturnValue(true);

      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
      });

      expect(result.current.status).toBe('completed');
    });

    it('should stop interval when runtime completes', () => {
      const mockRuntime = createMockRuntime();
      let callCount = 0;
      mockRuntime.isComplete.mockImplementation(() => {
        callCount++;
        return callCount > 2; // Complete after 2 calls
      });

      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
        vi.advanceTimersByTime(EXECUTION_TICK_RATE_MS * 5);
      });

      expect(result.current.status).toBe('completed');
      expect(mockRuntime.handle).toHaveBeenCalledTimes(3); // Initial + 2 intervals
    });
  });

  describe('Error Handling', () => {
    it('should change status to "error" when runtime throws', () => {
      const mockRuntime = createMockRuntime();
      mockRuntime.handle.mockImplementation(() => {
        throw new Error('Runtime error');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
      });

      expect(result.current.status).toBe('error');
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('should stop interval when error occurs', () => {
      const mockRuntime = createMockRuntime();
      let callCount = 0;
      mockRuntime.handle.mockImplementation(() => {
        callCount++;
        if (callCount > 2) throw new Error('Runtime error');
      });

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
        vi.advanceTimersByTime(EXECUTION_TICK_RATE_MS * 5);
      });

      expect(result.current.status).toBe('error');
      expect(mockRuntime.handle).toHaveBeenCalledTimes(3);
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should clear interval on unmount', () => {
      const mockRuntime = createMockRuntime();
      const { result, unmount } = renderHook(() => useRuntimeExecution(mockRuntime));

      act(() => {
        result.current.start();
      });

      unmount();

      act(() => {
        vi.advanceTimersByTime(EXECUTION_TICK_RATE_MS * 3);
      });

      // Should not execute any more steps after unmount
      expect(mockRuntime.handle).toHaveBeenCalledTimes(1); // Only initial call
    });

    it('should reset when runtime becomes null', () => {
      const mockRuntime = createMockRuntime();
      const { result, rerender } = renderHook(
        ({ runtime }) => useRuntimeExecution(runtime),
        { initialProps: { runtime: mockRuntime } }
      );

      act(() => {
        result.current.start();
        vi.advanceTimersByTime(EXECUTION_TICK_RATE_MS * 2);
      });

      // Change runtime to null
      act(() => {
        rerender({ runtime: null });
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.stepCount).toBe(0);
    });
  });
});

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a minimal mock ScriptRuntime for testing
 */
function createMockRuntime(): ScriptRuntime {
  return {
    handle: vi.fn(),
    isComplete: vi.fn().mockReturnValue(false),
    stack: { blocks: [] },
    memory: { search: () => [] }
  } as unknown as ScriptRuntime;
}
