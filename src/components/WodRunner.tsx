import React, { useState, useRef, useEffect } from 'react';
import { WodWiki } from './WodWiki';
import { WodRows } from './WodRows';
import type { editor } from 'monaco-editor';
import type { MdTimerStack } from '../lib/timer.types';

interface WodRunnerProps {
  code?: string;
  current?: number;
  onCurrentChange?: (current: number) => void;
}

export const WodRunner: React.FC<WodRunnerProps> = ({ 
  code = '',
  current = 0,
  onCurrentChange
}) => {
  const [outcome, setOutcome] = useState<any[]>([]);
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

  const handleValueChange = (value: any, editor: editor.IStandaloneCodeEditor) => {
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
      if (!(value.outcome.length === 1 && value.outcome[0].type === 'notification')) {
        setOutcome(value.outcome);
      }
    }
  };

  const startTimer = () => {
    setIsRunning(true);
    setShowEditor(false);

    // Find the first block with a duration
    const firstBlockIndex = outcome.findIndex((block: any) => block.duration !== undefined);    
    if (firstBlockIndex !== -1) {
      setRunnerIndex(firstBlockIndex);
      onCurrentChange?.(firstBlockIndex);
    }
  };

  const resetTimer = () => {
    setIsRunning(false);
    setShowEditor(true);
    // Reset both indices to 0
    setRunnerIndex(0);
    onCurrentChange?.(0);
  };

  const hasBlocks = outcome.length > 0;

  return (
    <div className="flex flex-col gap-4 p-4">
      {showEditor && (
        <WodWiki 
          code={code}
          current={current}
          onValueChange={handleValueChange}
        />
      )}
      <div className="relative">
        <WodRows 
          data={outcome}
          current={runnerIndex}
        />
        <div className="absolute top-2 right-2">
          {hasBlocks && (
            <button 
              onClick={isRunning ? resetTimer : startTimer}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isRunning 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {isRunning ? 'Rest' : 'Start'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
