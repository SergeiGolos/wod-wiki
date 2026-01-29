import { useMemo, useState, useEffect } from 'react';
import { useTimerReferences } from './useTimerReferences';
import { useMemorySubscription } from './useMemorySubscription';
import { TimeSpan } from '../models/TimeSpan';


/**
 * Result from useTimerElapsed hook.
 */
export interface UseTimerElapsedResult {
  elapsed: number;          // Total milliseconds across all spans
  isRunning: boolean;       // Current running state
  timeSpans: TimeSpan[];   // Array of start/stop pairs (number timestamps)
}

/**
 * Hook to calculate elapsed time for a timer block by key.
 * 
 * This hook uses the unified TimerState from runtime memory to provide
 * real-time elapsed time calculation. It polls for updates when the timer
 * is running to show current time, but only subscribes to memory changes
 * for start/stop/pause/resume events.
 * 
 * ## When to Use This Hook
 * 
 * Use this hook when your component receives a `blockKey: string` from the
 * display stack system. This is the standard integration pattern for:
 * - ClockAnchor
 * - DigitalClock
 * - Display stack consumers
 * 
 * ## When to Use useTimerDisplay Instead
 * 
 * If you have direct access to an `IRuntimeBlock` reference (e.g., from
 * `runtime.stack.current()`), prefer `useTimerDisplay(block)` which provides
 * formatted time strings and richer display values.
 * 
 * ## Features
 * - Zero polling for completed timers
 * - Subscription-based updates for state changes
 * - 60fps animation frame updates when running
 * 
 * @param blockKey The block key to track elapsed time for
 * @returns Object with elapsed time, running state, and time spans
 * 
 * @example
 * ```tsx
 * // Display stack integration (this hook)
 * function KeyBasedTimer({ blockKey }: { blockKey: string }) {
 *   const { elapsed, isRunning } = useTimerElapsed(blockKey);
 *   const formatted = formatMs(elapsed);
 *   return <div className={isRunning ? 'running' : ''}>{formatted}</div>;
 * }
 * 
 * // Direct block access (use useTimerDisplay instead)
 * function BlockTimer({ block }: { block: IRuntimeBlock }) {
 *   const display = useTimerDisplay(block);
 *   return <div>{display?.formatted}</div>;
 * }
 * ```
 */
export function useTimerElapsed(blockKey: string): UseTimerElapsedResult {
  const { timerState: timerStateRef } = useTimerReferences(blockKey);

  // Subscribe to unified TimerState changes
  const timerState = useMemorySubscription(timerStateRef);

  // Extract spans from unified state
  // Even if class type is lost (serialization), the shape { started, ended? } remains
  const timeSpans = timerState?.spans || [];

  // Robustly derive isRunning locally just in case prototype methods (getters) are lost
  const isRunning = timeSpans.length > 0 && timeSpans[timeSpans.length - 1].ended === undefined;

  const [now, setNow] = useState(Date.now());

  // Calculate elapsed time
  const elapsed = useMemo(() => {
    if (timeSpans.length === 0) return 0;

    return timeSpans.reduce((total, span) => {
      // span.started should be present. TimeSpan uses number timestamps (epoch ms)
      if (typeof span.started !== 'number') return total;

      // If no end time, timer is running - use current time
      const end = span.ended ?? now;
      const start = span.started;
      return total + Math.max(0, end - start);
    }, 0);
  }, [timeSpans, now]);

  // Animation frame for running timers
  useEffect(() => {
    if (!isRunning) return;

    let animationFrameId: number;

    const update = () => {
      setNow(Date.now());
      animationFrameId = requestAnimationFrame(update);
    };

    update(); // Initial update

    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning]);

  return {
    elapsed,
    isRunning,
    timeSpans
  };
}
