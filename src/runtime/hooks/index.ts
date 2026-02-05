/**
 * Runtime Hooks
 *
 * React hooks for subscribing to runtime state and memory changes.
 *
 * ## Hook Categories
 *
 * ### Stack Hooks (New - Preferred for Stack Access)
 * These hooks provide reactive access to the runtime stack.
 * Use these for monitoring stack state changes and current block.
 *
 * - `useStackBlocks` - Subscribe to stack changes, returns all blocks
 * - `useCurrentBlock` - Get the current (top) block on the stack
 * - `useOutputStatements` - Subscribe to output statements for workout history
 *
 * ### Behavior-Based Hooks (Preferred for Memory Access)
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
 * // New: Subscribe to stack changes
 * function StackMonitor() {
 *   const blocks = useStackBlocks();
 *   const currentBlock = useCurrentBlock();
 *   return <div>Stack has {blocks.length} blocks</div>;
 * }
 *
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

// Stack hooks (new - preferred for stack access)
export { useStackBlocks, useCurrentBlock } from './useStackBlocks';
export { useOutputStatements } from './useOutputStatements';

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

// Display stack integration hooks
// Use these when you only have a blockKey string from the display system.
// When you have direct IRuntimeBlock access, prefer the behavior-based hooks above.
export { useTimerReferences } from './useTimerReferences';
export { useTimerElapsed, type UseTimerElapsedResult } from './useTimerElapsed';
