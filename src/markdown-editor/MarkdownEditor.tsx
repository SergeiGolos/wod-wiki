/**
 * MarkdownEditor - Full-page Monaco editor with markdown support and WOD blocks
 */

import React, { useRef, useState, useMemo, useEffect, useCallback } from 'react';
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
import { RichMarkdownManager } from '../editor/RichMarkdownManager';
import { HeadingSectionFoldingManager } from '../editor/features/HeadingSectionFoldingFeature';
import { ChevronDown, List } from 'lucide-react';
import { HiddenAreasCoordinator } from '../editor/utils/HiddenAreasCoordinator';

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
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const richMarkdownManagerRef = useRef<RichMarkdownManager | null>(null);
  const foldingManagerRef = useRef<HeadingSectionFoldingManager | null>(null);
  const hiddenAreasCoordinatorRef = useRef<HiddenAreasCoordinator | null>(null);
  const [editorInstance, setEditorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
  const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);
  const [content, setContent] = useState(initialContent);
  const [isAllFolded, setIsAllFolded] = useState(false);


  const { setIsOpen } = useCommandPalette();


  // Use smart increment hook
  useSmartIncrement({ editor: editorInstance, enabled: !readonly });

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
  
  // Keep a ref to blocks for callbacks
  const blocksRef = useRef(blocks);
  useEffect(() => {
    blocksRef.current = blocks;
  }, [blocks]);

  // Parse ALL blocks for inlay hints (not just active block)
  useParseAllBlocks(blocks, updateBlock);

  // Use context overlay for active block
  useContextOverlay(editorInstance, activeBlock, showContextOverlay);



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

    // Initialize Hidden Areas Coordinator
    hiddenAreasCoordinatorRef.current = new HiddenAreasCoordinator(editor, monaco);

    // Initialize Rich Markdown Manager
    richMarkdownManagerRef.current = new RichMarkdownManager(
      editor, 
      (card, action) => {
        if (action === 'start-workout' && onStartWorkout) {
          // Use the ref to get the latest blocks
          const currentBlocks = blocksRef.current;
          
          if (card.cardType === 'wod-block') {
             // We need to find the block in the blocks array that matches this card's range
             const block = currentBlocks.find(b => b.startLine + 1 === card.sourceRange.startLineNumber);
             if (block) {
               onStartWorkout(block);
             } else {
               console.warn('Could not find WOD block for card', card.id);
             }
          }
        }
      }, 
      hiddenAreasCoordinatorRef.current
    );

    // Initialize Heading Section Folding Manager (provides fold/unfold all)
    foldingManagerRef.current = new HeadingSectionFoldingManager(editor, monaco);
    foldingManagerRef.current.onFoldStateChange((folded) => {
      setIsAllFolded(folded);
    });
    console.log('[MarkdownEditor] Heading section folding manager initialized');

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

    // Focus editor only if not in readonly mode
    if (!readonly) {
      editor.focus();
    }

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      if (onCursorPositionChange) {
        onCursorPositionChange(e.position.lineNumber, e.position.column);
      }
    });

    // Click-to-fold on headings
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.CONTENT_TEXT) {
        const position = e.target.position;
        if (position) {
          const model = editor.getModel();
          const lineContent = model?.getLineContent(position.lineNumber);
          // Check if it's a heading (starts with #)
          if (lineContent?.trim().startsWith('#')) {
            // Move cursor to the line (so toggleFold works on it)
            editor.setPosition(position);
            // Toggle fold
            editor.getAction('editor.toggleFold')?.run();
          }
        }
      }
    });

    if (onMount) {
      onMount(editor, monaco);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (richMarkdownManagerRef.current) {
        richMarkdownManagerRef.current.dispose();
      }
      if (foldingManagerRef.current) {
        foldingManagerRef.current.dispose();
      }
    };
  }, []);

  // Force refresh rich markdown manager when blocks change to ensure callbacks have latest blocks
  useEffect(() => {
    // This is a bit of a hack. The callback passed to RichMarkdownManager closes over 'blocks'.
    // Since we only init RichMarkdownManager once, it sees the initial 'blocks' (empty).
    // We need a way to access the latest blocks in the callback.
    // Using a ref for blocks would solve this.
  }, [blocks]);


  // Use WOD decorations (inlay hints & semantic tokens & highlighting)
  useWodDecorations(editorInstance, monacoInstance, blocks, activeBlock, {
    enabled: true,
    languageId: 'markdown',
    highlightedLine
  });

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
    minimap: { enabled: false },
    lineNumbers: 'on',
    wordWrap: 'on',
    fontSize: 14,
    lineHeight: 22,
    padding: { top: 16, bottom: 16 },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    inlayHints: { enabled: 'on' },
    // Enable folding for heading sections and WOD blocks
    folding: true,
    foldingStrategy: 'auto',
    showFoldingControls: 'always',
    foldingHighlight: true,
    ...editorOptions
  };

  // Toggle fold all/unfold all
  const handleToggleFoldAll = useCallback(() => {
    if (foldingManagerRef.current) {
      foldingManagerRef.current.toggleFoldAll();
    }
  }, []);

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
