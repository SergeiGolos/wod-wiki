import React, { useState, useCallback, useEffect, useRef } from 'react';
import { EditorView } from '@codemirror/view';

// WOD block hooks
import { useParseAllBlocks } from './hooks/useParseAllBlocks';
import { findBlockAtLine } from './utils/blockDetection';

// Components
import { CodeMirrorEditor } from '../components/Editor/CodeMirrorEditor';

// Theme hook
import { useEditorTheme } from '@/hooks/editor/useEditorTheme';

// Phase 3: State Management
import { useWorkoutStore } from '../components/layout/WorkoutStore';
import { useEditorStateSync } from '../editor/useEditorState';

import { CommandProvider, useCommandPalette } from '../components/command-palette/CommandContext';
import { CommandPalette } from '../components/command-palette/CommandPalette';

export interface MarkdownEditorProps {
  /** Initial markdown content */
  initialContent?: string;

  /** Controlled markdown content */
  value?: string;

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

/**
 * Main markdown editor component wrapping CodeMirror
 */
export const MarkdownEditorBase: React.FC<MarkdownEditorProps> = ({
  initialContent = '',
  value,
  onContentChange,
  onTitleChange,
  showToolbar = false,
  readonly = false,
  theme = 'vs',
  className = '',
  height = '100vh',
  width = '100%',
  onBlocksChange,
  onActiveBlockChange,
  onCursorPositionChange,
  onStartWorkout
}) => {
  const [content, setContent] = useState(value !== undefined ? value : initialContent);
  const { theme: activeTheme } = useEditorTheme(theme);
  const [editorView, setEditorView] = useState<EditorView | null>(null);

  const { blocks, setBlocks, updateBlock, activeBlockId, setActiveBlockId } = useWorkoutStore();

  // Sync value prop to local state
  useEffect(() => {
    if (value !== undefined) {
      setContent(value);
    }
  }, [value]);

  // Phase 3: Sync Zustand store with CodeMirror EditorState
  useEditorStateSync(editorView);

  const handleBlocksChange = useCallback((newBlocks: any[]) => {
    setBlocks(newBlocks);
    if (onBlocksChange) onBlocksChange(newBlocks);
  }, [onBlocksChange, setBlocks]);

  const handleCursorPositionChange = useCallback((line: number, col: number) => {
    if (onCursorPositionChange) onCursorPositionChange(line, col);
    
    // Find active block based on cursor
    const block = findBlockAtLine(blocks, line - 1);
    setActiveBlockId(block?.id || null);
  }, [blocks, onCursorPositionChange, setActiveBlockId]);

  // Parse ALL blocks for inlay hints
  useParseAllBlocks(blocks, updateBlock);

  // Notify parent of active block changes
  useEffect(() => {
    const activeBlock = blocks.find(b => b.id === activeBlockId) || null;
    if (onActiveBlockChange) {
      onActiveBlockChange(activeBlock);
    }
  }, [activeBlockId, blocks, onActiveBlockChange]);

  const handleEditorChange = (newContent: string) => {
    setContent(newContent);
    if (onContentChange) onContentChange(newContent);
    if (onTitleChange) {
      const firstLine = newContent.split('\n')[0];
      onTitleChange(firstLine);
    }
  };

  return (
    <div className={`markdown-editor-container ${className}`} style={{ height, width }}>
      {showToolbar && (
        <div className="markdown-toolbar border-b border-border bg-muted/50 p-2 flex items-center justify-between">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <span>Markdown Editor</span>
            {blocks.length > 0 && (
              <span className="text-blue-600">
                ({blocks.length} WOD block{blocks.length !== 1 ? 's' : ''} detected)
              </span>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-hidden" style={{ height: showToolbar ? 'calc(100% - 48px)' : '100%' }}>
        <CodeMirrorEditor
          value={content}
          theme={activeTheme}
          readonly={readonly}
          onChange={handleEditorChange}
          onCursorPositionChange={handleCursorPositionChange}
          onBlocksChange={handleBlocksChange}
          onStartWorkout={onStartWorkout}
          onViewCreated={setEditorView}
        />
      </div>
    </div>
  );
};

export const MarkdownEditor: React.FC<MarkdownEditorProps> = (props) => (
  <CommandProvider>
    <MarkdownEditorBase {...props} />
    <CommandPalette />
  </CommandProvider>
);
