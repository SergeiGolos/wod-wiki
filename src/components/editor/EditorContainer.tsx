"use client";
import React from "react";
import { WodWiki } from "../editor/WodWiki";
import { useTimerRuntime } from "../hooks/useTimerRuntime";
import { WodResultBlock, WodRuntimeScript } from "@/core/timer.types";
import { WodTimer } from "../clock/WodTimer";
import { ButtonRibbon } from "../buttons/ButtonRibbon";
import { ResultsDisplay } from "../analyrics/ResultsDisplay";


interface EditorContainerProps {
  id: string;
  code: string;
  /**
   * Optional callback when script is compiled
   */
  onScriptCompiled?: (script: WodRuntimeScript) => void;
  /**
   * Optional callback when results are updated
   */
  onResultsUpdated?: (results: WodResultBlock[]) => void;
}

export const EditorContainer: React.FC<EditorContainerProps> = ({
  id,
  code = "",
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
    <div className="border border-gray-200 rounded-lg divide-y">
      <div className="timer-controls p-4">
        <ButtonRibbon buttons={buttons} setEvents={setStack} />
        {display && (
          <div className="border rounded-md p-4 bg-white shadow">
            <WodTimer display={display} />
          </div>
        )}
      </div>
      <WodWiki id={id} code={code} onValueChange={loadScript} />
      <ResultsDisplay runtime={runtimeRef} results={results} />
    </div>
  );
};
