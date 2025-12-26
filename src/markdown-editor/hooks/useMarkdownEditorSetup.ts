/**
 * useMarkdownEditorSetup - Hook to handle Monaco editor initialization for MarkdownEditor
 * 
 * Extracts the setup logic from MarkdownEditor.tsx including:
 * - Theme definitions
 * - Manager initialization (RichMarkdownManager, HeadingSectionFoldingManager, HiddenAreasCoordinator)
 * - Command binding
 * - Cursor tracking
 */

import { useRef, useCallback, useState, MutableRefObject } from 'react';
import { editor as monacoEditor } from 'monaco-editor';
import type { Monaco } from '@monaco-editor/react';
import { RichMarkdownManager } from '../../editor/RichMarkdownManager';
import { HeadingSectionFoldingManager } from '../../editor/features/HeadingSectionFoldingFeature';
import { HiddenAreasCoordinator } from '../../editor/utils/HiddenAreasCoordinator';
import { workoutEventBus } from '../../services/WorkoutEventBus';
import type { WodBlock } from '../types';

/**
 * Define custom Monaco themes that match the application look and feel
 */
export const defineCustomThemes = (monaco: Monaco): void => {
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
};

export interface UseMarkdownEditorSetupOptions {
  /** Initial theme name */
  theme: string;
  /** Whether editor is read-only */
  readonly: boolean;
  /** Callback when cursor position changes */
  onCursorPositionChange?: (lineNumber: number, column: number) => void;
  /** Callback when editor is mounted */
  onMount?: (editor: monacoEditor.IStandaloneCodeEditor, monaco: Monaco) => void;
  /** Callback when Start Workout is clicked */
  onStartWorkout?: (block: WodBlock) => void;
  /** Function to open command palette */
  setCommandPaletteOpen: (open: boolean) => void;
  /** Reference to current blocks */
  blocksRef: MutableRefObject<WodBlock[]>;
}

export interface UseMarkdownEditorSetupResult {
  /** Reference to the Monaco editor instance */
  editorRef: MutableRefObject<monacoEditor.IStandaloneCodeEditor | null>;
  /** Reference to Monaco */
  monacoRef: MutableRefObject<Monaco | null>;
  /** Editor instance state for hooks that need it */
  editorInstance: monacoEditor.IStandaloneCodeEditor | null;
  /** Monaco instance state for hooks that need it */
  monacoInstance: Monaco | null;
  /** Reference to RichMarkdownManager */
  richMarkdownManagerRef: MutableRefObject<RichMarkdownManager | null>;
  /** Reference to HeadingSectionFoldingManager */
  foldingManagerRef: MutableRefObject<HeadingSectionFoldingManager | null>;
  /** Reference to HiddenAreasCoordinator */
  hiddenAreasCoordinatorRef: MutableRefObject<HiddenAreasCoordinator | null>;
  /** Whether all sections are folded */
  isAllFolded: boolean;
  /** Handler for editor "beforeMount" event */
  handleEditorWillMount: (monaco: Monaco) => void;
  /** Handler for editor "onMount" event */
  handleEditorDidMount: (editor: monacoEditor.IStandaloneCodeEditor, monaco: Monaco) => void;
  /** Handler to toggle fold all/unfold all */
  handleToggleFoldAll: () => void;
  /** Cleanup function to call on unmount */
  cleanup: () => void;
}

/**
 * Hook to encapsulate Monaco editor setup logic for MarkdownEditor
 */
export const useMarkdownEditorSetup = (
  options: UseMarkdownEditorSetupOptions
): UseMarkdownEditorSetupResult => {
  const {
    theme,
    readonly,
    onCursorPositionChange,
    onMount,
    onStartWorkout,
    setCommandPaletteOpen,
    blocksRef
  } = options;

  // Refs for editor and managers
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const richMarkdownManagerRef = useRef<RichMarkdownManager | null>(null);
  const foldingManagerRef = useRef<HeadingSectionFoldingManager | null>(null);
  const hiddenAreasCoordinatorRef = useRef<HiddenAreasCoordinator | null>(null);

  // State for hooks that need reactivity
  const [editorInstance, setEditorInstance] = useState<monacoEditor.IStandaloneCodeEditor | null>(null);
  const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null);
  const [isAllFolded, setIsAllFolded] = useState(false);

  // Keep refs to callbacks for use in mount handler
  const onStartWorkoutRef = useRef(onStartWorkout);
  onStartWorkoutRef.current = onStartWorkout;

  /**
   * Handle card actions from RichMarkdownManager
   */
  const handleCardAction = useCallback((card: any, action: string) => {
    if (action !== 'start-workout' || card.cardType !== 'wod-block') {
      return;
    }

    const currentBlocks = blocksRef.current;

    // Find the block that matches this card's range
    let block = currentBlocks.find(b => b.startLine + 1 === card.sourceRange.startLineNumber);

    if (!block) {
      // Fallback: try to find by fuzzy line match
      block = currentBlocks.find(b => Math.abs((b.startLine + 1) - card.sourceRange.startLineNumber) <= 1);
    }

    if (block) {
      // Emit via event bus (primary mechanism)
      workoutEventBus.emit({ type: 'start-workout', block });
      // Also call callback for backward compatibility
      if (onStartWorkoutRef.current) {
        onStartWorkoutRef.current(block);
      }
    }
  }, [blocksRef]);

  /**
   * Handler for Monaco "beforeMount" event - defines themes
   */
  const handleEditorWillMount = useCallback((monaco: Monaco) => {
    defineCustomThemes(monaco);
  }, []);

  /**
   * Handler for Monaco "onMount" event - initializes managers and bindings
   */
  const handleEditorDidMount = useCallback((
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
      handleCardAction,
      hiddenAreasCoordinatorRef.current
    );

    // Initialize Heading Section Folding Manager
    foldingManagerRef.current = new HeadingSectionFoldingManager(editor, monaco);
    foldingManagerRef.current.onFoldStateChange((folded) => {
      setIsAllFolded(folded);
    });

    // Apply initial theme
    monaco.editor.setTheme(theme);

    // Enable glyph margin for icons and inlay hints
    editor.updateOptions({
      glyphMargin: true,
      inlayHints: { enabled: 'on' }
    });

    // Disable default Command Palette (F1)
    editor.addCommand(monaco.KeyCode.F1, () => {
      // F1 disabled, use Ctrl+.
    });

    // Bind Ctrl+. to open our Command Palette
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Period, () => {
      setCommandPaletteOpen(true);
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
            editor.setPosition(position);
            editor.getAction('editor.toggleFold')?.run();
          }
        }
      }
    });

    // Call external onMount callback
    if (onMount) {
      onMount(editor, monaco);
    }
  }, [theme, readonly, onCursorPositionChange, onMount, handleCardAction, setCommandPaletteOpen]);

  /**
   * Toggle fold all/unfold all
   */
  const handleToggleFoldAll = useCallback(() => {
    if (foldingManagerRef.current) {
      foldingManagerRef.current.toggleFoldAll();
    }
  }, []);

  /**
   * Cleanup function to dispose managers
   */
  const cleanup = useCallback(() => {
    if (richMarkdownManagerRef.current) {
      richMarkdownManagerRef.current.dispose();
      richMarkdownManagerRef.current = null;
    }
    if (foldingManagerRef.current) {
      foldingManagerRef.current.dispose();
      foldingManagerRef.current = null;
    }
  }, []);

  return {
    editorRef,
    monacoRef,
    editorInstance,
    monacoInstance,
    richMarkdownManagerRef,
    foldingManagerRef,
    hiddenAreasCoordinatorRef,
    isAllFolded,
    handleEditorWillMount,
    handleEditorDidMount,
    handleToggleFoldAll,
    cleanup
  };
};
