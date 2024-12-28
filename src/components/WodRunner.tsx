import React, { useState, useRef, useEffect } from "react";
import { WodWiki } from "./WodWiki";
import { Block } from "./WodRows";
import { WodControl } from "./WodControl";
import type { editor } from "monaco-editor";
import { DisplayBlock, StatementBlock } from "../lib/timer.types";
import { WodRuntimeScript } from "../lib/md-timer";
import { EmptyWod } from "./EmptyWod";
import { WodTimer } from "./WodTimer";

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
  const [runnerIndex, setRunnerIndex] = useState<number>(current);
  const [showEditor, setShowEditor] = useState(true);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

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
      
      const getById = (id: number) => value?.outcome?.find((block: StatementBlock) => { 
        return block.id === id;
      });

      const script = value?.outcome?.map(
        (block: StatementBlock): DisplayBlock => {                            
          // If this block has children, its duration is 0 regardless of its own duration
          if (block.children?.length > 0) {
            return {
              id: block.id,
              block: block,
              depth: block.parents?.length || 0,
              timestamps: [],
              duration: 0
            };
          }

          // Walk up the parent chain starting with current block
          const blockChain = [block.id, ...(block?.parents || [])];
          let inheritedDuration = 0;
          
          for (const id of blockChain) {
            const currentBlock = getById(id);
            if (Math.abs(currentBlock?.duration || 0) > 0) {
              inheritedDuration = currentBlock?.duration || 0;
              break;
            }
          }

          return {
            id: block.id,
            block: block,
            depth: block.parents?.length || 0,
            timestamps: [],
            duration: inheritedDuration
          };
        }
      );

      setOutcome(script);
    }
  };

  const startTimer = () => {    
    setShowEditor(false);

    // Find the first block with a duration
    const firstBlockIndex = outcome.findIndex(
      (block: any) => block.duration !== undefined || block.duration === 0
    );
        
    outcome[firstBlockIndex].timestamps.push({
      start: new Date(),
      stop: undefined
    });
    setRunnerIndex(firstBlockIndex);
    onCurrentChange?.(firstBlockIndex);
  };

  const resetTimer = () => {
    setRunnerIndex(-1);
    setShowEditor(true);
    // Reset both indices to 0
    onCurrentChange?.(0);
  };
  
  const handleTimerEvent = (event: string, data?: any) => {    
    const now = new Date();
    var timestamps = outcome[runnerIndex].timestamps;
    switch (event) {
      case 'complete':      
        // Move to next block with duration
        // will need to be handled somewhere else.
        timestamps[timestamps.length - 1].stop = now;
        const nextBlockIndex = outcome.findIndex(
          (block, idx) => idx > runnerIndex && block.duration !== undefined
        );
        
        if (nextBlockIndex !== -1) {
          outcome[nextBlockIndex].timestamps.push({
            start: now,
            stop: undefined
          });

          setRunnerIndex(nextBlockIndex);
          onCurrentChange?.(nextBlockIndex);
        } else {
          resetTimer();
        }
        break;
      case 'stop':        
        timestamps[timestamps.length - 1].stop = now;
        break;
      case 'started':        
        timestamps.push({
          start: now,
          stop: undefined
        });
        break;
      case 'lap':
        var time = now;
        timestamps[timestamps.length - 1].stop = time;  // Handle lap timing if needed
        timestamps.push({
          start: time,
          stop: undefined
        });
        break;
    }
  };

  const hasBlocks = outcome.length > 0;

  return (
    <div className="relative">
      <div className="space-y-4">
        {showEditor && (
          <WodWiki
            code={code}            
            onValueChange={handleValueChange}
          />
        )}
        {(!outcome || outcome.length === 0) && <EmptyWod />}            
        {hasBlocks && (
          <div className="w-full overflow-hidden border border-gray-200 rounded-lg">
            <div className="min-w-full divide-y divide-gray-200">
              <div className="bg-white divide-y divide-gray-200">
                {outcome.map((block, index) =>
                  runnerIndex !== index 
                  ? <Block block={block} key={block.id} />                  
                  : <WodTimer 
                      block={block} 
                      key={block.id} 
                      timestamps={block.timestamps}
                      onTimerEvent={handleTimerEvent}
                    />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <WodControl
        isRunning={runnerIndex > -1}
        onStart={startTimer}
        onReset={resetTimer}
      />
    </div>
  );
};
