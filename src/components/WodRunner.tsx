import React, { useState, useRef, useEffect } from "react";
import { WodWiki } from "./WodWiki";
import { WodRuntime } from "./WodRows";
import { WodControl } from "./WodControl";
import type { editor } from "monaco-editor";
import { DisplayBlock, StatementBlock } from "../lib/timer.types";
import { WodRuntimeScript } from "../lib/md-timer";
import { v4 as uuidv4 } from "uuid";

interface WodRunnerProps {
  code?: string;
  current?: number;
  onCurrentChange?: (current: number) => void;
}

export const WodRunner: React.FC<WodRunnerProps> = ({
  code = "",
  current = -1,
  onCurrentChange,
}) => {
  const [outcome, setOutcome] = useState<DisplayBlock[]>([]);
  const [runnerIndex, setRunnerIndex] = useState(current);
  const [isRunning, setIsRunning] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Sync runnerIndex with current prop when it changes
  useEffect(() => {
    setRunnerIndex(current);
  }, [current]);

  useEffect(() => {
    if (showEditor && editorRef.current) {
      setTimeout(() => {
        editorRef.current?.focus();
      }, 100);
    }
  }, [showEditor]);

  const handleValueChange = (
    value: WodRuntimeScript | undefined,
    editor: editor.IStandaloneCodeEditor
  ) => {
    if (editor && !editorRef.current) {
      editorRef.current = editor;
      // Focus editor on initial mount
      editor.focus();
    }

    if (value?.outcome) {
      // If we get an empty outcome array, show empty state
      if (value.outcome.length === 0) {
        setOutcome([]);
        return;
      }      

      // Only update if we're getting real parsed data, not just the compiling status
      // TODO: this needs to be redone later.
      if (
        !(
          value.outcome.length >0 && value.outcome[0].type === "notification"
        )
      ) {
        const script = value.outcome.map((block: StatementBlock) : DisplayBlock => {
          return {
            id: uuidv4(),
            block : block,
            depth : 0,
            parent : undefined,
            index : 0,
            timestamps : []
          };
        });

        setOutcome(script);
      }
    }
  };

  const startTimer = () => {
    setIsRunning(true);
    setShowEditor(false);

    // Find the first block with a duration
    const firstBlockIndex = outcome.findIndex(
      (block: any) => block.duration !== undefined
    );
    if (firstBlockIndex !== -1) {
      setRunnerIndex(firstBlockIndex);
      onCurrentChange?.(firstBlockIndex);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setShowEditor(true);
    // Reset both indices to 0
    setRunnerIndex(-1);
    onCurrentChange?.(0);
  };

  const hasBlocks = outcome.length > 0;

  return (
    <div className="relative">
      <div className="flex flex-col gap-4 p-4">
        {showEditor && (
          <WodWiki
            code={code}
            current={current}
            onValueChange={handleValueChange}
          />
        )}
        <WodRuntime data={outcome} current={runnerIndex} />
      </div>
      <WodControl
        isRunning={isRunning}
        hasBlocks={hasBlocks}
        onStart={startTimer}
        onReset={resetTimer}
      />
    </div>
  );
};
