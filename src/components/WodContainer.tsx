import React, { useState, useEffect, createContext } from "react";
import { WodWiki } from "./editor/WodWiki";
import { WodRunner, WodRuntimeState } from "./runtime/WodRunner";
import { RuntimeBlock } from "../lib/RuntimeBlock";
import { WodRuntimeScript } from "../lib/md-timer";
import { WodCompiler } from "../lib/timer.compiler";
import * as monaco from 'monaco-editor';
import { TimerRuntime } from "../lib/timer.runtime";

interface WodContainerProps {
  code: string;
}

export const WodContainer: React.FC<WodContainerProps> = ({
  code = "",
}) => {  
  const [blocks, setBlocks] = useState<TimerRuntime>(new TimerRuntime([]));  
  const [showEditor, setShowEditor] = useState(true);  
  
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
    if (state === WodRuntimeState.runner) {
      setShowEditor(false);      
    } else {
      setShowEditor(true);      
    }
  };  

  return (        
      <div className="bg-gray-50 border-x border-gray-200 rounded-lg">
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
  );
};
