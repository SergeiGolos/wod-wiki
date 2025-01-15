import React, { useEffect, useRef, useState } from 'react';
import * as monaco from 'monaco-editor';
import { MdTimerRuntime } from '../../../lib/md-timer';

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

    // 1. Register the language
    monaco.languages.register({ id: "wod-wiki-syntax" });

    // 2. Define token types and legend first
    const tokenTypes = ['rounds', 'duration', 'distance', 'resistance', 'rep', 'effort'];
    const legend = {
      tokenTypes,
      tokenModifiers: []
    };
    function getType(type: string) {
      return legend.tokenTypes.indexOf(type);
    }
    // 3. Create runtime instance
    const runtime = new MdTimerRuntime();

    // Add debug logging for provider registration
    console.log("Registering semantic tokens provider");
    // 4. Register semantic tokens provider
    monaco.languages.registerDocumentSemanticTokensProvider("wod-wiki-syntax", {
      getLegend: () => legend,
      provideDocumentSemanticTokens: (model) => {
        const code = model.getValue().trim();
        const { outcome } = runtime.read(code);
        // Flatten and sort fragments
        const fragments = outcome
          .flatMap(row => row.fragments)
          .filter(f => f.meta);

        // Track 'previous' positions for delta calculations
        let prevLine = 0;
        let prevCol = 0;
        const data: number[] = [];

        for (const fragment of fragments) {
          
          const zeroBasedLine = fragment.meta!.line - 1;
          const zeroBasedCol = fragment.meta!.columnStart-1;

          // Calculate deltas
          const deltaLine = zeroBasedLine - prevLine;
          const deltaCol = zeroBasedLine === prevLine
            ? zeroBasedCol - prevCol
            : zeroBasedCol;

          const type = getType(fragment.type);
          console.log(fragment.type, type);          
          data.push(
            deltaLine,
            deltaCol,
            fragment.meta!.length+1,
            type,
            0
          );

          prevLine = zeroBasedLine;
          prevCol = zeroBasedCol;
        }
        console.log(data);
        (model as any)._parsedOutcome = outcome;
        return {
          data: new Uint32Array(data),
          resultId: null
        };
      },
      releaseDocumentSemanticTokens: function (resultId) {},
    });

    // 5. Define theme (using the same token types)
    monaco.editor.defineTheme("wod-wiki-theme", {
      base: "vs",
      inherit: false,
      rules: [
        { token: "duration", foreground: "FFA500", fontStyle: "bold" },
        { token: "rep", foreground: "008800", fontStyle: "bold" },
        { token: "resistance", foreground: "008800", fontStyle: "bold" },
        { token: "effort", foreground: "000000" },
        { token: "rounds", foreground: "098658" },
      ],
      colors: {
        "editor.foreground": "#000000",
        "editor.background": "#FFFFFF",
        "editor.lineHighlightBackground": "#F0F0F0",
        "editorCursor.foreground": "#000000",
        "editor.selectionBackground": "#ADD6FF80",
      }
    });

    // Update editor options to enable semantic tokens
    editorRef.current = monaco.editor.create(containerRef.current, {
      value: code,
      language: 'wod-wiki-syntax',
      theme: 'wod-wiki-theme',
      automaticLayout: true,
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
      // Add these options to enable semantic tokens
      "semanticHighlighting.enabled": true,
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden',
        verticalScrollbarSize: 0,
        horizontalScrollbarSize: 0,
        alwaysConsumeMouseWheel: false
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

    // Update the inlay hints provider
    monaco.languages.registerInlayHintsProvider("wod-wiki-syntax", {
      provideInlayHints: (model, range, token): monaco.languages.ProviderResult<monaco.languages.InlayHint[]> => {
        const hints: monaco.languages.InlayHint[] = [];
        const outcome = ((model as any)._parsedOutcome || []).flatMap((row : any) => row.fragments);        
        // Get all lines in range
        for (let fragment of outcome) {
            console.log(fragment);
            // Add hint based on token type
            if (fragment.type == 'duration') {
              hints.push({
                kind: monaco.languages.InlayHintKind.Type,
                position: {
                  lineNumber: fragment.meta.line,
                  column: fragment.meta.columnStart
                },
                text: '⏱️'
              });
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
