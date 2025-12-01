import { useMemo } from 'react';
import { useRuntimeContext } from '../context/RuntimeContext';
import { TypedMemoryReference } from '../IMemoryReference';
import { TimerState, TimerSpan } from '../models/MemoryModels';
import { MemoryTypeEnum } from '../MemoryTypeEnum';

/**
 * Timer memory references for a specific block.
 * @deprecated Prefer using useTimerState hook for the unified TimerState model
 */
export interface TimerReferences {
  /** @deprecated Use timerState.spans instead */
  timeSpans: TypedMemoryReference<TimerSpan[]> | undefined;
  /** @deprecated Use timerState.isRunning instead */
  isRunning: TypedMemoryReference<boolean> | undefined;
  /** The unified timer state reference */
  timerState: TypedMemoryReference<TimerState> | undefined;
}

/**
 * Hook to retrieve timer memory references for a specific block.
 * 
 * This hook searches the runtime memory for the TimerState reference
 * associated with the given blockKey. The TimerState contains:
 * - spans: TimerSpan[] (start/stop times)
 * - isRunning: boolean
 * - format: 'up' | 'down' | 'time'
 * - durationMs: number (for countdown)
 * 
 * @param blockKey The block key to search for timer references
 * @returns Object containing timerState reference (legacy timeSpans/isRunning are undefined)
 * 
 * @example
 * ```tsx
 * const { timerState } = useTimerReferences(blockKey);
 * 
 * if (timerState) {
 *   const state = timerState.get();
 *   console.log(`Running: ${state?.isRunning}, Spans: ${state?.spans.length}`);
 * }
 * ```
 */
export function useTimerReferences(blockKey: string): TimerReferences {
  const runtime = useRuntimeContext();

  return useMemo(() => {
    // Search for the unified TimerState using the timer type prefix
    // The 'type' field in memory allocation is `timer:${blockId}`
    const timerStateRefs = runtime.memory.search({
      id: null,
      ownerId: blockKey,
      type: `${MemoryTypeEnum.TIMER_PREFIX}${blockKey}`,
      visibility: null
    });

    const timerStateRef = timerStateRefs[0] as TypedMemoryReference<TimerState> | undefined;

    return {
      // Legacy fields - no longer supported, return undefined
      timeSpans: undefined,
      isRunning: undefined,
      // New unified state
      timerState: timerStateRef
    };
  }, [runtime, blockKey]);
}
