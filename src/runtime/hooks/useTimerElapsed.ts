import { useMemo, useState, useEffect } from 'react';
import { useScriptRuntime } from '../context/RuntimeContext';
import { TimeSpan } from '../models/TimeSpan';
import { TimerState } from '../memory/MemoryTypes';
import { calculateDuration } from '../../lib/timeUtils';


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
  const runtime = useScriptRuntime();
  
  // Find the block from the stack by key
  const block = useMemo(() => {
    return runtime.stack.blocks.find(b => b.key.toString() === blockKey);
  }, [runtime, blockKey]);
  
  // Subscribe to block-level timer memory
  const [timerState, setTimerState] = useState<TimerState | undefined>(() => {
    return block?.getMemory('time')?.value;
  });
  
  // Subscribe to stack changes to update block reference
  useEffect(() => {
    const unsubscribe = runtime.stack.subscribe(() => {
      const foundBlock = runtime.stack.blocks.find(b => b.key.toString() === blockKey);
      if (foundBlock) {
        const entry = foundBlock.getMemory('time');
        setTimerState(entry?.value);
      } else {
        setTimerState(undefined);
      }
    });
    return unsubscribe;
  }, [runtime, blockKey]);
  
  // Subscribe to timer memory changes on the block
  useEffect(() => {
    if (!block) {
      setTimerState(undefined);
      return;
    }
    
    const entry = block.getMemory('time');
    setTimerState(entry?.value);
    
    if (entry && typeof entry.subscribe === 'function') {
      const unsubscribe = entry.subscribe((newValue) => {
        setTimerState(newValue as TimerState | undefined);
      });
      return unsubscribe;
    }
  }, [block]);

  // Extract spans from timer state
  const timeSpans = timerState?.spans || [];

  // Derive isRunning from spans - last span has no end time
  const isRunning = timeSpans.length > 0 && timeSpans[timeSpans.length - 1].ended === undefined;

  const [now, setNow] = useState(Date.now());

  // Calculate elapsed time using shared utility
  const elapsed = useMemo(() => {
    if (timeSpans.length === 0) return 0;
    return calculateDuration(timeSpans, now);
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
