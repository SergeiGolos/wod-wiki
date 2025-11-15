/**
 * Hook for managing WOD block Monaco decorations
 * Uses Decorations API for instant, synchronous updates
 */

import { useEffect, useRef } from 'react';
import { editor as monacoEditor, IDisposable } from 'monaco-editor';
import { Monaco } from '@monaco-editor/react';
import { WodBlock } from '../types';
import { WodDecorationsManager } from '../utils/wodInlayHintsProvider';
import { createWodSemanticTokensProvider } from '../utils/wodSemanticTokensProvider';

export interface UseWodDecorationsOptions {
  /** Whether decorations are enabled */
  enabled?: boolean;
  
  /** Language ID for Monaco (default: 'markdown') */
  languageId?: string;
}

/**
 * Hook to register Monaco decorations for WOD blocks
 * Provides inline emoji decorations and semantic token highlighting
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

  const decorationsManagerRef = useRef<WodDecorationsManager | null>(null);
  const semanticDisposableRef = useRef<IDisposable | null>(null);
  const cursorDisposableRef = useRef<IDisposable | null>(null);
  const blocksRef = useRef<WodBlock[]>([]);

  // Keep blocks ref updated
  blocksRef.current = blocks;

  // Create decorations manager once when editor is ready
  useEffect(() => {
    if (!editor || !enabled) {
      // Clean up existing manager
      if (decorationsManagerRef.current) {
        decorationsManagerRef.current.dispose();
        decorationsManagerRef.current = null;
      }
      return;
    }

    // Create manager
    console.log('[useWodDecorations] Creating WodDecorationsManager');
    decorationsManagerRef.current = new WodDecorationsManager(editor);

    // Initial update with no cursor
    decorationsManagerRef.current.updateDecorations(blocksRef.current, null);

    return () => {
      if (decorationsManagerRef.current) {
        console.log('[useWodDecorations] Disposing WodDecorationsManager');
        decorationsManagerRef.current.dispose();
        decorationsManagerRef.current = null;
      }
    };
  }, [editor, enabled]);

  // Track cursor position and update decorations synchronously
  useEffect(() => {
    if (!editor || !enabled || !decorationsManagerRef.current) return;

    const updateDecorations = () => {
      const position = editor.getPosition();
      const cursorLine = position?.lineNumber || null;
      
      // Synchronous update - instant response
      decorationsManagerRef.current?.updateDecorations(blocksRef.current, cursorLine);
    };

    // Initial update
    updateDecorations();

    // Listen for cursor changes - synchronous updates
    const disposable = editor.onDidChangeCursorPosition(() => {
      updateDecorations();
    });

    cursorDisposableRef.current = disposable;

    return () => {
      if (cursorDisposableRef.current) {
        cursorDisposableRef.current.dispose();
        cursorDisposableRef.current = null;
      }
    };
  }, [editor, enabled]);

  // Update decorations when blocks change
  useEffect(() => {
    if (!editor || !enabled || !decorationsManagerRef.current) return;

    const position = editor.getPosition();
    const cursorLine = position?.lineNumber || null;
    
    // Update decorations with current cursor position
    decorationsManagerRef.current.updateDecorations(blocks, cursorLine);
    
    console.log('[useWodDecorations] Updated decorations for', blocks.length, 'blocks');
  }, [editor, enabled, blocks]);

  // Register semantic tokens provider (once)
  useEffect(() => {
    if (!editor || !monaco || !enabled) {
      // Clean up existing provider
      if (semanticDisposableRef.current) {
        semanticDisposableRef.current.dispose();
        semanticDisposableRef.current = null;
      }
      return;
    }

    console.log('[useWodDecorations] Registering semantic tokens provider');

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
    
    semanticDisposableRef.current = semanticDisposable;

    console.log('[useWodDecorations] Semantic tokens provider registered');

    return () => {
      if (semanticDisposableRef.current) {
        console.log('[useWodDecorations] Cleaning up semantic tokens provider');
        semanticDisposableRef.current.dispose();
        semanticDisposableRef.current = null;
      }
    };
  }, [editor, monaco, enabled, languageId]);
}
