/**
 * Hook for parsing ALL WOD blocks in the editor
 * This is needed for inlay hints to work on non-active blocks
 */

import { useEffect, useRef } from 'react';
import { WodBlock } from '../types';
import { sharedParser } from '../../parser/parserInstance';
import { parseWodBlock } from '../utils/parseWodBlock';

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
        const result = parseWodBlock(block.content, parserRef.current);

        // Update block with parsed data
        updateBlock(block.id, {
          statements: result.statements,
          errors: result.errors,
          state: result.success ? 'parsed' : 'error'
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
