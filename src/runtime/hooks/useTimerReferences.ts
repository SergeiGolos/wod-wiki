import { useMemo } from 'react';
import { useRuntimeContext } from '../context/RuntimeContext';
import { TypedMemoryReference } from '../IMemoryReference';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../models/RuntimeSpan';

/**
 * Timer memory references for a specific block.
 * @deprecated Prefer using useTimerState hook for the unified TimerState model
 */
export interface TimerReferences {
  /** @deprecated Use timerState.spans instead */
  timeSpans: undefined;
  /** @deprecated Use timerState.isRunning instead */
  isRunning: undefined;
  /** The unified timer state reference */
  timerState: TypedMemoryReference<RuntimeSpan> | undefined;
}

/**
 * Hook to retrieve timer memory references for a specific block.
 * 
 * This hook searches the runtime memory for the TimerState reference
 * associated with the given blockKey. The TimerState contains:
 * - spans: TimeSpan[] (start/stop times)
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
    // Search for the unified RuntimeSpan using the constant type
    // The 'type' field in memory allocation is `runtime-span`
    // We filter by ownerId which is the blockKey
    const timerStateRefs = runtime.memory.search({
      id: null,
      ownerId: blockKey,
      type: RUNTIME_SPAN_TYPE,
      visibility: null
    });

    const timerStateRef = timerStateRefs[0] as TypedMemoryReference<RuntimeSpan> | undefined;

    return {
      // Legacy fields - no longer supported, return undefined
      timeSpans: undefined,
      isRunning: undefined,
      // New unified state
      timerState: timerStateRef
    };
  }, [runtime, blockKey]);
}
