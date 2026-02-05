import { useState, useEffect } from 'react';
import { useRuntimeContext } from '../context/RuntimeContext';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';

/**
 * Hook that subscribes to stack changes and returns the current blocks.
 * This hook provides reactive access to the runtime stack.
 *
 * @returns Readonly array of blocks currently on the stack
 *
 * @example
 * ```tsx
 * function StackDisplay() {
 *   const blocks = useStackBlocks();
 *
 *   return (
 *     <div>
 *       {blocks.map(block => (
 *         <div key={block.key.value}>{block.label}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useStackBlocks(): readonly IRuntimeBlock[] {
  const runtime = useRuntimeContext();
  const [blocks, setBlocks] = useState<readonly IRuntimeBlock[]>(runtime.stack.blocks);

  useEffect(() => {
    // Subscribe to stack changes
    const unsubscribe = runtime.stack.subscribe(() => {
      setBlocks([...runtime.stack.blocks]);
    });

    return unsubscribe;
  }, [runtime]);

  return blocks;
}

/**
 * Hook that returns the current (top) block on the stack.
 * Returns undefined if the stack is empty.
 *
 * @returns The top block on the stack, or undefined if empty
 *
 * @example
 * ```tsx
 * function CurrentBlockDisplay() {
 *   const currentBlock = useCurrentBlock();
 *
 *   if (!currentBlock) {
 *     return <div>No active block</div>;
 *   }
 *
 *   return <div>Current: {currentBlock.label}</div>;
 * }
 * ```
 */
export function useCurrentBlock(): IRuntimeBlock | undefined {
  const blocks = useStackBlocks();
  return blocks[blocks.length - 1];
}
