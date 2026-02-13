import React, { useRef, useEffect } from 'react';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { SaveState } from '../layout/WorkbenchContext';
import { MarkdownEditorBase, MarkdownEditorProps } from '../../markdown-editor/MarkdownEditor';
import { WodBlock } from '../../markdown-editor/types';
import { editor as monacoEditor } from 'monaco-editor';
import { workbenchEventBus } from '../../services/WorkbenchEventBus';

export interface PlanPanelProps extends MarkdownEditorProps {
  onEditorMount: (editor: monacoEditor.IStandaloneCodeEditor) => void;
  onStartWorkout: (block: WodBlock) => void;
  setActiveBlockId: (blockId: string | null) => void;
  setBlocks: (blocks: any[]) => void;
  setContent: (content: string) => void;
  setCursorLine: (line: number) => void;
  highlightedLine: number | null;
  monacoTheme: string;
  saveState: SaveState;
}

export const PlanPanel: React.FC<PlanPanelProps> = ({
  initialContent,
  onEditorMount,
  onStartWorkout,
  setActiveBlockId,
  setBlocks,
  setContent,
  setCursorLine,
  highlightedLine,
  monacoTheme,
  saveState,
  ...editorProps
}) => {
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);

  // Subscribe to Scroll Events
  useEffect(() => {
    const cleanup = workbenchEventBus.onScrollToBlock(() => {
      // Future: Trigger scroll locally via editorRef
    });
    return () => { cleanup(); };
  }, []);

  const handleEditorMountLocal = (editor: monacoEditor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    onEditorMount(editor);
  };

  const handleActiveBlockChange = (block: WodBlock | null) => {
    setActiveBlockId(block?.id || null);
    if (block) {
      workbenchEventBus.emitHighlightBlock(block.id, 'editor');
    }
  };

  return (
    <div className="h-full w-full relative">
      {/* Save Status Indicator */}
      <div className="absolute top-4 right-8 z-50 flex items-center gap-2 pointer-events-none transition-opacity duration-300">
        {saveState === 'changed' && (
          <div className="bg-background/80 backdrop-blur-sm border border-border rounded-full px-3 py-1 flex items-center gap-2 text-xs text-muted-foreground shadow-sm">
            <div className="h-2 w-2 rounded-full bg-yellow-500" />
            <span>Changed</span>
          </div>
        )}
        {saveState === 'saving' && (
          <div className="bg-background/80 backdrop-blur-sm border border-border rounded-full px-3 py-1 flex items-center gap-2 text-xs text-muted-foreground shadow-sm">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
        {saveState === 'saved' && (
          <div className="bg-background/80 backdrop-blur-sm border border-input rounded-full px-3 py-1 flex items-center gap-2 text-xs text-emerald-500 shadow-sm animate-in fade-in zoom-in-95 duration-300">
            <Check className="h-3 w-3" />
            <span>Saved</span>
          </div>
        )}
        {saveState === 'error' && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-full px-3 py-1 flex items-center gap-2 text-xs text-destructive shadow-sm">
            <AlertCircle className="h-3 w-3" />
            <span>Save Failed</span>
          </div>
        )}
      </div>

      <MarkdownEditorBase
        initialContent={initialContent}
        showContextOverlay={false}
        onActiveBlockChange={handleActiveBlockChange}
        onBlocksChange={setBlocks}
        onContentChange={setContent}
        onCursorPositionChange={setCursorLine}
        highlightedLine={highlightedLine}
        onMount={handleEditorMountLocal}
        onStartWorkout={onStartWorkout}
        height="100%"
        {...editorProps}
        theme={monacoTheme}
      />
    </div>
  );
};
