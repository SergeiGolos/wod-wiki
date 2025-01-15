import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { MdTimerRuntime } from '../../../lib/md-timer';
import { allTokens } from '@/lib/timer.tokens';
import { TokenType } from 'chevrotain';

interface WodWikiProps {
  /** Initial code content */
  code?: string;
  /** Optional value change handler */
  onValueChange?: (value: any, editor: monaco.editor.IStandaloneCodeEditor) => void;
  /** Optional cursor position handler */
  onCursorMoved?: (position: monaco.Position) => void;
}

export const WodWiki: React.FC<WodWikiProps> = ({
  code = "",
  onValueChange,
  onCursorMoved,
}) => {
  const lineHeight = 21; // pixels per line
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const interpreterRef = useRef(new MdTimerRuntime());

  // Debounce function
  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  // Parse the content and notify through onValueChange
  const parseContent = (content: string) => {
    if (!editorRef.current) return;
    const model = interpreterRef.current.read(content);
    onValueChange?.(model, editorRef.current);
  };

  // Debounced version of parseContent
  const debouncedParse = debounce(parseContent, 600);

  const [editorHeight, setEditorHeight] = useState(lineHeight * 3);
  useEffect(() => {
    if (!containerRef.current) return;

    monaco.languages.register({ id: "wod-wiki-syntax" });

    const wodTokens = allTokens.map((token:  TokenType) => { return [ token.PATTERN as RegExp,  token.name.toLowerCase() ] }) as [RegExp, string][];
    // Register a tokens provider for the language
    console.log(wodTokens);
    monaco.languages.setMonarchTokensProvider("wod-wiki-syntax", {
      tokenizer: {
        root: wodTokens
      }
    });

    // Define theme with explicit rules for each token type
    monaco.editor.defineTheme("wod-wiki-theme", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "timer", foreground: "FFA500", fontStyle: "bold" },
        { token: "distance", foreground: "008800", fontStyle: "bold" },
        { token: "weight", foreground: "008800", fontStyle: "bold" },
        { token: "identifier", foreground: "000000" },
        { token: "number", foreground: "098658" },
        { token: "symbol", foreground: "666666" },
        { token: "operator", foreground: "666666" },
        { token: "parenthesis", foreground: "666666" },
        { token: "trend", foreground: "FF0000" },
        { token: "at", foreground: "0000FF" },
      ],
      colors: {
        "editor.foreground": "#000000",
        "editor.background": "#FFFFFF",
        "editor.lineHighlightBackground": "#F0F0F0",
        "editorCursor.foreground": "#000000",
        "editor.selectionBackground": "#ADD6FF80",
      }
    });


    // Register a completion item provider for the new language
    monaco.languages.registerCompletionItemProvider("wod-wiki-syntax", {
      provideCompletionItems: (model, position) => {
        var word = model.getWordUntilPosition(position);
        var range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        var suggestions = [
          {
            label: "EMOM",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "(${1:rounds}) 1:00",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule
                .InsertAsSnippet,
            range: range,
          },          
        ];
        return { suggestions: suggestions };
      },
    });

    // Initialize editor
    editorRef.current = monaco.editor.create(containerRef.current, {
      value: code,
      language: 'wod-wiki-syntax',
      theme: 'wod-wiki-theme',
      automaticLayout: true,
      minimap: {
        enabled: false
      },
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: lineHeight,
      padding: {
        top: 12,
        bottom: 12
      },
      inlayHints: { enabled: true },
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden',
        verticalScrollbarSize: 0,
        horizontalScrollbarSize: 0,
        alwaysConsumeMouseWheel: false
      }
    });

    // Update the inlay hints provider
    monaco.languages.registerInlayHintsProvider("wod-wiki-syntax", {
      provideInlayHints: (model, range, token): monaco.languages.ProviderResult<monaco.languages.InlayHint[]> => {
        const hints: monaco.languages.InlayHint[] = [];
        
        // Get all lines in range
        for (let lineNumber = range.startLineNumber; lineNumber <= range.endLineNumber; lineNumber++) {
          // Get line tokens
          const lineTokens = model.getLineTokens(lineNumber);
          console.log(model)
          if (!lineTokens) continue;

          // Iterate through tokens in the line
          for (let i = 0; i < lineTokens.getCount(); i++) {
            const token = lineTokens.getClassName(i);
            const tokenStartOffset = lineTokens.getStartOffset(i);
            const tokenEndOffset = lineTokens.getEndOffset(i);
            
            // Add hint based on token type
            if (token.includes('timer')) {
              hints.push({
                kind: monaco.languages.InlayHintKind.Type,
                position: { 
                  lineNumber: lineNumber,
                  column: tokenEndOffset + 1
                },
                text: '⏱️'
              });
            }
            else if (token.includes('weight')) {
              hints.push({
                kind: monaco.languages.InlayHintKind.Parameter,
                position: { 
                  lineNumber: lineNumber,
                  column: tokenEndOffset + 1
                },
                text: '⚖️'
              });
            }
            else if (token.includes('distance')) {
              hints.push({
                kind: monaco.languages.InlayHintKind.Parameter,
                position: { 
                  lineNumber: lineNumber,
                  column: tokenEndOffset + 1
                },
                text: '📏'
              });
            }
          }
        }

        return hints;
      }
    });

    // Add this after editor initialization
  
    if (editorRef.current) {
      const model = editorRef.current.getModel();
      if (model) {
        // Update height when content changes
        model.onDidChangeContent(() => {
          const lineCount = model.getLineCount() + 1;
          setEditorHeight(lineCount * lineHeight + 5);
        });
      }
    }

    // Subscribe to content change events
    const contentChangeDisposable = editorRef.current.onDidChangeModelContent(() => {
      if (!editorRef.current) return;
      debouncedParse(editorRef.current.getValue().trimEnd());
    });

    // Subscribe to cursor position change events
    const cursorChangeDisposable = editorRef.current.onDidChangeCursorPosition((event) => {
      onCursorMoved?.(event.position);
    });

    // Parse initial content
    if (code) {
      parseContent(code);
    }
    const lineCount = code.split('\n').length + 1;
    setEditorHeight(lineCount * lineHeight + 5) 

    // Cleanup function
    return () => {
      contentChangeDisposable.dispose();
      cursorChangeDisposable.dispose();
      if (editorRef.current) {
        editorRef.current?.dispose();
        editorRef.current = null;
      }
    };
  }, []); // Empty dependency array since we only want to initialize once

  // Update editor content when code prop changes
  useEffect(() => {
    if (editorRef.current && code !== editorRef.current.getValue()) {
      editorRef.current.setValue(code);
    }
  }, [code]);

  return (
    <div 
      ref={containerRef} 
      className="w-full border border-gray-200 rounded-lg overflow-hidden"
      style={{ height: `${editorHeight}px` }}
    />
  );
};
