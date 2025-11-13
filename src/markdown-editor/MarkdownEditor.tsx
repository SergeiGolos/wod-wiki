/**
 * MarkdownEditor - Full-page Monaco editor with markdown support and WOD blocks
 */

import React, { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { editor as monacoEditor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';
import { useWodBlocks } from './hooks/useWodBlocks';
import { WodBlockManager } from './components/WodBlockManager';

export interface MarkdownEditorProps {
  /** Initial markdown content */
  initialContent?: string;
  
  /** Callback when content changes */
  onContentChange?: (content: string) => void;
  
  /** Callback when title changes (first line) */
  onTitleChange?: (title: string) => void;
  
  /** Whether to show markdown toolbar */
  showToolbar?: boolean;
  
  /** Whether editor is read-only */
  readonly?: boolean;
  
  /** Custom theme name */
  theme?: string;
  
  /** Custom CSS class */
  className?: string;
  
  /** Height of editor (default: 100vh) */
  height?: string | number;
  
  /** Width of editor (default: 100%) */
  width?: string | number;
  
  /** Optional Monaco options override */
  editorOptions?: monacoEditor.IStandaloneEditorConstructionOptions;
}

/**
 * Main markdown editor component wrapping Monaco
 */
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  initialContent = '',
  onContentChange,
  onTitleChange,
  showToolbar = false,
  readonly = false,
  theme = 'vs',
  className = '',
  height = '100vh',
  width = '100%',
  editorOptions = {}
}) => {
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [content, setContent] = useState(initialContent);

  // Use the WOD blocks hook
  const { blocks, activeBlock } = useWodBlocks(editorRef.current, content);

  const handleEditorDidMount = (
    editor: monacoEditor.IStandaloneCodeEditor,
    monaco: Monaco
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Enable glyph margin for icons
    editor.updateOptions({ glyphMargin: true });
    
    // Focus editor
    editor.focus();
  };

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    
    // Notify content change
    if (onContentChange) {
      onContentChange(newContent);
    }
    
    // Extract and notify title change (first line)
    if (onTitleChange) {
      const firstLine = newContent.split('\n')[0];
      onTitleChange(firstLine);
    }
  };

  // Default Monaco options
  const defaultOptions: monacoEditor.IStandaloneEditorConstructionOptions = {
    readOnly: readonly,
    minimap: { enabled: true },
    lineNumbers: 'on',
    wordWrap: 'on',
    fontSize: 14,
    lineHeight: 22,
    padding: { top: 16, bottom: 16 },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    ...editorOptions
  };

  return (
    <div className={`markdown-editor-container ${className}`} style={{ height, width }}>
      {showToolbar && (
        <div className="markdown-toolbar border-b border-gray-300 bg-gray-50 p-2">
          {/* Toolbar will be implemented in later phase */}
          <div className="text-sm text-gray-500">
            Markdown Editor
            {blocks.length > 0 && (
              <span className="ml-2 text-blue-600">
                ({blocks.length} WOD block{blocks.length !== 1 ? 's' : ''} detected)
              </span>
            )}
          </div>
        </div>
      )}
      <Editor
        height={showToolbar ? 'calc(100% - 48px)' : '100%'}
        defaultLanguage="markdown"
        defaultValue={initialContent}
        theme={theme}
        options={defaultOptions}
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
      />
      {/* WodBlockManager adds visual decorations */}
      <WodBlockManager
        editor={editorRef.current}
        monaco={monacoRef.current}
        blocks={blocks}
        activeBlock={activeBlock}
      />
    </div>
  );
};
