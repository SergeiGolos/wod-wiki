/**
 * Hook for managing the context overlay widget
 */

import { useEffect, useRef } from 'react';
import { editor as monacoEditor } from 'monaco-editor';
import { WodBlock } from '../types';
import { ContextOverlay } from '../widgets/ContextOverlay';
import { useBlockParser } from './useBlockParser';

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

  // Update active block with parsed data
  useEffect(() => {
    if (activeBlock && statements.length > 0) {
      activeBlock.statements = statements;
      activeBlock.errors = errors;
      activeBlock.state = status === 'error' ? 'error' : 'parsed';
    }
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

    if (activeBlock) {
      // Create or update overlay
      if (overlayRef.current) {
        // Update existing overlay
        overlayRef.current.update(activeBlock);
        editor.layoutOverlayWidget(overlayRef.current);
      } else {
        // Create new overlay
        overlayRef.current = new ContextOverlay(editor, activeBlock);
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
  }, [editor, activeBlock, enabled]);

  return overlayRef.current;
}
