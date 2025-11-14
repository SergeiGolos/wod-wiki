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
    autoParse = true,
    parseDelayMs = 500
  } = options;

  const [blocks, setBlocks] = useState<WodBlock[]>([]);
  const [activeBlock, setActiveBlock] = useState<WodBlock | null>(null);
  const [detecting, setDetecting] = useState(false);
  
  const detectionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const parseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect blocks from content
  const detectBlocks = useCallback(() => {
    setDetecting(true);
    
    try {
      const detected = detectWodBlocks(content);
      
      // Preserve state from existing blocks where possible
      const updatedBlocks = detected.map(newBlock => {
        const existingBlock = blocks.find(b => 
          b.startLine === newBlock.startLine && 
          b.content === newBlock.content
        );
        
        if (existingBlock) {
          // Keep existing block state
          return {
            ...newBlock,
            id: existingBlock.id,
            state: existingBlock.state,
            parser: existingBlock.parser,
            statements: existingBlock.statements,
            errors: existingBlock.errors,
            runtime: existingBlock.runtime,
            results: existingBlock.results
          };
        }
        
        return newBlock;
      });
      
      setBlocks(updatedBlocks);
    } finally {
      setDetecting(false);
    }
  }, [content, blocks]);

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
        setActiveBlock(null);
        return;
      }

      // Convert to 0-indexed
      const lineNumber = position.lineNumber - 1;
      const block = findBlockAtLine(blocks, lineNumber);
      setActiveBlock(block);
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
