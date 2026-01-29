import { useMemo } from 'react';
import { useRuntimeContext } from '../../runtime/context/RuntimeContext';
import { useMemorySubscription } from '../../runtime/hooks/useMemorySubscription';
import { MemoryTypeEnum } from '../../runtime/models/MemoryTypeEnum';
import { TypedMemoryReference } from '../../runtime/contracts/IMemoryReference';
import { 
  IDisplayStackState, 
  ITimerDisplayEntry, 
  IDisplayCardEntry,
  createDefaultDisplayState 
} from '../types/DisplayTypes';

/**
 * Hook to subscribe to the complete display stack state.
 * 
 * Returns the entire display state including timer stack, card stack,
 * and workout state. Use this when you need access to everything.
 * 
 * @returns The current display stack state
 * 
 * @example
 * ```tsx
 * function ClockUI() {
 *   const displayState = useDisplayStack();
 *   const currentTimer = displayState.timerStack[displayState.timerStack.length - 1];
 *   const currentCard = displayState.cardStack[displayState.cardStack.length - 1];
 *   
 *   return (
 *     <div>
 *       <Timer entry={currentTimer} />
 *       <Card entry={currentCard} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useDisplayStack(): IDisplayStackState {
  const runtime = useRuntimeContext();

  // Find the display stack state reference
  const stateRef = useMemo(() => {
    const refs = runtime.memory.search({
      id: null,
      ownerId: 'runtime',
      type: MemoryTypeEnum.DISPLAY_STACK_STATE,
      visibility: null
    });
    return refs[0] as TypedMemoryReference<IDisplayStackState> | undefined;
  }, [runtime]);

  // Subscribe to changes
  const state = useMemorySubscription(stateRef);

  return state || createDefaultDisplayState();
}

/**
 * Hook to get the current (top) timer display entry.
 * 
 * Returns the most recently pushed timer from the stack,
 * which represents what should currently be displayed.
 * 
 * @returns The current timer entry or undefined if stack is empty
 */
export function useCurrentTimer(): ITimerDisplayEntry | undefined {
  const displayState = useDisplayStack();
  
  return useMemo(() => {
    if (displayState.timerStack.length === 0) {
      return undefined;
    }
    // Return the last (top) entry in the stack
    return displayState.timerStack[displayState.timerStack.length - 1];
  }, [displayState.timerStack]);
}

/**
 * Hook to get the current (top) card display entry.
 * 
 * Returns the most recently pushed card from the stack,
 * which represents what should currently be displayed.
 * 
 * @returns The current card entry or undefined if stack is empty
 */
export function useCurrentCard(): IDisplayCardEntry | undefined {
  const displayState = useDisplayStack();
  
  return useMemo(() => {
    if (displayState.cardStack.length === 0) {
      return undefined;
    }
    // Return the last (top) entry in the stack
    return displayState.cardStack[displayState.cardStack.length - 1];
  }, [displayState.cardStack]);
}

/**
 * Hook to get the current workout state.
 * 
 * @returns The current workout state
 */
export function useWorkoutState(): 'idle' | 'running' | 'paused' | 'complete' | 'error' {
  const displayState = useDisplayStack();
  return displayState.workoutState;
}

/**
 * Hook to get round information.
 * 
 * @returns Object with currentRound and totalRounds
 */
export function useRoundsInfo(): { currentRound?: number; totalRounds?: number } {
  const displayState = useDisplayStack();
  
  return useMemo(() => ({
    currentRound: displayState.currentRound,
    totalRounds: displayState.totalRounds
  }), [displayState.currentRound, displayState.totalRounds]);
}

/**
 * Hook to check if the timer stack is empty.
 * 
 * Useful for determining whether to show an idle state.
 * 
 * @returns True if timer stack is empty
 */
export function useIsTimerStackEmpty(): boolean {
  const displayState = useDisplayStack();
  return displayState.timerStack.length === 0;
}

/**
 * Hook to get the entire timer stack (for debugging or advanced UIs).
 * 
 * @returns Array of all timer entries in the stack
 */
export function useTimerStack(): ITimerDisplayEntry[] {
  const displayState = useDisplayStack();
  return displayState.timerStack;
}

/**
 * Hook to get the entire card stack (for debugging or advanced UIs).
 * 
 * @returns Array of all card entries in the stack
 */
export function useCardStack(): IDisplayCardEntry[] {
  const displayState = useDisplayStack();
  return displayState.cardStack;
}
