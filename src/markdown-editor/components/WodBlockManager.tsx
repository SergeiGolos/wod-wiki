/**
 * WodBlockManager - Manages WOD blocks, parsing, and visual decorations
 */

import React, { useEffect, useRef } from 'react';
import { editor as monacoEditor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';
import { WodBlock } from '../types';

export interface WodBlockManagerProps {
  /** Monaco editor instance */
  editor: monacoEditor.IStandaloneCodeEditor | null;
  
  /** Monaco instance */
  monaco: Monaco | null;
  
  /** Detected WOD blocks */
  blocks: WodBlock[];
  
  /** Currently active block */
  activeBlock: WodBlock | null;
  
  /** Callback when blocks are parsed */
  onBlocksParsed?: (blocks: WodBlock[]) => void;
}

/**
 * Component that manages WOD block parsing and visual decorations
 */
export const WodBlockManager: React.FC<WodBlockManagerProps> = ({
  editor,
  monaco,
  blocks,
  activeBlock,
  onBlocksParsed: _onBlocksParsed
}) => {
  const decorationsRef = useRef<monacoEditor.IEditorDecorationsCollection | null>(null);

  // Update decorations when blocks or active block changes
  useEffect(() => {
    if (!editor || !monaco) return;

    // Clear existing decorations
    if (decorationsRef.current) {
      decorationsRef.current.clear();
    }

    const decorations: monacoEditor.IModelDeltaDecoration[] = [];

    // Add decorations for each block
    blocks.forEach(block => {
      const isActive = activeBlock?.id === block.id;
      
      // Block boundary decoration
      decorations.push({
        range: new monaco.Range(
          block.startLine + 1, // Monaco is 1-indexed
          1,
          block.endLine + 1,
          1
        ),
        options: {
          isWholeLine: true,
          className: isActive ? 'wod-block-active' : 'wod-block',
          glyphMarginClassName: isActive ? 'wod-block-glyph-active' : 'wod-block-glyph'
        }
      });

      // Add gutter icon for block start
      decorations.push({
        range: new monaco.Range(
          block.startLine + 1,
          1,
          block.startLine + 1,
          1
        ),
        options: {
          glyphMarginClassName: 'wod-block-start-icon'
        }
      });
    });

    // Create decorations collection
    decorationsRef.current = editor.createDecorationsCollection(decorations);

    return () => {
      if (decorationsRef.current) {
        decorationsRef.current.clear();
      }
    };
  }, [editor, monaco, blocks, activeBlock]);

  return null; // This is a manager component with no visual output
};
