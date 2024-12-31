import React, { useState } from "react";
import { WodWiki } from "./editor/WodWiki";
import { WodRunner } from "./runtime/WodRunner";
import { DisplayBlock } from "../lib/timer.types";
import { WodRuntimeScript } from "../lib/md-timer";
import { WodCompiler } from "../lib/WodCompiler";
import { WodControl } from "./runtime/WodControl";
import * as monaco from 'monaco-editor';

interface WodContainerProps {
  initialCode?: string;
}

export const WodContainer: React.FC<WodContainerProps> = ({
  initialCode = "",
}) => {
  const [code, setCode] = useState(initialCode);
  const [blocks, setBlocks] = useState<DisplayBlock[]>([]);
  const [currentBlock, setCurrentBlock] = useState(-1);
  const [showEditor, setShowEditor] = useState(true);

  const handleEditorChange = (
    value: WodRuntimeScript | undefined,
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    if (value) {
      const compiledBlocks = WodCompiler.compileCode(value);
      setBlocks(compiledBlocks);
    }
  };

  const startTimer = () => {
    setShowEditor(false);
    // Find the first block with a duration
    const firstBlockIndex = blocks.findIndex(
      (block: any) => block.duration !== undefined || block.duration === 0
    );
    if (firstBlockIndex !== -1) {
      const firstBlock = blocks[firstBlockIndex];
      if (!firstBlock.timestamps) {
        firstBlock.timestamps = [];
      }
      firstBlock.round = (firstBlock.round || 0) + 1;
      firstBlock.timestamps.push({
        start: new Date(),
        stop: undefined
      });
      setCurrentBlock(firstBlockIndex);
    }
  };

  const resetTimer = () => {
    setCurrentBlock(-1);
    setShowEditor(true);
  };

  const hasBlocks = blocks.length > 0;

  return (
    <div className="space-y-4">
      {showEditor && (
        <WodWiki
          code={code}
          onValueChange={handleEditorChange}
        />
      )}
      <div className="relative">
      {showEditor && hasBlocks && (
        <WodControl onStart={startTimer} onReset={resetTimer} isRunning={false} />
      )}

      <WodRunner
        blocks={blocks}
        current={currentBlock}
        onCurrentChange={setCurrentBlock}
        showEditor={showEditor}
      />
    </div>
    </div>
  );
};
