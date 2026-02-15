/**
 * Hook for detecting and managing WOD blocks in markdown content
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { editor as monacoEditor } from 'monaco-editor';
import { WodBlock } from '../types';
import { detectWodBlocks, findBlockAtLine } from '../utils/blockDetection';

export interface UseWodBlocksOptions {
  /** Debounce delay for detection (default: 300ms) */
  debounceMs?: number;

  /** Whether to auto-parse blocks */
  autoParse?: boolean;

  /** Parse delay after detection (default: 500ms) */
  parseDelayMs?: number;
}

export interface UseWodBlocksResult {
  /** All detected blocks */
  blocks: WodBlock[];

  /** Currently active block (based on cursor) */
  activeBlock: WodBlock | null;

  /** Get block by ID */
  getBlock: (id: string) => WodBlock | undefined;

  /** Update block content */
  updateBlock: (id: string, updates: Partial<WodBlock>) => void;

  /** Trigger re-detection */
  redetect: () => void;

  /** Whether detection is in progress */
  detecting: boolean;
}

/**
 * Hook for managing WOD blocks detection and state
 */
export function useWodBlocks(
  editor: monacoEditor.IStandaloneCodeEditor | null,
  content: string,
  options: UseWodBlocksOptions = {}
): UseWodBlocksResult {
  const {
    debounceMs = 300,
    autoParse: _autoParse = true,
    parseDelayMs: _parseDelayMs = 500
  } = options;

  const [blocks, setBlocks] = useState<WodBlock[]>([]);
  const [activeBlock, setActiveBlock] = useState<WodBlock | null>(null);
  const [detecting, setDetecting] = useState(false);

  const detectionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect blocks from content
  const detectBlocks = useCallback(() => {
    setDetecting(true);

    try {
      const detected = detectWodBlocks(content);

      setBlocks(prevBlocks => {
        // Preserve state from existing blocks where possible
        const updatedBlocks = detected.map(newBlock => {
          // 1. Try exact match (content + position) - Highest confidence
          let existingBlock = prevBlocks.find(b =>
            b.startLine === newBlock.startLine &&
            b.content === newBlock.content
          );

          // 2. Try content match (same content, different position) - Block moved
          if (!existingBlock) {
            existingBlock = prevBlocks.find(b =>
              b.content === newBlock.content
            );
          }

          // 3. Try position match (same start line, different content) - Block edited in place
          // We only do this if we haven't found a better match yet.
          if (!existingBlock) {
            existingBlock = prevBlocks.find(b =>
              b.startLine === newBlock.startLine
            );
          }

          if (existingBlock) {
            const contentChanged = existingBlock.content !== newBlock.content;

            // Keep existing block ID for stable keys
            return {
              ...newBlock,
              id: existingBlock.id,
              // Only keep parsed/runtime state if content IS IDENTICAL
              state: contentChanged ? 'idle' : existingBlock.state,
              parser: contentChanged ? undefined : existingBlock.parser,
              statements: contentChanged ? [] : existingBlock.statements,
              errors: contentChanged ? [] : existingBlock.errors,
              runtime: contentChanged ? undefined : existingBlock.runtime,
              results: contentChanged ? undefined : existingBlock.results,
              // Keep other metadata
              createdAt: existingBlock.createdAt,
              version: contentChanged ? (existingBlock.version || 1) + 1 : existingBlock.version
            };
          }

          return newBlock;
        });

        // Check if blocks actually changed to avoid unnecessary re-renders
        if (prevBlocks.length === updatedBlocks.length) {
          const isSame = prevBlocks.every((b, i) => {
            const ub = updatedBlocks[i];
            return b.id === ub.id &&
              b.content === ub.content &&
              b.startLine === ub.startLine &&
              b.endLine === ub.endLine;
          });

          if (isSame) {
            return prevBlocks;
          }
        }

        return updatedBlocks;
      });
    } finally {
      setDetecting(false);
    }
  }, [content]);

  // Debounced detection on content change
  useEffect(() => {
    // Clear existing timer
    if (detectionTimerRef.current) {
      clearTimeout(detectionTimerRef.current);
    }

    // Schedule detection
    detectionTimerRef.current = setTimeout(detectBlocks, debounceMs);

    return () => {
      if (detectionTimerRef.current) {
        clearTimeout(detectionTimerRef.current);
      }
    };
  }, [content, debounceMs, detectBlocks]);

  // Track active block based on cursor position
  useEffect(() => {
    if (!editor) return;

    const updateActiveBlock = () => {
      const position = editor.getPosition();
      if (!position) {
        setActiveBlock(prev => prev ? null : prev);
        return;
      }

      // Convert to 0-indexed
      const lineNumber = position.lineNumber - 1;
      const block = findBlockAtLine(blocks, lineNumber);
      const newBlock = block || null;

      setActiveBlock(prev => {
        // If reference is same, no update needed
        if (prev === newBlock) return prev;

        // If ID is same (and content presumably same if blocks didn't change), 
        // but object reference is different (e.g. blocks regenerated),
        // we SHOULD update to the new block object to get latest state.
        // However, if blocks didn't change (due to our optimization above),
        // then block === prev should catch it.

        return newBlock;
      });
    };

    // Initial check
    updateActiveBlock();

    // Listen for cursor changes
    const disposable = editor.onDidChangeCursorPosition(updateActiveBlock);

    return () => disposable.dispose();
  }, [editor, blocks]);

  // Get block by ID
  const getBlock = useCallback((id: string): WodBlock | undefined => {
    return blocks.find(b => b.id === id);
  }, [blocks]);

  // Update block
  const updateBlock = useCallback((id: string, updates: Partial<WodBlock>) => {
    setBlocks(prevBlocks =>
      prevBlocks.map(block =>
        block.id === id ? { ...block, ...updates } : block
      )
    );
  }, []);

  // Manual re-detection
  const redetect = useCallback(() => {
    detectBlocks();
  }, [detectBlocks]);

  return {
    blocks,
    activeBlock,
    getBlock,
    updateBlock,
    redetect,
    detecting
  };
}
