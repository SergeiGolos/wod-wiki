/**
 * Runtime Hooks
 *
 * React hooks for subscribing to runtime state and memory changes.
 *
 * ## Hook Categories
 *
 * ### Stack-Driven Display Hooks (Preferred)
 * These hooks subscribe to stack events and read block memory directly.
 * No global memory store — blocks own their state, stack events drive UI updates.
 *
 * - `useStackSnapshot` - Subscribe to StackSnapshot (push/pop/clear/initial)
 * - `useSnapshotBlocks` - Current blocks from latest snapshot
 * - `useSnapshotCurrentBlock` - Top block from latest snapshot
 * - `useOutputStatements` - Subscribe to output statements for workout history
 * - `useStackTimers` - All timers on the stack with their block context
 * - `usePrimaryTimer` - The timer pinned to the main display (lowest pinned, or leaf)
 * - `useSecondaryTimers` - All non-primary timers for context display
 * - `useActiveControls` - Aggregated buttons from all stack blocks
 * - `useStackDisplayItems` - Stack blocks as IDisplayItem[] for the fragment visualizer
 *
 * ### Behavior-Based Hooks (For Single Block Access)
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
 * Low-level hook for subscribing to typed memory references.
 *
 * - `useMemorySubscription` - Subscribe to any TypedMemoryReference
 *
 * @example
 * ```tsx
 * // Stack-driven display (preferred for Clock UI)
 * function WorkoutClock() {
 *   const primary = usePrimaryTimer();
 *   const secondary = useSecondaryTimers();
 *   const controls = useActiveControls();
 *   const items = useStackDisplayItems();
 *
 *   return (
 *     <div>
 *       <BigTimer timer={primary} />
 *       {secondary.map(t => <SmallTimer key={t.block.key.toString()} timer={t} />)}
 *       {controls.map(btn => <Button key={btn.id} config={btn} />)}
 *       {items?.map(item => <StackRow key={item.id} item={item} />)}
 *     </div>
 *   );
 * }
 *
 * // Single block access (preferred when you have a block reference)
 * function BlockTimer({ block }: { block: IRuntimeBlock }) {
 *   const display = useTimerDisplay(block);
 *   return <div>{display?.formatted}</div>;
 * }
 * ```
 */

// Stack hooks (preferred for stack access)
export { useStackSnapshot, useSnapshotBlocks, useSnapshotCurrentBlock } from './useStackSnapshot';
export { useOutputStatements } from './useOutputStatements';

// Stack-driven display hooks (preferred for Clock UI)
export {
    useStackTimers,
    usePrimaryTimer,
    useSecondaryTimers,
    useActiveControls,
    useStackDisplayItems,
    type StackTimerEntry
} from './useStackDisplay';

// Core memory subscription hook (stable API)
export { useMemorySubscription } from './useMemorySubscription';

// Behavior-based memory hooks (for single block access)
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
