/**
 * Runtime Hooks
 * 
 * React hooks for subscribing to runtime state and memory changes.
 * 
 * ## Hook Categories
 * 
 * ### Behavior-Based Hooks (Preferred)
 * These hooks work directly with `IRuntimeBlock` objects and access memory
 * through the behavior-based memory system. Use these when you have direct
 * access to a block reference.
 * 
 * - `useBlockMemory<T>` - Generic hook for any memory type
 * - `useTimerState` - Get timer state from a block
 * - `useRoundState` - Get round state from a block
 * - `useDisplayState` - Get display state from a block
 * - `useTimerDisplay` - Formatted timer display with 60fps animation
 * - `useRoundDisplay` - Formatted round display values
 * 
 * ### Memory Reference Hooks
 * Low-level hook for subscribing to typed memory references. Still useful
 * when working with memory references directly.
 * 
 * - `useMemorySubscription` - Subscribe to any TypedMemoryReference
 * 
 * ### Legacy Hooks (Use Behavior-Based Hooks When Possible)
 * These hooks work with string `blockKey` and search runtime memory.
 * They are maintained for backward compatibility with components that
 * receive block keys from the display stack system.
 * 
 * - `useTimerReferences` - Get timer memory references by block key
 * - `useTimerElapsed` - Calculate elapsed time by block key
 * 
 * @example
 * ```tsx
 * // Preferred: When you have an IRuntimeBlock reference
 * function BlockTimer({ block }: { block: IRuntimeBlock }) {
 *   const display = useTimerDisplay(block);
 *   return <div>{display?.formatted}</div>;
 * }
 * 
 * // Legacy: When you only have a blockKey string
 * function KeyBasedTimer({ blockKey }: { blockKey: string }) {
 *   const { elapsed } = useTimerElapsed(blockKey);
 *   return <div>{formatMs(elapsed)}</div>;
 * }
 * ```
 */

// Core memory subscription hook (stable API)
export { useMemorySubscription } from './useMemorySubscription';

// Behavior-based memory hooks (preferred)
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

// Legacy hooks (maintained for display stack integration)
// @deprecated - Prefer useTimerState/useTimerDisplay when you have an IRuntimeBlock
export { useTimerReferences } from './useTimerReferences';
// @deprecated - Prefer useTimerDisplay when you have an IRuntimeBlock
export { useTimerElapsed, type UseTimerElapsedResult } from './useTimerElapsed';
