/**
 * Runtime Hooks
 * 
 * React hooks for subscribing to runtime state and memory changes.
 */

// Legacy hooks (for backward compatibility)
export { useMemorySubscription } from './useMemorySubscription';
export { useTimerReferences } from './useTimerReferences';
export { useTimerElapsed, type UseTimerElapsedResult } from './useTimerElapsed';

// New behavior-based memory hooks
export {
    useBlockMemory,
    useTimerState,
    useRoundState,
    useDisplayState,
    useTimerDisplay,
    useRoundDisplay,
    type TimerDisplayValues,
    type RoundDisplayValues
} from './useBlockMemory';
