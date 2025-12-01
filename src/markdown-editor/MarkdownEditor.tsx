/**
 * MarkdownEditor - Full-page Monaco editor with markdown support and WOD blocks
 * 
 * This component provides a Monaco-based markdown editor with:
 * - WOD block detection and visualization
 * - Rich markdown rendering via cards
 * - Heading section folding
 * - Command palette integration
 * - Theme synchronization
 */

import React, { useRef, useState, useMemo, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { editor as monacoEditor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';
import { ChevronDown, List } from 'lucide-react';

// WOD block hooks
import { useWodBlocks } from './hooks/useWodBlocks';
import { useContextOverlay } from './hooks/useContextOverlay';
import { useWodDecorations } from './hooks/useWodDecorations';
import { useParseAllBlocks } from './hooks/useParseAllBlocks';
import { useSmartIncrement } from './hooks/useSmartIncrement';
import { useMarkdownEditorSetup } from './hooks/useMarkdownEditorSetup';

// Components
import { WodBlockManager } from './components/WodBlockManager';

// Monaco loader configuration
import './utils/monacoLoader';

// Theme hook
import { useMonacoTheme } from '@/hooks/editor/useMonacoTheme';

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

  /** Line number to highlight (1-indexed) */
  highlightedLine?: number | null;

  /** Callback when Start Workout is clicked on a WOD block */
  onStartWorkout?: (block: any) => void;
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
  highlightedLine,
  onStartWorkout
}) => {
  const [content, setContent] = useState(initialContent);
  const { setIsOpen } = useCommandPalette();

  // Use the WOD blocks hook
  const { blocks, activeBlock, updateBlock } = useWodBlocks(null, content);
  
  // Keep a ref to blocks for the setup hook
  const blocksRef = useRef(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  // Use the setup hook for Monaco initialization
  const {
    editorInstance,
    monacoInstance,
    isAllFolded,
    handleEditorWillMount,
    handleEditorDidMount,
    handleToggleFoldAll,
    cleanup
  } = useMarkdownEditorSetup({
    theme,
    readonly,
    onCursorPositionChange,
    onMount,
    onStartWorkout,
    setCommandPaletteOpen: setIsOpen,
    blocksRef
  });

  // Update WOD blocks hook with editor instance once available
  const { blocks: editorBlocks, activeBlock: editorActiveBlock, updateBlock: editorUpdateBlock } = useWodBlocks(editorInstance, content);
  
  // Use editor-aware blocks when editor is available
  const currentBlocks = editorInstance ? editorBlocks : blocks;
  const currentActiveBlock = editorInstance ? editorActiveBlock : activeBlock;
  const currentUpdateBlock = editorInstance ? editorUpdateBlock : updateBlock;

  // Update blocksRef when blocks change
  useEffect(() => {
    blocksRef.current = currentBlocks;
  }, [currentBlocks]);

  // Use smart increment hook
  useSmartIncrement({ editor: editorInstance, enabled: !readonly });

  // Use shared theme hook
  useMonacoTheme(editorInstance, theme);

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

  // Parse ALL blocks for inlay hints
  useParseAllBlocks(currentBlocks, currentUpdateBlock);

  // Use context overlay for active block
  useContextOverlay(editorInstance, currentActiveBlock, showContextOverlay);

  // Notify parent of block changes
  useEffect(() => {
    if (onBlocksChange) {
      onBlocksChange(currentBlocks);
    }
  }, [currentBlocks, onBlocksChange]);

  // Notify parent of active block changes
  useEffect(() => {
    if (onActiveBlockChange) {
      onActiveBlockChange(currentActiveBlock);
    }
  }, [currentActiveBlock, onActiveBlockChange]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Use WOD decorations (inlay hints & semantic tokens & highlighting)
  useWodDecorations(editorInstance, monacoInstance, currentBlocks, currentActiveBlock, {
    enabled: true,
    languageId: 'markdown',
    highlightedLine
  });

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);

    if (onContentChange) {
      onContentChange(newContent);
    }

    if (onTitleChange) {
      const firstLine = newContent.split('\n')[0];
      onTitleChange(firstLine);
    }
  };

  // Default Monaco options
  const defaultOptions: monacoEditor.IStandaloneEditorConstructionOptions = {
    readOnly: readonly,
    minimap: { enabled: false },
    lineNumbers: 'off',
    wordWrap: 'on',
    fontSize: 14,
    lineHeight: 22,
    padding: { top: 16, bottom: 16 },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    inlayHints: { enabled: 'on' },
    folding: false,
    ...editorOptions
  };

  return (
    <div className={`markdown-editor-container ${className}`} style={{ height, width }}>
      {showToolbar && (
        <div className="markdown-toolbar border-b border-border bg-muted/50 p-2 flex items-center justify-between">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>Markdown Editor</span>
            {currentBlocks.length > 0 && (
              <span className="text-blue-600">
                ({currentBlocks.length} WOD block{currentBlocks.length !== 1 ? 's' : ''} detected)
              </span>
            )}
          </div>
          <button
            onClick={handleToggleFoldAll}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={isAllFolded ? 'Expand all sections' : 'Collapse all sections (Index View)'}
          >
            {isAllFolded ? (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Expand All</span>
              </>
            ) : (
              <>
                <List className="h-3.5 w-3.5" />
                <span>Index View</span>
              </>
            )}
          </button>
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
        blocks={currentBlocks}
        activeBlock={currentActiveBlock}
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
