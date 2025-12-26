/**
 * Hook for managing WOD block Monaco decorations (inlay hints & semantic tokens)
 */

import { useEffect, useRef } from 'react';
import { editor as monacoEditor, IDisposable, Emitter } from 'monaco-editor';
import { Monaco } from '@monaco-editor/react';
import { WodBlock } from '../types';
import { createWodInlayHintsProvider } from '../utils/wodInlayHintsProvider';
import { createWodSemanticTokensProvider } from '../utils/wodSemanticTokensProvider';

export interface UseWodDecorationsOptions {
  /** Whether decorations are enabled */
  enabled?: boolean;
  
  /** Language ID for Monaco (default: 'markdown') */
  languageId?: string;

  /** Line number to highlight (1-indexed) */
  highlightedLine?: number | null;
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
  const inlayHintsEmitterRef = useRef<Emitter<void> | null>(null);

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
      
      // Fire the emitter to notify Monaco that hints need updating
      if (oldLine !== newLine && inlayHintsEmitterRef.current) {
        inlayHintsEmitterRef.current.fire();
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

  // Fire emitter when blocks change (not just cursor movement)
  useEffect(() => {
    if (!editor || !enabled || !inlayHintsEmitterRef.current) return;
    
    inlayHintsEmitterRef.current.fire();
  }, [editor, enabled, blocks.length, activeBlock?.id]);

  // Register providers
  useEffect(() => {
    if (!editor || !monaco || !enabled) return;

    // Clean up previous providers and emitter
    disposablesRef.current.forEach(d => d.dispose());
    disposablesRef.current = [];
    
    if (inlayHintsEmitterRef.current) {
      inlayHintsEmitterRef.current.dispose();
    }

    // Create new emitter for this provider instance
    const emitter = new monaco.Emitter<void>();
    inlayHintsEmitterRef.current = emitter;
    disposablesRef.current.push(emitter);

    const inlayDisposable = monaco.languages.registerInlayHintsProvider(
      languageId,
      {
        onDidChangeInlayHints: emitter.event,
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

    return () => {
      disposablesRef.current.forEach(d => d.dispose());
      disposablesRef.current = [];
    };
  }, [editor, monaco, enabled, languageId]);

  // Handle runtime line highlighting
  useEffect(() => {
    if (!editor || !monaco || !enabled) return;
    
    const highlightedLine = options.highlightedLine;
    
    if (highlightedLine) {
      // Add decoration for highlighted line
      const decorations = editor.deltaDecorations([], [
        {
          range: new monaco.Range(highlightedLine, 1, highlightedLine, 1),
          options: {
            isWholeLine: true,
            className: 'runtime-active-line-highlight',
            glyphMarginClassName: 'runtime-active-line-glyph'
          }
        }
      ]);
      
      // Reveal the line
      editor.revealLineInCenter(highlightedLine);
      
      return () => {
        editor.deltaDecorations(decorations, []);
      };
    }
  }, [editor, monaco, enabled, options.highlightedLine]);

}
