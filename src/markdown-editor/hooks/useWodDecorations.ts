/**
 * Hook for managing WOD block Monaco decorations (inlay hints & semantic tokens)
 */

import { useEffect, useRef, useState } from 'react';
import { editor as monacoEditor, IDisposable } from 'monaco-editor';
import { Monaco } from '@monaco-editor/react';
import { WodBlock } from '../types';
import { createWodInlayHintsProvider } from '../utils/wodInlayHintsProvider';
import { createWodSemanticTokensProvider } from '../utils/wodSemanticTokensProvider';

export interface UseWodDecorationsOptions {
  /** Whether decorations are enabled */
  enabled?: boolean;
  
  /** Language ID for Monaco (default: 'markdown') */
  languageId?: string;
}

/**
 * Hook to register Monaco decorations for WOD blocks
 * Provides inlay hints (emojis) and semantic token highlighting
 */
export function useWodDecorations(
  editor: monacoEditor.IStandaloneCodeEditor | null,
  monaco: Monaco | null,
  blocks: WodBlock[],
  activeBlock: WodBlock | null,
  options: UseWodDecorationsOptions = {}
) {
  const {
    enabled = true,
    languageId = 'markdown'
  } = options;

  const disposablesRef = useRef<IDisposable[]>([]);
  const blocksRef = useRef<WodBlock[]>([]);
  const activeBlockIdRef = useRef<string | null>(null);
  const cursorLineRef = useRef<number | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Update refs
  blocksRef.current = blocks;
  activeBlockIdRef.current = activeBlock?.id || null;

  // Track cursor position - this should trigger immediately
  useEffect(() => {
    if (!editor || !enabled) return;

    const updateCursorLine = () => {
      const position = editor.getPosition();
      const newLine = position?.lineNumber || null;
      
      // Always update cursor line
      const oldLine = cursorLineRef.current;
      cursorLineRef.current = newLine;
      
      // Immediately refresh hints on any cursor movement
      if (oldLine !== newLine) {
        // Synchronous refresh - don't wait for state update
        const action = editor.getAction('editor.action.inlayHints.refresh');
        if (action) {
          action.run();
        }
        
        // Also trigger state update for other dependencies
        setRefreshCounter(prev => prev + 1);
      }
    };

    // Initial position
    updateCursorLine();

    // Listen for cursor changes - immediate refresh
    const disposable = editor.onDidChangeCursorPosition(() => {
      updateCursorLine();
    });

    return () => disposable.dispose();
  }, [editor, enabled]);

  // Additional refresh for blocks changes
  useEffect(() => {
    if (!editor || !enabled) return;
    
    // Trigger Monaco's inlay hints refresh
    const action = editor.getAction('editor.action.inlayHints.refresh');
    if (action) {
      action.run();
    }
  }, [editor, enabled, refreshCounter, blocks.length, activeBlock?.id]);

  // Register providers
  useEffect(() => {
    if (!editor || !monaco || !enabled) return;

    console.log('[useWodDecorations] Registering providers for', blocks.length, 'blocks');

    // Clean up previous providers
    disposablesRef.current.forEach(d => d.dispose());
    disposablesRef.current = [];

    const inlayDisposable = monaco.languages.registerInlayHintsProvider(
      languageId,
      {
        provideInlayHints: (model, range, token) => {
          // Use current refs to get latest values
          const provider = createWodInlayHintsProvider(
            blocksRef.current,
            activeBlockIdRef.current,
            cursorLineRef.current
          );
          return provider.provideInlayHints(model, range, token);
        }
      }
    );
    disposablesRef.current.push(inlayDisposable);

    // Register semantic tokens provider
    const semanticTokensProvider = createWodSemanticTokensProvider(blocksRef.current);
    const semanticDisposable = monaco.languages.registerDocumentSemanticTokensProvider(
      languageId,
      {
        getLegend: () => semanticTokensProvider.getLegend(),
        provideDocumentSemanticTokens: (model, lastResultId, token) => {
          // Use current refs to get latest values
          const provider = createWodSemanticTokensProvider(blocksRef.current);
          return provider.provideDocumentSemanticTokens(model, lastResultId, token);
        },
        releaseDocumentSemanticTokens: semanticTokensProvider.releaseDocumentSemanticTokens
      }
    );
    disposablesRef.current.push(semanticDisposable);

    console.log('[useWodDecorations] Providers registered');

    return () => {
      console.log('[useWodDecorations] Cleaning up providers');
      disposablesRef.current.forEach(d => d.dispose());
      disposablesRef.current = [];
    };
  }, [editor, monaco, enabled, languageId]);

  // Trigger refresh when blocks count or active block ID changes
  useEffect(() => {
    if (!editor || !monaco || !enabled) return;

    // Force Monaco to refresh inlay hints and semantic tokens
    const model = editor.getModel();
    if (model) {
      // Force editor to recompute decorations
      editor.getAction('editor.action.inlayHints.refresh')?.run();
      
      console.log('[useWodDecorations] Refreshed decorations');
    }
  }, [editor, monaco, blocks.length, activeBlock?.id, enabled]);
}
