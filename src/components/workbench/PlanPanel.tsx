import React, { useRef } from 'react';
import { MarkdownEditorBase, MarkdownEditorProps } from '../../markdown-editor/MarkdownEditor';
import { WodBlock } from '../../markdown-editor/types';
import { editor as monacoEditor } from 'monaco-editor';

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
  const editorContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={editorContainerRef} className="h-full w-full">
      <MarkdownEditorBase
        initialContent={initialContent}
        showContextOverlay={false}
        onActiveBlockChange={(block) => setActiveBlockId(block?.id || null)}
        onBlocksChange={setBlocks}
        onContentChange={setContent}
        onCursorPositionChange={setCursorLine}
        highlightedLine={highlightedLine}
        onMount={onEditorMount}
        onStartWorkout={onStartWorkout}
        height="100%"
        {...editorProps}
        theme={monacoTheme}
      />
    </div>
  );
};
