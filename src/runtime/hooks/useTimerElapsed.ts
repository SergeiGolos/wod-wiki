import { useMemo, useState, useEffect } from 'react';
import { useTimerReferences } from './useTimerReferences';
import { useMemorySubscription } from './useMemorySubscription';
import { TimerSpan } from '../models/RuntimeSpan';

/**
 * Result from useTimerElapsed hook.
 */
export interface UseTimerElapsedResult {
  elapsed: number;          // Total milliseconds across all spans
  isRunning: boolean;       // Current running state
  timeSpans: TimerSpan[];   // Array of start/stop pairs (number timestamps)
}

/**
 * Hook to calculate elapsed time for a timer block.
 * 
 * This hook uses the unified TimerState from runtime memory to provide
 * real-time elapsed time calculation. It polls for updates when the timer
 * is running to show current time, but only subscribes to memory changes
 * for start/stop/pause/resume events.
 * 
 * Benefits over old polling system:
 * - Zero polling for completed timers
 * - Subscription-based updates for state changes
 * - Polling only for display time calculation, not data fetching
 * 
 * @param blockKey The block key to track elapsed time for
 * @returns Object with elapsed time, running state, and time spans
 * 
 * @example
 * ```tsx
 * const { elapsed, isRunning, timeSpans } = useTimerElapsed(blockKey);
 * 
 * const seconds = Math.floor(elapsed / 1000);
 * console.log(`Timer: ${seconds}s, Running: ${isRunning}`);
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
      // span.started should be present. TimerSpan uses number timestamps (epoch ms)
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
