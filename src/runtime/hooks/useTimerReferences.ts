import { useMemo } from 'react';
import { useRuntimeContext } from '../context/RuntimeContext';
import { TypedMemoryReference } from '../IMemoryReference';
import { TimeSpan, TIMER_MEMORY_TYPES } from '../behaviors/TimerBehavior';

/**
 * Timer memory references for a specific block.
 */
export interface TimerReferences {
  timeSpans: TypedMemoryReference<TimeSpan[]> | undefined;
  isRunning: TypedMemoryReference<boolean> | undefined;
}

/**
 * Hook to retrieve timer memory references for a specific block.
 * 
 * This hook searches the runtime memory for timer-related memory references
 * associated with the given blockKey. Returns undefined for references that
 * are not found (e.g., if the block hasn't been pushed yet).
 * 
 * @param blockKey The block key to search for timer references
 * @returns Object containing timeSpans and isRunning memory references
 * 
 * @example
 * ```tsx
 * const { timeSpans, isRunning } = useTimerReferences(blockKey);
 * 
 * if (timeSpans && isRunning) {
 *   // Timer references are available
 * }
 * ```
 */
export function useTimerReferences(blockKey: string): TimerReferences {
  const runtime = useRuntimeContext();

  return useMemo(() => {
    const timeSpansRefs = runtime.memory.search({
      id: null,
      ownerId: blockKey,
      type: TIMER_MEMORY_TYPES.TIME_SPANS,
      visibility: null
    });

    const isRunningRefs = runtime.memory.search({
      id: null,
      ownerId: blockKey,
      type: TIMER_MEMORY_TYPES.IS_RUNNING,
      visibility: null
    });

    return {
      timeSpans: timeSpansRefs[0] as TypedMemoryReference<TimeSpan[]> | undefined,
      isRunning: isRunningRefs[0] as TypedMemoryReference<boolean> | undefined
    };
  }, [runtime, blockKey]);
}
