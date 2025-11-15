/**
 * Hook for managing the context overlay widget
 */

import { useEffect, useRef, useMemo } from 'react';
import { editor as monacoEditor } from 'monaco-editor';
import { WodBlock } from '../types';
import { ContextOverlay } from '../widgets/ContextOverlay';
import { useBlockEditor } from './useBlockEditor';

/**
 * Hook to manage context overlay for active block
 */
export function useContextOverlay(
  editor: monacoEditor.IStandaloneCodeEditor | null,
  activeBlock: WodBlock | null,
  enabled: boolean = true
) {
  const overlayRef = useRef<ContextOverlay | null>(null);

  // Block editor for making changes
  const { addStatement, editStatement, deleteStatement } = useBlockEditor({
    editor,
    block: activeBlock
  });

  // Use the already-parsed block data (from useParseAllBlocks)
  // No need to re-parse here, it's already done!
  const enrichedBlock = useMemo(() => {
    if (!activeBlock) return null;
    
    // Active block should already have statements/errors from useParseAllBlocks
    return activeBlock;
  }, [activeBlock]);

  // Memoize callbacks to prevent unnecessary effect re-runs
  const callbacks = useMemo(() => ({
    onAddStatement: addStatement,
    onEditStatement: editStatement,
    onDeleteStatement: deleteStatement
  }), [addStatement, editStatement, deleteStatement]);

  // Track the current block ID to prevent unnecessary recreation
  const currentBlockIdRef = useRef<string | null>(null);

  // Manage overlay lifecycle
  useEffect(() => {
    if (!editor || !enabled) {
      // Clean up existing overlay
      if (overlayRef.current) {
        console.log('[ContextOverlay] Removing overlay - editor or enabled false');
        editor?.removeOverlayWidget(overlayRef.current);
        overlayRef.current.dispose();
        overlayRef.current = null;
        currentBlockIdRef.current = null;
      }
      return;
    }

    if (enrichedBlock) {
      const blockId = enrichedBlock.id;
      
      // Only create new overlay if block ID changed
      if (overlayRef.current && currentBlockIdRef.current === blockId) {
        // Update existing overlay for same block
        console.log('[ContextOverlay] Updating existing overlay', blockId);
        overlayRef.current.update(enrichedBlock, callbacks);
        editor.layoutOverlayWidget(overlayRef.current);
      } else {
        // Clean up old overlay if exists
        if (overlayRef.current) {
          console.log('[ContextOverlay] Removing old overlay', currentBlockIdRef.current);
          editor.removeOverlayWidget(overlayRef.current);
          overlayRef.current.dispose();
        }
        
        // Create new overlay for different block
        console.log('[ContextOverlay] Creating new overlay', blockId);
        overlayRef.current = new ContextOverlay(editor, enrichedBlock, callbacks);
        editor.addOverlayWidget(overlayRef.current);
        currentBlockIdRef.current = blockId;
        
        // Move DOM node to body after Monaco adds it to its container
        // This ensures fixed positioning works properly
        const domNode = overlayRef.current.getDomNode();
        if (domNode.parentNode) {
          document.body.appendChild(domNode);
        }
        console.log('[ContextOverlay] Overlay added to editor and moved to body');
      }
    } else {
      // No active block, remove overlay
      if (overlayRef.current) {
        console.log('[ContextOverlay] Removing overlay - no active block');
        editor.removeOverlayWidget(overlayRef.current);
        overlayRef.current.dispose();
        overlayRef.current = null;
        currentBlockIdRef.current = null;
      }
    }
  }, [editor, enrichedBlock, enabled, callbacks]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (overlayRef.current && editor) {
        console.log('[ContextOverlay] Cleanup on unmount');
        editor.removeOverlayWidget(overlayRef.current);
        overlayRef.current.dispose();
        overlayRef.current = null;
        currentBlockIdRef.current = null;
      }
    };
  }, [editor]);

  return overlayRef.current;
}
