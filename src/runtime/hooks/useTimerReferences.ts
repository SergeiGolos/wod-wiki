import { useMemo } from 'react';
import { useRuntimeContext } from '../context/RuntimeContext';
import { TypedMemoryReference } from '../contracts/IMemoryReference';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../models/RuntimeSpan';

/**
 * Timer memory references for a specific block.
 * 
 * Note: This interface is used by the display stack integration layer.
 * The `timeSpans` and `isRunning` fields are no longer populated directly;
 * use `timerState.get()` to access the unified TimerState model.
 */
export interface TimerReferences {
  /** No longer populated - use timerState.get().spans instead */
  timeSpans: undefined;
  /** No longer populated - use timerState.get().isRunning instead */
  isRunning: undefined;
  /** The unified timer state reference */
  timerState: TypedMemoryReference<RuntimeSpan> | undefined;
}

/**
 * Hook to retrieve timer memory references for a specific block by key.
 * 
 * This is a low-level hook used by `useTimerElapsed` to bridge the display
 * stack system (which uses string blockKeys) to the memory system.
 * 
 * ## When to Use This Hook
 * 
 * Most consumers should use `useTimerElapsed(blockKey)` instead, which
 * provides computed elapsed time. Use this hook only when you need direct
 * access to the memory reference for advanced subscription patterns.
 * 
 * ## Timer State Contents
 * - spans: TimeSpan[] (start/stop times)
 * - isRunning: boolean
 * - format: 'up' | 'down' | 'time'
 * - durationMs: number (for countdown)
 * 
 * @param blockKey The block key to search for timer references
 * @returns Object containing timerState reference
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
