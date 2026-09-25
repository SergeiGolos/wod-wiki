import type { FenceDialect, ScriptBlock } from '../types/section';
import { VALID_FENCE_DIALECTS } from '../types/section';

/**
 * Try to match a line against known workout fence patterns.
 * Returns the base tag and optional :sport suffix, or null otherwise.
 */
export function matchDialectFence(trimmedLine: string): { dialect: FenceDialect; sport?: string } | null {
  if (!trimmedLine.startsWith('```')) return null;
  const tag = trimmedLine.slice(3).split(/[\s\t]/)[0].toLowerCase();
  const [base, sport] = tag.split(':', 2);
  if ((VALID_FENCE_DIALECTS as readonly string[]).includes(base)) {
    return { dialect: base as FenceDialect, sport: sport || undefined };
  }
  return null;
}

/**
 * Detects all WOD blocks in markdown content.
 * Recognises ```time and ```log as valid workout fences (optional :sport suffix).
 *
 * @param content - Markdown content to parse
 * @returns Array of detected WOD blocks (with dialect set)
 */
export function detectScriptBlocks(content: string): ScriptBlock[] {
  const lines = content.split('\n');
  const blocks: ScriptBlock[] = [];
  let inBlock = false;
  let currentBlock: Partial<ScriptBlock> = {};
  let blockContent: string[] = [];

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (!inBlock) {
      const fence = matchDialectFence(trimmedLine);
      if (fence) {
        inBlock = true;
        const now = Date.now();
        currentBlock = {
          id: `${fence.dialect}-block-${now}-${Math.random().toString(36).slice(2, 9)}`,
          dialect: fence.dialect,
          sport: fence.sport,
          startLine: index,
          state: 'idle',
          version: 1,
          createdAt: now,
        };
        blockContent = [];
        return;
      }
    }

    if (inBlock && trimmedLine.startsWith('```')) {
      inBlock = false;
      currentBlock.endLine = index;
      currentBlock.content = blockContent.join('\n');
      blocks.push(currentBlock as ScriptBlock);
      currentBlock = {};
      blockContent = [];
    } else if (inBlock) {
      blockContent.push(line);
    }
  });

  if (inBlock && currentBlock.startLine !== undefined) {
    currentBlock.endLine = lines.length - 1;
    currentBlock.content = blockContent.join('\n');
    blocks.push(currentBlock as ScriptBlock);
  }

  return blocks;
}

/**
 * Find which block contains a given line number.
 *
 * @param blocks - Array of WOD blocks
 * @param lineNumber - Line number to search for (0-indexed)
 * @returns The block containing the line, or null if not found
 */
export function findBlockAtLine(
  blocks: ScriptBlock[],
  lineNumber: number
): ScriptBlock | null {
  return (
    blocks.find(
      (block) => lineNumber >= block.startLine && lineNumber <= block.endLine
    ) ?? null
  );
}

/**
 * Extract WOD block content from markdown (without backticks).
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
  return lines.slice(startLine + 1, endLine).join('\n');
}
