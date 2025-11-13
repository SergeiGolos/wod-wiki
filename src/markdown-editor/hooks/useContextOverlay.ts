/**
 * Hook for managing the context overlay widget
 */

import { useEffect, useRef, useMemo } from 'react';
import { editor as monacoEditor } from 'monaco-editor';
import { WodBlock } from '../types';
import { ContextOverlay } from '../widgets/ContextOverlay';
import { useBlockParser } from './useBlockParser';
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
  
  // Parse the active block
  const { statements, errors, status } = useBlockParser(activeBlock, {
    autoParse: true,
    debounceMs: 500
  });

  // Block editor for making changes
  const { addStatement, editStatement, deleteStatement } = useBlockEditor({
    editor,
    block: activeBlock
  });

  // Create enriched block with parsed data (immutable)
  const enrichedBlock = useMemo(() => {
    if (!activeBlock) return null;
    
    return {
      ...activeBlock,
      statements: statements.length > 0 ? statements : activeBlock.statements,
      errors: errors.length > 0 ? errors : activeBlock.errors,
      state: status === 'parsing' ? 'parsing' as const :
             status === 'error' ? 'error' as const :
             statements.length > 0 ? 'parsed' as const :
             activeBlock.state
    };
  }, [activeBlock, statements, errors, status]);

  // Manage overlay lifecycle
  useEffect(() => {
    if (!editor || !enabled) {
      // Clean up existing overlay
      if (overlayRef.current) {
        editor?.removeOverlayWidget(overlayRef.current);
        overlayRef.current.dispose();
        overlayRef.current = null;
      }
      return;
    }

    if (enrichedBlock) {
      // Editor callbacks
      const callbacks = {
        onAddStatement: addStatement,
        onEditStatement: editStatement,
        onDeleteStatement: deleteStatement
      };
      
      // Create or update overlay
      if (overlayRef.current) {
        // Update existing overlay
        overlayRef.current.update(enrichedBlock, callbacks);
        editor.layoutOverlayWidget(overlayRef.current);
      } else {
        // Create new overlay
        overlayRef.current = new ContextOverlay(editor, enrichedBlock, callbacks);
        editor.addOverlayWidget(overlayRef.current);
      }
    } else {
      // No active block, remove overlay
      if (overlayRef.current) {
        editor.removeOverlayWidget(overlayRef.current);
        overlayRef.current.dispose();
        overlayRef.current = null;
      }
    }

    return () => {
      // Cleanup on unmount
      if (overlayRef.current && editor) {
        editor.removeOverlayWidget(overlayRef.current);
        overlayRef.current.dispose();
        overlayRef.current = null;
      }
    };
  }, [editor, enrichedBlock, enabled, addStatement, editStatement, deleteStatement]);

  return overlayRef.current;
}
