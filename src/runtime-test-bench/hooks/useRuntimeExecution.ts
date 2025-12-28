/**
 * useRuntimeExecution - Custom React hook for managing ScriptRuntime execution
 * 
 * Encapsulates execution logic, interval management, and lifecycle cleanup.
 * Replaces 200+ lines of inline execution logic in RuntimeTestBench.
 * 
 * Architecture Decision:
 * - Fixed 20ms tick rate (50 ticks per second)
 * - No speed control (removed for simplicity)
 * - Automatic cleanup on unmount
 * - Reusable across components (future Clock component)
 * 
 * Phase: 1.3 Foundation - Infrastructure
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ScriptRuntime } from '../../runtime/ScriptRuntime';
import { TickEvent } from '../../runtime/events/NextEvent';
import { EXECUTION_TICK_RATE_MS } from '../config/constants';

/**
 * Execution status states
 */
export type ExecutionStatus = 
  | 'idle'       // No runtime or not started
  | 'running'    // Active execution with interval
  | 'paused'     // Execution stopped but state preserved
  | 'completed'  // Runtime finished successfully
  | 'error';     // Runtime encountered error

/**
 * Return type for useRuntimeExecution hook
 */
export interface UseRuntimeExecutionReturn {
  status: ExecutionStatus;
  elapsedTime: number;
  stepCount: number;
  startTime: number | null;
  start: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  step: () => void;
}

/**
 * Manages ScriptRuntime execution lifecycle with fixed 20ms tick rate
 * 
 * Usage:
 * ```typescript
 * const execution = useRuntimeExecution(runtime);
 * 
 * <ControlsPanel
 *   status={execution.status}
 *   elapsedTime={execution.elapsedTime}
 *   onPlay={execution.start}
 *   onPause={execution.pause}
 *   onStop={execution.stop}
 *   onReset={execution.reset}
 *   onStep={execution.step}
 * />
 * ```
 * 
 * @param runtime - The ScriptRuntime instance to execute (null if not ready)
 * @returns Object with execution state and control methods
 */
export const useRuntimeExecution = (
  runtime: ScriptRuntime | null
): UseRuntimeExecutionReturn => {
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  /**
   * Executes a single runtime step
   * Called by interval timer and step() method
   */
  const executeStep = useCallback(() => {
    if (!runtime) return;

    try {
      // Use TickEvent for periodic updates instead of NextEvent
      const tickEvent = new TickEvent();
      runtime.handle(tickEvent);
      setStepCount(prev => prev + 1);

      // Check if runtime is complete
      if (runtime.isComplete()) {
        stop();
        setStatus('completed');
      }
    } catch (error) {
      stop();
      setStatus('error');
      console.error('Runtime execution error:', error);
    }
  }, [runtime]);

  /**
   * Starts continuous execution at fixed 20ms tick rate
   */
  const start = useCallback(() => {
    if (!runtime) {
      console.warn('Cannot start execution: runtime is null');
      return;
    }

    if (status === 'running') return;

    setStatus('running');
    const now = Date.now();
    startTimeRef.current = now - elapsedTime; // Resume from paused time
    
    // Only set startTime on first start (not resume)
    if (elapsedTime === 0) {
      setStartTime(now);
    }

    // Start interval for subsequent steps
    intervalRef.current = setInterval(executeStep, EXECUTION_TICK_RATE_MS);
  }, [runtime, status, elapsedTime, executeStep]);

  /**
   * Pauses execution, preserving state
   */
  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus('paused');
  }, []);

  /**
   * Stops execution and resets state
   */
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setElapsedTime(0);
    setStepCount(0);
    setStatus('idle');
    setStartTime(null);
    startTimeRef.current = null;
  }, []);

  /**
   * Resets execution state without stopping
   * Used for "replay" functionality
   */
  const reset = useCallback(() => {
    stop();
    setElapsedTime(0);
    setStepCount(0);
    setStartTime(null);
    startTimeRef.current = null;

    // Reset runtime if available
    if (runtime) {
      // TODO: Add runtime.reset() method when available
    }
  }, [runtime, stop]);

  /**
   * Executes a single step manually
   * Used for debugging and step-through execution
   */
  const step = useCallback(() => {
    if (!runtime) {
      console.warn('Cannot step: runtime is null');
      return;
    }

    if (status === 'running') {
      console.warn('Cannot step while running');
      return;
    }

    setStatus('paused');
    executeStep();
  }, [runtime, status, executeStep]);

  /**
   * Update elapsed time while running
   */
  useEffect(() => {
    if (status !== 'running' || !startTimeRef.current) return;

    const updateInterval = setInterval(() => {
      setElapsedTime(Date.now() - startTimeRef.current!);
    }, 100); // Update display every 100ms

    return () => clearInterval(updateInterval);
  }, [status]);

  /**
   * Cleanup on unmount - critical for preventing memory leaks
   */
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  /**
   * Reset state when runtime changes
   */
  useEffect(() => {
    if (!runtime) {
      stop();
    }
  }, [runtime, stop]);

  return {
    status,
    elapsedTime,
    stepCount,
    startTime,
    start,
    pause,
    stop,
    reset,
    step
  };
};
