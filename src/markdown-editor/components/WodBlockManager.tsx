/**
 * WodBlockManager - Manages WOD blocks, parsing, and visual decorations
 */

import React, { useEffect, useRef } from 'react';
import { editor as monacoEditor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';
import { WodBlock } from '../types';
import { WodBlockHeaderWidget } from '../widgets/WodBlockHeaderWidget';

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
  onBlocksParsed
}) => {
  const decorationsRef = useRef<monacoEditor.IEditorDecorationsCollection | null>(null);
  const headerWidgetsRef = useRef<Map<string, WodBlockHeaderWidget>>(new Map());

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
      
      // Hide the opening ``` line when not active
      if (!isActive) {
        decorations.push({
          range: new monaco.Range(
            block.startLine + 1,
            1,
            block.startLine + 1,
            1
          ),
          options: {
            isWholeLine: true,
            className: 'wod-block-backtick-hidden'
          }
        });
      }
      
      // Hide the closing ``` line when not active
      if (!isActive && block.endLine !== undefined) {
        decorations.push({
          range: new monaco.Range(
            block.endLine + 1,
            1,
            block.endLine + 1,
            1
          ),
          options: {
            isWholeLine: true,
            className: 'wod-block-backtick-hidden'
          }
        });
      }
    });

    // Create decorations collection
    decorationsRef.current = editor.createDecorationsCollection(decorations);

    return () => {
      if (decorationsRef.current) {
        decorationsRef.current.clear();
      }
    };
  }, [editor, monaco, blocks, activeBlock]);

  // Manage header widgets
  useEffect(() => {
    if (!editor || !monaco) return;

    const currentWidgets = headerWidgetsRef.current;
    const newBlockIds = new Set(blocks.map(b => b.id));
    
    // Remove widgets for blocks that no longer exist
    currentWidgets.forEach((widget, blockId) => {
      if (!newBlockIds.has(blockId)) {
        editor.removeContentWidget(widget);
        widget.dispose();
        currentWidgets.delete(blockId);
      }
    });

    // Add or update widgets for current blocks
    blocks.forEach((block, index) => {
      const isActive = activeBlock?.id === block.id;
      const existingWidget = currentWidgets.get(block.id);
      
      if (existingWidget) {
        // Update existing widget
        existingWidget.update(block, index + 1, isActive, {
          onRecord: () => console.log('Record clicked for block', block.id),
          onTrack: () => console.log('Track clicked for block', block.id)
        });
        editor.layoutContentWidget(existingWidget);
      } else {
        // Create new widget
        const widget = new WodBlockHeaderWidget(
          editor,
          block,
          index + 1,
          isActive,
          {
            onRecord: () => console.log('Record clicked for block', block.id),
            onTrack: () => console.log('Track clicked for block', block.id)
          }
        );
        editor.addContentWidget(widget);
        currentWidgets.set(block.id, widget);
      }
    });

    return () => {
      // Cleanup on unmount
      currentWidgets.forEach(widget => {
        editor.removeContentWidget(widget);
        widget.dispose();
      });
      currentWidgets.clear();
    };
  }, [editor, monaco, blocks, activeBlock]);

  return null; // This is a manager component with no visual output
};
