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

    // Initialize editor
    editorRef.current = monaco.editor.create(containerRef.current, {
      value: code,
      language: 'markdown',
      theme: 'vs',
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
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden',
        verticalScrollbarSize: 0,
        horizontalScrollbarSize: 0,
        alwaysConsumeMouseWheel: false
      }
    });

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
