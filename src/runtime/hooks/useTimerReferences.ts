import { useMemo } from 'react';
import { useRuntimeContext } from '../context/RuntimeContext';
import { TypedMemoryReference } from '../contracts/IMemoryReference';
import { RuntimeSpan, RUNTIME_SPAN_TYPE } from '../models/RuntimeSpan';

/**
 * Timer memory references for a specific block.
 * 
 * @deprecated Use `useTimerState(block)` from `useBlockMemory` instead.
 * This hook is maintained for backward compatibility only.
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
 * @deprecated Use `useTimerState(block)` or `useTimerDisplay(block)` instead.
 * This hook searches the runtime stack for a block with the given key and
 * returns its timer memory. Prefer direct block access when possible.
 * 
 * @param blockKey The block key to search for timer references
 * @returns Object containing timerState reference
 */
export function useTimerReferences(blockKey: string): TimerReferences {
  const runtime = useRuntimeContext();

  return useMemo(() => {
    // Find the block on the stack by key
    const block = runtime.stack.blocks.find(b => b.key.toString() === blockKey);
    
    if (!block) {
      return {
        timeSpans: undefined,
        isRunning: undefined,
        timerState: undefined
      };
    }

    // Access timer memory through the block's memory system
    const timerEntry = block.getMemory('timer');
    
    // The timerEntry conforms to IMemoryEntry, not TypedMemoryReference.
    // Wrap it for backward compatibility if it exists.
    const timerStateRef = timerEntry ? (timerEntry as unknown as TypedMemoryReference<RuntimeSpan>) : undefined;

    return {
      timeSpans: undefined,
      isRunning: undefined,
      timerState: timerStateRef
    };
  }, [runtime, blockKey]);
}
