import React, { useState, useEffect, createContext } from "react";
import { WodWiki } from "./editor/WodWiki";
import { WodRunner } from "./runtime/WodRunner";
import { DisplayBlock } from "../lib/timer.types";
import { WodRuntimeScript } from "../lib/md-timer";
import { WodCompiler } from "../lib/WodCompiler";
import * as monaco from 'monaco-editor';

interface WodContainerProps {
  code: string;
}

export const TimerContext = createContext<Date>(new Date());

export const WodContainer: React.FC<WodContainerProps> = ({
  code = "",
}) => {  
  const [blocks, setBlocks] = useState<DisplayBlock[]>([]);  
  const [showEditor, setShowEditor] = useState(true);  
  const [time, setTime] = useState(new Date());
  useEffect(() => {    
    const intervalId = setInterval(() => {
      setTime(new Date());
    }, 100);

    return () => clearInterval(intervalId);
  }, []);
  
  const handleEditorCompile = (
    value: WodRuntimeScript | undefined,
    editor: monaco.editor.IStandaloneCodeEditor
  ) => {
    if (value) {
      const compiledBlocks = WodCompiler.compileCode(value);
      // TODO COMPILE eerors can feed back to the editor.
      setBlocks(compiledBlocks);      
    }
  };
  
  const stateChangeHandler = (state: any) => {
    if (state === "running") {
      setShowEditor(false);      
    } else {
      setShowEditor(true);      
    }
  };  

  return (    
    <TimerContext.Provider value={ time }>
      <div className="space-y-2">
        {showEditor && (
          <WodWiki
            code={code}
            onValueChange={handleEditorCompile}
          />
        )}      
        <WodRunner
          blocks={blocks}    
          onStateChange={stateChangeHandler}
        />    
      </div>
    </TimerContext.Provider>
  );
};
