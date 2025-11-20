/**
 * MarkdownEditor - Full-page Monaco editor with markdown support and WOD blocks
 */

import React, { useRef, useState, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { editor as monacoEditor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';
import { useWodBlocks } from './hooks/useWodBlocks';
import { WodBlockManager } from './components/WodBlockManager';
import { useContextOverlay } from './hooks/useContextOverlay';
import { useWodDecorations } from './hooks/useWodDecorations';
import { useParseAllBlocks } from './hooks/useParseAllBlocks';
import { useSmartIncrement } from './hooks/useSmartIncrement';
// Import Monaco loader configuration to use local Monaco instead of CDN
import './utils/monacoLoader';

export interface MarkdownEditorProps {
  /** Initial markdown content */
  initialContent?: string;
  
  /** Callback when content changes */
  onContentChange?: (content: string) => void;
  
  /** Callback when title changes (first line) */
  onTitleChange?: (title: string) => void;
  
  /** Whether to show markdown toolbar */
  showToolbar?: boolean;
  
  /** Whether to show context overlay */
  showContextOverlay?: boolean;
  
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

  /** Callback when editor is mounted */
  onMount?: (editor: monacoEditor.IStandaloneCodeEditor, monaco: Monaco) => void;

  /** Callback when blocks change */
  onBlocksChange?: (blocks: any[]) => void;

  /** Callback when active block changes */
  onActiveBlockChange?: (block: any | null) => void;

  /** Callback when cursor position changes */
  onCursorPositionChange?: (lineNumber: number, column: number) => void;

  /** Enable smart increment feature (Ctrl+Up/Down on time values) */
  enableSmartIncrement?: boolean;

  /** Active source IDs (line numbers) to highlight from runtime */
  activeSourceIds?: number[];
}

import { CommandProvider, useRegisterCommand, useCommandPalette } from '../components/command-palette/CommandContext';
import { CommandPalette } from '../components/command-palette/CommandPalette';

/**
 * Main markdown editor component wrapping Monaco
 */
export const MarkdownEditorBase: React.FC<MarkdownEditorProps> = ({
  initialContent = '',
  onContentChange,
  onTitleChange,
  showToolbar = false,
  showContextOverlay = true,
  readonly = false,
  theme = 'vs',
  className = '',
  height = '100vh',
  width = '100%',
  editorOptions = {},
  onMount,
  onBlocksChange,
  onActiveBlockChange,
  onCursorPositionChange,
  enableSmartIncrement = true,
  activeSourceIds = []
}) => {
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [editorInstance, setEditorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
  const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);
  const [content, setContent] = useState(initialContent);
  
  const { setIsOpen } = useCommandPalette();

  // Log theme prop changes
  useEffect(() => {
    console.log('[MarkdownEditor] Theme prop received:', theme);
  }, [theme]);

  // Register default commands
  const saveCommand = useMemo(() => ({
    id: 'editor.save',
    label: 'Save',
    action: () => {
      console.log('Save command triggered');
      // In a real app, this would trigger a save callback or context action
    },
    shortcut: ['Meta', 'S'],
    group: 'Editor',
    context: 'editor'
  }), []);
  useRegisterCommand(saveCommand);

  const formatCommand = useMemo(() => ({
    id: 'editor.format',
    label: 'Format Document',
    action: () => {
      editorInstance?.getAction('editor.action.formatDocument')?.run();
    },
    shortcut: ['Shift', 'Alt', 'F'],
    group: 'Editor',
    context: 'editor'
  }), [editorInstance]);
  useRegisterCommand(formatCommand);

  // Use the WOD blocks hook
  const { blocks, activeBlock, updateBlock } = useWodBlocks(editorInstance, content);

  // Enable smart increment feature (after activeBlock is declared)
  useSmartIncrement({
    editor: editorInstance,
    enabled: enableSmartIncrement && activeBlock !== null // Only enable inside WOD blocks
  });
  
  // Parse ALL blocks for inlay hints (not just active block)
  useParseAllBlocks(blocks, updateBlock);
  
  // Use context overlay for active block
  useContextOverlay(editorInstance, activeBlock, showContextOverlay);
  
  // Use WOD decorations (inlay hints & semantic tokens)
  useWodDecorations(editorInstance, monacoInstance, blocks, activeBlock, {
    enabled: true,
    languageId: 'markdown',
    activeSourceIds
  });

  // Notify parent of block changes
  useEffect(() => {
    if (onBlocksChange) {
      onBlocksChange(blocks);
    }
  }, [blocks, onBlocksChange]);

  // Notify parent of active block changes
  useEffect(() => {
    if (onActiveBlockChange) {
      onActiveBlockChange(activeBlock);
    }
  }, [activeBlock, onActiveBlockChange]);

  // Track cursor position changes
  useEffect(() => {
    if (!editorInstance || !onCursorPositionChange) return;

    const disposable = editorInstance.onDidChangeCursorPosition((e) => {
      onCursorPositionChange(e.position.lineNumber, e.position.column);
    });

    return () => disposable.dispose();
  }, [editorInstance, onCursorPositionChange]);

  const handleEditorWillMount = (monaco: Monaco) => {
    // Define custom themes to match application look and feel
    console.log('[MarkdownEditor] Defining custom themes');
    monaco.editor.defineTheme('wod-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#020817', // Matches --background in dark mode
      }
    });

    monaco.editor.defineTheme('wod-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff', // Matches --background in light mode
      }
    });
    console.log('[MarkdownEditor] Custom themes defined: wod-light, wod-dark');
  };

  const handleEditorDidMount = (
    editor: monacoEditor.IStandaloneCodeEditor,
    monaco: Monaco
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorInstance(editor);
    setMonacoInstance(monaco);
    
    // Apply initial theme
    console.log('[MarkdownEditor] Initial theme application:', theme);
    monaco.editor.setTheme(theme);
    
    // Enable glyph margin for icons and inlay hints
    editor.updateOptions({ 
      glyphMargin: true,
      inlayHints: { enabled: 'on' }
    });

    // Disable default Command Palette (F1)
    editor.addCommand(monaco.KeyCode.F1, () => {
      // Do nothing or show hint
      console.log('Default Command Palette disabled. Use Ctrl+.');
    });

    // Bind Ctrl+. to open our Command Palette
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period, () => {
      setIsOpen(true);
    });

    // Bind Ctrl+Space to open Command Palette
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Space, () => {
      setIsOpen(true);
    });
    
    // Focus editor
    editor.focus();

    if (onMount) {
      onMount(editor, monaco);
    }
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

  // Update theme when prop changes
  useEffect(() => {
    if (monacoInstance && editorInstance) {
      console.log('[MarkdownEditor] Theme changing to:', theme);
      monacoInstance.editor.setTheme(theme);
      // Force editor to refresh
      editorInstance.updateOptions({});
    } else {
      console.log('[MarkdownEditor] Monaco not ready yet, theme:', theme);
    }
  }, [theme, monacoInstance, editorInstance]);

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
    inlayHints: { enabled: 'on' },
    ...editorOptions
  };

  return (
    <div className={`markdown-editor-container ${className}`} style={{ height, width }}>
      {showToolbar && (
        <div className="markdown-toolbar border-b border-border bg-muted/50 p-2">
          {/* Toolbar will be implemented in later phase */}
          <div className="text-sm text-muted-foreground">
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
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        onChange={handleEditorChange}
      />
      {/* WodBlockManager adds visual decorations */}
      <WodBlockManager
        editor={editorInstance}
        monaco={monacoInstance}
        blocks={blocks}
        activeBlock={activeBlock}
      />
    </div>
  );
};

export const MarkdownEditor: React.FC<MarkdownEditorProps> = (props) => (
  <CommandProvider>
    <MarkdownEditorBase {...props} />
    <CommandPalette />
  </CommandProvider>
);
