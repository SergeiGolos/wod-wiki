/**
 * Hook for parsing ALL WOD blocks in the editor
 * This is needed for inlay hints to work on non-active blocks
 */

import { useEffect, useRef } from 'react';
import { WodBlock } from '../types';
import { sharedParser } from '../../parser/parserInstance';

/**
 * Parse all blocks and update their statements in place
 */
export function useParseAllBlocks(
  blocks: WodBlock[],
  updateBlock: (id: string, updates: Partial<WodBlock>) => void
) {
  const parserRef = useRef(sharedParser);
  const parsedBlocksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Parse each block that hasn't been parsed yet or has changed
    blocks.forEach(block => {
      // Skip if already parsed (not idle anymore and in parsed set)
      if (block.state !== 'idle' && parsedBlocksRef.current.has(block.id)) {
        return;
      }

      // Skip empty blocks
      if (!block.content || block.content.trim().length === 0) {
        return;
      }

      try {
        const script = parserRef.current.read(block.content);
        const statements = script.statements || [];
        const errors = (script.errors || []).map((err: any) => ({
          line: err.token?.startLine,
          column: err.token?.startColumn,
          message: err.message || 'Parse error',
          severity: 'error' as const
        }));

        // Update block with parsed data
        updateBlock(block.id, {
          statements,
          errors,
          state: errors.length > 0 ? 'error' : 'parsed'
        });

        parsedBlocksRef.current.add(block.id);
      } catch (error: any) {
        console.error(`[useParseAllBlocks] Error parsing block ${block.id}:`, error);
        updateBlock(block.id, {
          errors: [{
            message: error?.message || 'Unknown parse error',
            severity: 'error'
          }],
          state: 'error'
        });
      }
    });

    // Clean up parsed blocks that no longer exist
    const currentBlockIds = new Set(blocks.map(b => b.id));
    parsedBlocksRef.current.forEach(id => {
      if (!currentBlockIds.has(id)) {
        parsedBlocksRef.current.delete(id);
      }
    });
  }, [blocks, updateBlock]);
}
