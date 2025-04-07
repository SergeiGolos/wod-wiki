"use client";
import React from "react";
import { WodWiki } from "../editor/WodWiki";
import { useTimerRuntime } from "../hooks/useTimerRuntime";
import { ResultSpan, WodRuntimeScript } from "@/core/timer.types";
import { WodTimer } from "../clock/WodTimer";
import { ButtonRibbon } from "../buttons/ButtonRibbon";
import { ResultsDisplay } from "../analyrics/ResultsDisplay";
import { cn } from "@/core/utils";


interface EditorContainerProps {
  id: string;
  code: string;
  className?: string;
  /**
   * Optional callback when script is compiled
   */
  onScriptCompiled?: (script: WodRuntimeScript) => void;
  /**
   * Optional callback when results are updated
   */
  onResultsUpdated?: (results: ResultSpan[]) => void;
}

export const EditorContainer: React.FC<EditorContainerProps> = ({
  id,
  code = "",
  className = "",
  onScriptCompiled,
  onResultsUpdated,
}) => {
  const {
    loadScript,
    runtimeRef,
    buttons,
    display,
    results, 
    setStack   
  } = useTimerRuntime({
    onScriptCompiled,
    onResultsUpdated,
  });

  return (
    <div className={cn(`border border-gray-200 rounded-lg divide-y ${className}`, className)}>
      <div className="timer-controls p-4">
        <ButtonRibbon buttons={buttons} setEvents={setStack} />              
      </div>      
      {display && <WodTimer display={display} />}
      <WodWiki id={id} code={code} onValueChange={loadScript} />      
      <ResultsDisplay runtime={runtimeRef} results={results} />
    </div>
  );
};
