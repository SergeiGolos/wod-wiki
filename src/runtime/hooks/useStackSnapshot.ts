import { useState, useEffect } from 'react';
import { useScriptRuntime } from '../context/RuntimeContext';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { StackSnapshot } from '../contracts/IRuntimeStack';

/**
 * Hook that subscribes to stack snapshots via `runtime.subscribeToStack()`.
 *
 * Returns the latest StackSnapshot, which contains:
 * - `blocks` — current stack (bottom-to-top)
 * - `affectedBlock` — the block that was pushed/popped
 * - `depth` — stack depth after the event
 * - `clockTime` — runtime clock time at event
 * - `type` — 'push' | 'pop' | 'clear' | 'initial'
 *
 * This is the primary hook for UI components that need to react to stack
 * structural changes. For high-frequency timer updates, subscribe to
 * block memory separately.
 *
 * @returns The latest StackSnapshot
 *
 * @example
 * ```tsx
 * function StackDisplay() {
 *   const snapshot = useStackSnapshot();
 *
 *   return (
 *     <div>
 *       <p>Depth: {snapshot.depth}</p>
 *       {snapshot.blocks.map(block => (
 *         <div key={block.key.toString()}>{block.label}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useStackSnapshot(): StackSnapshot {
  const runtime = useScriptRuntime();
  const [snapshot, setSnapshot] = useState<StackSnapshot>({
    type: 'initial',
    blocks: runtime.stack.blocks,
    depth: runtime.stack.count,
    clockTime: runtime.clock.now,
  });

  useEffect(() => {
    const unsubscribe = runtime.subscribeToStack((s) => {
      setSnapshot(s);
    });

    return unsubscribe;
  }, [runtime]);

  return snapshot;
}

/**
 * Hook that returns the current stack blocks from the most recent snapshot.
 * Convenience wrapper over useStackSnapshot().
 *
 * @returns Readonly array of blocks currently on the stack
 */
export function useSnapshotBlocks(): readonly IRuntimeBlock[] {
  const snapshot = useStackSnapshot();
  return snapshot.blocks;
}

/**
 * Hook that returns the current (top) block on the stack from the snapshot.
 * Returns undefined if the stack is empty.
 *
 * @returns The top block on the stack, or undefined if empty
 */
export function useSnapshotCurrentBlock(): IRuntimeBlock | undefined {
  const snapshot = useStackSnapshot();
  return snapshot.blocks.length > 0
    ? snapshot.blocks[snapshot.blocks.length - 1]
    : undefined;
}
