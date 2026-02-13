/**
 * Utility functions for detecting and managing WOD blocks in markdown content
 */

import { WodBlock } from '../types';

/**
 * Detects all WOD blocks in markdown content
 * 
 * @param content - Markdown content to parse
 * @returns Array of detected WOD blocks
 */
export function detectWodBlocks(content: string): WodBlock[] {
  const lines = content.split('\n');
  const blocks: WodBlock[] = [];
  let inBlock = false;
  let currentBlock: Partial<WodBlock> = {};
  let blockContent: string[] = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    const normalizedLine = trimmedLine.toLowerCase();

    if (!inBlock && normalizedLine.startsWith('```wod')) {
      // Start of WOD block
      inBlock = true;
      const now = Date.now();
      currentBlock = {
        id: `wod-block-${now}-${Math.random().toString(36).substr(2, 9)}`,
        startLine: index,
        state: 'idle',
        widgetIds: {},
        version: 1,
        createdAt: now
      };
      blockContent = [];
    } else if (inBlock && trimmedLine.startsWith('```')) {
      // End of WOD block
      inBlock = false;
      currentBlock.endLine = index;
      currentBlock.content = blockContent.join('\n');
      blocks.push(currentBlock as WodBlock);
      currentBlock = {};
      blockContent = [];
    } else if (inBlock) {
      // Content inside WOD block
      blockContent.push(line);
    }
  });

  // Handle unclosed block (treat as malformed but still track it)
  if (inBlock && currentBlock.startLine !== undefined) {
    currentBlock.endLine = lines.length - 1;
    currentBlock.content = blockContent.join('\n');
    blocks.push(currentBlock as WodBlock);
  }

  return blocks;
}

/**
 * Find which block contains a given line number
 * 
 * @param blocks - Array of WOD blocks
 * @param lineNumber - Line number to search for (0-indexed)
 * @returns The block containing the line, or null if not found
 */
export function findBlockAtLine(
  blocks: WodBlock[],
  lineNumber: number
): WodBlock | null {
  return blocks.find(block =>
    lineNumber >= block.startLine && lineNumber <= block.endLine
  ) || null;
}

/**
 * Extract WOD block content from markdown (without backticks)
 * 
 * @param content - Full markdown content
 * @param startLine - Start line of block (0-indexed)
 * @param endLine - End line of block (0-indexed)
 * @returns Extracted block content
 */
export function extractBlockContent(
  content: string,
  startLine: number,
  endLine: number
): string {
  const lines = content.split('\n');
  // Skip first line (```wod) and last line (```)
  return lines.slice(startLine + 1, endLine).join('\n');
}
