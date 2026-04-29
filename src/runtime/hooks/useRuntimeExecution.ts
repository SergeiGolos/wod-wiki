/**
 * useRuntimeExecution - Custom React hook for managing ScriptRuntime execution
 * 
 * Encapsulates execution logic, interval management, and lifecycle cleanup.
 * 
 * Architecture Decision:
 * - Fixed 20ms tick rate (50 ticks per second)
 * - No speed control (removed for simplicity)
 * - Automatic cleanup on unmount
 * - Reusable across components
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { ScriptRuntime } from '../ScriptRuntime';
import { TickEvent } from '../events/TickEvent';

/** Fixed execution tick rate in milliseconds (50 ticks per second) */
const EXECUTION_TICK_RATE_MS = 20;

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
    } catch (error) {
      stop();
      setStatus('error');
      console.error('Runtime execution error:', error);
    }
  }, [runtime]);

  /**
   * Reactive completion detection
   * Ensures 'completed' status is set immediately when the stack becomes empty,
   * regardless of whether the playback loop is active.
   */
  useEffect(() => {
    if (!runtime) return;
    
    // Subscribe to stack snapshots to detect when everything is finished
    const unsubscribe = runtime.subscribeToStack((snapshot) => {
      // If stack becomes empty and we were previously in an active state, we are done!
      if (snapshot.blocks.length === 0 && (status === 'running' || status === 'paused')) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setStatus('completed');
      }
    });

    return unsubscribe;
  }, [runtime, status]);

  /**
   * Starts continuous execution at fixed 20ms tick rate
   */
  const start = useCallback(() => {
    if (!runtime) {
      console.warn('Cannot start execution: runtime is null');
      return;
    }

    if (status === 'running') {
      console.warn('Cannot start execution: already running');
      return;
    }

    // Emit timer:resume event when resuming from paused state
    if (status === 'paused') {
      runtime.handle({
        name: 'timer:resume',
        timestamp: new Date(),
        data: {}
      });
    }

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

    // Emit timer:pause event to update timer memory spans
    if (runtime) {
      runtime.handle({
        name: 'timer:pause',
        timestamp: new Date(),
        data: {}
      });
    }

    setStatus('paused');
  }, [runtime]);

  /**
   * Stops continuous execution without clearing metrics.
   * Preserves elapsedTime and startTime for completion reporting.
   */
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setStatus('idle');
  }, []);

  /**
   * Resets execution state and clears all metrics.
   * Used for "replay" functionality or starting fresh.
   */
  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setElapsedTime(0);
    setStepCount(0);
    setStatus('idle');
    setStartTime(null);
    startTimeRef.current = null;

    // Reset runtime if available
    if (runtime) {
      // TODO: Add runtime.reset() method when available
    }
  }, [runtime]);

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
    reset();
  }, [runtime, reset]);

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
