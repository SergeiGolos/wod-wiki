import { useMemo, useState, useEffect } from 'react';
import { useTimerReferences } from './useTimerReferences';
import { useMemorySubscription } from './useMemorySubscription';
import { TimeSpan } from '../behaviors/TimerBehavior';

/**
 * Result from useTimerElapsed hook.
 */
export interface UseTimerElapsedResult {
  elapsed: number;          // Total milliseconds across all spans
  isRunning: boolean;       // Current running state
  timeSpans: TimeSpan[];    // Array of start/stop pairs
}

/**
 * Hook to calculate elapsed time for a timer block.
 * 
 * This hook combines timer memory references and subscription to provide
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
  const { timeSpans: timeSpansRef, isRunning: isRunningRef } = useTimerReferences(blockKey);
  
  // Subscribe to memory changes
  const timeSpans = useMemorySubscription(timeSpansRef) || [];
  const isRunning = useMemorySubscription(isRunningRef) || false;

  const [now, setNow] = useState(Date.now());

  // Calculate elapsed time
  const elapsed = useMemo(() => {
    if (timeSpans.length === 0) return 0;

    return timeSpans.reduce((total, span) => {
      if (!span.start) return total;
      
      // If no stop time, timer is running - use current time
      const stop = span.stop?.getTime() || now;
      const start = span.start.getTime();
      return total + (stop - start);
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

    animationFrameId = requestAnimationFrame(update);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning]);

  return {
    elapsed,
    isRunning,
    timeSpans
  };
}
