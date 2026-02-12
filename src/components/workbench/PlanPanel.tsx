import React, { useRef, useEffect } from 'react';
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
    <div className="h-full w-full">
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
